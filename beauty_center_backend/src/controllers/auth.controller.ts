// src/controllers/authController.ts
import { Request, Response } from "express";
import { Transaction } from "sequelize";
import { registerSchema, loginSchema } from "../validators/auth";
import { User } from "../models/user.model";
import { Role } from "../models/role.model";
import { RefreshToken as RefreshTokenModel } from "../models/refreshToken.model"; // model (value)
import type { RefreshToken as RefreshTokenInstance } from "../models/refreshToken.model"; // model (type)
import { hashPassword, verifyPassword } from "../utils/password";
import {
  signAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  findRefreshTokenRow,
} from "../utils/jwt";
import { setRefreshCookie, clearRefreshCookie } from "../utils/cookies";
import { logger } from "../utils/logger";
import { withTransaction } from "../utils/transaction";
import { AppError } from "../errors/AppError";

/**
 * Note:
 * - This controller expects i18next middleware to be installed so `req.t` exists.
 * - Use translation keys like: 'auth.invalid_input', 'user.email_in_use', 'user.created', etc.
 */

export const authController = {
  async register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      // Localized high-level message + field details
      return res.status(400).json({
        error: {
          message:
            req.t?.("auth.invalid_input", "Invalid input") ?? "Invalid input",
          details: flat,
        },
      });
    }

    const { email, password, firstName, lastName } = parsed.data;

    try {
      const user = await withTransaction(async (t) => {
        const existing = await User.findOne({
          where: { email },
          transaction: t,
        });
        if (existing) {
          // Throw AppError with localized message; global handler will format
          throw new AppError(
            req.t?.("user.email_in_use", "Email already in use") ??
              "Email already in use",
            409,
            "EMAIL_IN_USE",
          );
        }

        const pwHash = await hashPassword(password);
        const created = await User.create(
          {
            email,
            passwordHash: pwHash,
            firstName: firstName || null,
            lastName: lastName || null,
          } as any,
          { transaction: t },
        );

        // attach default role if exists
        const defaultRoleName = process.env.DEFAULT_ROLE || "receptionist";
        const defaultRole = await Role.findOne({
          where: { name: defaultRoleName },
          transaction: t,
        });
        if (defaultRole && (created as any).addRole) {
          await (created as any).addRole(defaultRole, { transaction: t });
        }

        return created;
      });

      return res.status(201).json({
        id: user.id,
        email: user.email,
        message:
          req.t?.("user.created", "User created successfully") ??
          "User created successfully",
      });
    } catch (err: any) {
      logger.error("Register failed", err);
      // If it's an AppError we rethrow so global handler can handle localization further
      if (err instanceof AppError) throw err;
      // Generic server error localized fallback
      return res.status(500).json({
        error: {
          message:
            req.t?.("internal.server_error", "Something went wrong") ??
            "Something went wrong",
        },
      });
    }
  },

  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("auth.invalid_input", "Invalid input") ?? "Invalid input",
          details: flat,
        },
      });
    }

    try {
      const { email, password } = parsed.data;

      const user = await User.findOne({
        where: { email },
        include: [{ model: Role, as: "roles" }],
      });

      if (!user) {
        return res.status(401).json({
          error: {
            message:
              req.t?.("auth.invalid_credentials", "Invalid credentials") ??
              "Invalid credentials",
          },
        });
      }

      const pwHash = (user as any).passwordHash as string;
      const valid = await verifyPassword(password, pwHash);
      if (!valid) {
        return res.status(401).json({
          error: {
            message:
              req.t?.("auth.invalid_credentials", "Invalid credentials") ??
              "Invalid credentials",
          },
        });
      }

      // create access token (include roles in payload)
      const roles = (user as any).roles?.map((r: any) => r.name) || [];
      const accessToken = signAccessToken({ sub: user.id, roles });

      // create & persist hashed refresh token; get raw token to set cookie
      // Use transaction-aware createRefreshToken if you want atomicity with other DB ops.
      const { rawToken, db: rtRow } = await createRefreshToken(user.id);

      // set cookie with raw token; DB contains only hash
      setRefreshCookie(res, rawToken, (rtRow as any).expiresAt);

      return res.json({ accessToken });
    } catch (err: any) {
      logger.error("Login failed", err);
      return res.status(500).json({
        error: {
          message:
            req.t?.("internal.server_error", "Something went wrong") ??
            "Something went wrong",
        },
      });
    }
  },

  /**
   * Rotate refresh token atomically:
   *  - lock and re-validate current refresh row inside a transaction
   *  - revoke it + create a new token row inside same transaction
   *  - after commit set cookie and return access token
   */
  async refresh(req: Request, res: Response) {
    const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token";
    const token =
      (req.cookies && req.cookies[cookieName]) ||
      req.body?.refreshToken ||
      req.headers["x-refresh-token"];
    if (!token) {
      return res.status(401).json({
        error: {
          message:
            req.t?.("auth.no_refresh", "No refresh token provided") ??
            "No refresh token provided",
        },
      });
    }

    try {
      // verify token signature first - will throw if invalid/expired
      const payload: any = verifyRefreshToken(String(token));
      const userId = payload.sub;

      // quick, non-transactional check to see token exists and maps to user
      const stored = await findRefreshTokenRow(String(token));
      if (!stored || (stored as any).userId !== userId) {
        return res.status(401).json({
          error: {
            message:
              req.t?.("auth.invalid_refresh", "Invalid refresh token") ??
              "Invalid refresh token",
          },
        });
      }

      // Do rotation inside transaction: re-select + lock row, revoke it, create new token
      let newRawToken: string | null = null;
      let newRow: RefreshTokenInstance | null = null;

      await withTransaction(async (t: Transaction) => {
        // re-fetch stored row under transaction and lock it for update
        const locked = (await RefreshTokenModel.findOne({
          where: { id: (stored as any).id },
          transaction: t,
          // lock - different sequelize versions expose lock constants differently, so cast to any
          lock: (t as any).LOCK?.UPDATE ?? undefined,
        })) as RefreshTokenInstance | null;

        if (!locked) {
          throw new Error("Refresh token not found during rotation");
        }
        if (
          (locked as any).revoked ||
          (locked as any).expiresAt <= new Date()
        ) {
          throw new Error("Refresh token no longer valid");
        }

        // revoke old
        (locked as any).revoked = true;
        (locked as any).revokedAt = new Date();
        await locked.save({ transaction: t });

        // prepare device meta to preserve device info when creating new row
        const deviceMeta = {
          deviceId: (locked as any).deviceId ?? undefined,
          deviceName: (locked as any).deviceInfo?.name ?? undefined,
          ip: (locked as any).deviceInfo?.ip ?? undefined,
          userAgent: (locked as any).deviceInfo?.userAgent ?? undefined,
        };

        // create new refresh token row (transaction-aware)
        const created = await createRefreshToken(userId, deviceMeta, t);
        newRawToken = created.rawToken;
        newRow = created.db as RefreshTokenInstance;
      });

      if (!newRawToken || !newRow) {
        // defensive: should not happen
        throw new Error("Failed to rotate refresh token");
      }

      // transaction committed — now set cookie and issue access token
      setRefreshCookie(res, newRawToken, (newRow as any).expiresAt);

      // sign new access token (optionally include roles)
      const user = await User.findByPk(userId, {
        include: [{ model: Role, as: "roles" }],
      });
      const roles = (user as any)?.roles?.map((r: any) => r.name) || [];
      const accessToken = signAccessToken({ sub: userId, roles });

      return res.json({ accessToken });
    } catch (err: any) {
      logger.info("Refresh token invalid or expired", { err });
      return res.status(401).json({
        error: {
          message:
            req.t?.(
              "auth.invalid_or_expired_refresh",
              "Invalid or expired refresh token",
            ) ?? "Invalid or expired refresh token",
        },
      });
    }
  },

  /**
   * Logout: revoke the presented refresh token (hashed lookup) and clear cookie.
   */
  async logout(req: Request, res: Response) {
    const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token";
    const token =
      (req.cookies && req.cookies[cookieName]) ||
      req.body?.refreshToken ||
      req.headers["x-refresh-token"];

    if (token) {
      try {
        // find by hashed token
        const stored = await findRefreshTokenRow(String(token));
        if (stored) {
          stored.revoked = true;
          stored.revokedAt = new Date();
          await stored.save();
        } else {
          // It might not be found (already revoked / expired) — ignore
          logger.info(
            "Logout: refresh token not found (already revoked/expired)",
          );
        }
      } catch (err) {
        // swallow errors during logout to avoid blocking client but log them
        logger.error("Error revoking refresh token on logout:", err);
      }
    }

    clearRefreshCookie(res);
    return res.json({
      ok: true,
      message: req.t?.("auth.logged_out", "Logged out") ?? "Logged out",
    });
  },
};
