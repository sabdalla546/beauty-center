// src/controllers/sessionController.ts
import { Request, Response } from "express";
import { RefreshToken } from "../models/refreshToken.model";
import { AppError } from "../errors/AppError";
import { sequelize } from "../db";

export interface AuthRequest extends Request {
  user?: { id: number; roles?: string[] };
}

/**
 * GET /auth/sessions
 * List active sessions for authenticated user
 */
export async function listSessions(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const sessions = await RefreshToken.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "deviceId",
      "deviceInfo",
      "revoked",
      "revokedAt",
      "expiresAt",
      "createdAt",
    ],
  });

  return res.json({
    message: req.t("sessions.list_success", "Sessions fetched successfully"),
    sessions,
  });
}

/**
 * DELETE /auth/sessions/:id
 * Revoke (or destroy) a specific session for authenticated user.
 */
export async function revokeSession(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const sessionId = Number(req.params.id);

  if (!sessionId) {
    throw new AppError(
      req.t("sessions.invalid_id", "Invalid session ID"),
      400,
      "INVALID_SESSION_ID",
    );
  }

  const t = await sequelize.transaction();
  try {
    const row = await RefreshToken.findOne({
      where: { id: sessionId, userId },
      transaction: t,
    });

    if (!row) {
      await t.rollback();
      throw new AppError(
        req.t("sessions.not_found", "Session not found"),
        404,
        "SESSION_NOT_FOUND",
      );
    }

    const DESTROY_OLD_TOKENS =
      (process.env.DESTROY_OLD_TOKENS || "false") === "true";

    if (DESTROY_OLD_TOKENS) {
      await row.destroy({ transaction: t });
    } else {
      row.revoked = true;
      row.revokedAt = new Date();
      await row.save({ transaction: t });
    }

    await t.commit();

    return res.json({
      ok: true,
      message: req.t("sessions.revoked", "Session revoked successfully"),
    });
  } catch (err: any) {
    await t.rollback();
    throw err;
  }
}

/**
 * DELETE /auth/sessions
 * Revoke all sessions for current user (except optionally current token)
 */
export async function revokeAllSessions(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const exceptCurrent = req.query.exceptCurrent === "true";

  const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token";
  const presentedToken =
    req.cookies?.[cookieName] || req.headers["x-refresh-token"] || null;

  const t = await sequelize.transaction();

  try {
    const rows = await RefreshToken.findAll({
      where: { userId },
      transaction: t,
    });

    for (const r of rows) {
      // skip current token if exceptCurrent = true
      if (exceptCurrent && presentedToken) {
        const { hashRefreshToken } = await import("../utils/tokenHash");
        const hash = hashRefreshToken(String(presentedToken));
        if (r.tokenHash === hash) continue;
      }

      const DESTROY_OLD_TOKENS =
        (process.env.DESTROY_OLD_TOKENS || "false") === "true";

      if (DESTROY_OLD_TOKENS) {
        await r.destroy({ transaction: t });
      } else {
        r.revoked = true;
        r.revokedAt = new Date();
        await r.save({ transaction: t });
      }
    }

    await t.commit();

    return res.json({
      ok: true,
      message: req.t(
        "sessions.revoked_all",
        "All sessions revoked successfully",
      ),
    });
  } catch (err: any) {
    await t.rollback();
    throw err;
  }
}
