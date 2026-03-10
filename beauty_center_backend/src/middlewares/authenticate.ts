import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { Role } from "../models/role.model";
import { logger } from "../utils/logger";
import { fail } from "../utils/apiResponse";

/**
 * AuthRequest: exported so other middlewares/controllers can use the stronger type.
 * user: { id: number; roles?: string[]; [k:string]: any }
 */
export interface AuthRequest extends Request {
  user?: { id: number; roles?: string[]; [k: string]: any };
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return fail(
      res,
      401,
      "auth.unauthorized",
      req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized",
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload: any = jwt.verify(token, ACCESS_SECRET as jwt.Secret);
    const userId = Number(payload?.sub || 0);
    if (!userId) {
      return fail(
        res,
        401,
        "auth.invalid_or_expired_token",
        req.t?.("auth.invalid_or_expired_token", "Invalid or expired token") ??
          "Invalid or expired token",
      );
    }

    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: "roles", attributes: ["name"] }],
      attributes: ["id", "isActive"],
    });

    if (!user || !(user as any).isActive) {
      return fail(
        res,
        401,
        "auth.user_inactive",
        req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized",
      );
    }

    const roles =
      ((user as any).roles as Array<{ name?: string }>)
        ?.map((r) => String(r?.name || "").trim())
        .filter(Boolean) ?? [];

    req.user = { id: userId, roles };
    return next();
  } catch (err: any) {
    logger.info("Authentication failed", { err: err?.message ?? err });
    return fail(
      res,
      401,
      "auth.invalid_or_expired_token",
      req.t?.("auth.invalid_or_expired_token", "Invalid or expired token") ??
        "Invalid or expired token",
    );
  }
}
