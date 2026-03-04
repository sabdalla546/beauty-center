// src/middlewares/authorize.ts
import { Response, NextFunction } from "express";
import {
  userHasAnyRole,
  userHasPermission,
} from "../services/permission.service";
import { AuthRequest } from "./authenticate";
import { logger } from "../utils/logger";

/**
 * requireRole(...allowedRoles)
 * - If no allowedRoles passed, it behaves like a simple authenticate() (but still requires login).
 * Usage:
 *   router.get('/admin', authenticate, requireRole('admin','manager'), controller)
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        const msg =
          req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized";
        return res.status(401).json({ error: msg });
      }

      // If no roles specified, allow any authenticated user
      if (!allowedRoles || allowedRoles.length === 0) return next();

      const ok = await userHasAnyRole(userId, allowedRoles);
      if (!ok) {
        const msg =
          req.t?.("auth.forbidden_role", "Forbidden: insufficient role") ??
          "Forbidden: insufficient role";
        return res.status(403).json({ error: msg });
      }

      return next();
    } catch (err: any) {
      logger.error("requireRole error", err);
      return next(err);
    }
  };
}

/**
 * requirePermission(permissionName)
 * Usage:
 *   router.post('/appointments', authenticate, requirePermission('appointments.create'), controller)
 */
export function requirePermission(permissionName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        const msg =
          req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized";
        return res.status(401).json({ error: msg });
      }

      if (!permissionName) return next(); // nothing to check

      const ok = await userHasPermission(userId, permissionName);
      if (!ok) {
        const msg =
          req.t?.(
            "auth.forbidden_permission",
            "Forbidden: missing permission",
          ) ?? "Forbidden: missing permission";
        return res.status(403).json({ error: msg });
      }

      return next();
    } catch (err: any) {
      logger.error("requirePermission error", err);
      return next(err);
    }
  };
}
