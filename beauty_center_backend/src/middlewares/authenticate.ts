// src/middlewares/authenticate.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

/**
 * AuthRequest: exported so other middlewares/controllers can use the stronger type.
 * user: { id: number; roles?: string[]; [k:string]: any }
 */
export interface AuthRequest extends Request {
  user?: { id: number; roles?: string[]; [k: string]: any };
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const msg = req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized";
    return res.status(401).json({ error: msg });
  }

  const token = authHeader.split(" ")[1];
  try {
    // verify returns payload (object) or throws
    const payload: any = jwt.verify(token, ACCESS_SECRET as jwt.Secret);
    // attach normalized user info
    req.user = { id: payload.sub, roles: payload.roles || [] };
    next();
  } catch (err: any) {
    logger.info("Authentication failed", { err: err?.message ?? err });
    const msg =
      req.t?.("auth.invalid_or_expired_token", "Invalid or expired token") ??
      "Invalid or expired token";
    return res.status(401).json({ error: msg });
  }
}
