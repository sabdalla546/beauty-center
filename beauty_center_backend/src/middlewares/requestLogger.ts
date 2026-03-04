// src/middlewares/requestLogger.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Minimal request logger: logs method, url, status, response time and user id if available.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;
  const ip =
    req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // after response finished, log details
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    // if authenticate middleware populates req.user, include user id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.id;
    const msg = `${method} ${originalUrl} ${status} - ${duration}ms - ip=${ip}${
      userId ? ` - user=${userId}` : ""
    }`;
    const meta = {
      method,
      url: originalUrl,
      status,
      duration,
      ip,
      userId,
      headers: { referer: req.headers.referer, ua: req.headers["user-agent"] },
    };

    if (status >= 500) {
      logger.error(msg, meta);
    } else if (status >= 400) {
      logger.warn(msg, meta);
    } else {
      logger.info(msg, meta);
    }
  });

  next();
}
