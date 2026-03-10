import { NextFunction, Response } from "express";
import {
  userHasAnyRole,
  userHasPermission,
} from "../services/permission.service";
import { AuthRequest } from "./authenticate";
import { logger } from "../utils/logger";
import { AppError } from "../errors/AppError";

export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(
          req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized",
          401,
          "auth.unauthorized",
        );
      }

      if (!allowedRoles || allowedRoles.length === 0) return next();

      const ok = await userHasAnyRole(userId, allowedRoles);
      if (!ok) {
        throw new AppError(
          req.t?.("auth.forbidden_role", "Forbidden: insufficient role") ??
            "Forbidden: insufficient role",
          403,
          "auth.forbidden_role",
        );
      }

      return next();
    } catch (err: any) {
      logger.error("requireRole error", err);
      return next(err);
    }
  };
}

export function requirePermission(permissionName: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(
          req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized",
          401,
          "auth.unauthorized",
        );
      }

      if (!permissionName) return next();

      const ok = await userHasPermission(userId, permissionName);
      if (!ok) {
        throw new AppError(
          req.t?.("auth.forbidden_permission", "Forbidden: missing permission") ??
            "Forbidden: missing permission",
          403,
          "auth.forbidden_permission",
        );
      }

      return next();
    } catch (err: any) {
      logger.error("requirePermission error", err);
      return next(err);
    }
  };
}
