// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import {
  ValidationError as SequelizeValidationError,
  UniqueConstraintError,
} from "sequelize";
import * as jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";

/**
 * Standard error response factory
 */
function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
) {
  return res.status(statusCode).json({
    ok: false,
    error: {
      message,
      code,
      details: details || undefined,
    },
  });
}

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // If the error is already an AppError (operational), use its values
  if (err instanceof AppError) {
    // Try to translate the message using req.t if available.
    // `err.code` is expected to be the translation key (e.g. "user.email_in_use").
    let outMessage = err.message;
    try {
      if (req && typeof (req as any).t === "function" && err.code) {
        // i18next: first arg = key, second = fallback default
        outMessage = (req as any).t(err.code, err.message);
      }
    } catch (tErr) {
      // translation lookup failed — log and continue with original message
      logger.warn("i18n translate failed for AppError.code", {
        code: err.code,
        tErr: (tErr as Error)?.message ?? tErr,
      });
    }

    logger.warn(`AppError: ${err.message}`, {
      code: err.code,
      status: err.statusCode,
      details: err.details,
    });

    return errorResponse(
      res,
      err.statusCode || 400,
      err.code || "ERROR",
      outMessage,
      err.details
    );
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const flat = err.flatten();
    logger.info("Validation error", { details: flat });
    return errorResponse(res, 400, "INVALID_INPUT", "Validation failed", flat);
  }

  // Sequelize validation errors (including unique constraint violations)
  if (
    err instanceof SequelizeValidationError ||
    err instanceof UniqueConstraintError
  ) {
    const details = {
      errors:
        (err as any).errors?.map((e: any) => ({
          message: e.message,
          path: e.path,
          value: e.value,
        })) || [],
    };
    const status = err instanceof UniqueConstraintError ? 409 : 400;
    const code =
      err instanceof UniqueConstraintError ? "CONFLICT" : "INVALID_INPUT";
    logger.warn("Sequelize validation error", { code, details });
    return errorResponse(
      res,
      status,
      code,
      err.message || "Database validation error",
      details
    );
  }

  // JWT errors
  if (err instanceof jwt.TokenExpiredError) {
    logger.info("JWT token expired", {
      message: err.message,
      stack: err.stack,
    });
    return errorResponse(
      res,
      401,
      "TOKEN_EXPIRED",
      "Authentication token has expired"
    );
  }
  if (err instanceof jwt.JsonWebTokenError) {
    logger.info("JWT invalid token", { message: err.message });
    return errorResponse(
      res,
      401,
      "INVALID_TOKEN",
      "Invalid authentication token"
    );
  }

  // Plain object with status / code
  if (
    err &&
    typeof err === "object" &&
    (err.status || err.statusCode) &&
    err.message
  ) {
    const status = err.status || err.statusCode || 500;
    const code = (err.code as string) || "ERROR";
    logger.warn("Library returned error-like object", {
      code,
      status,
      message: err.message,
      details: err.details,
    });
    return errorResponse(
      res,
      status,
      code,
      err.message,
      err.details || undefined
    );
  }

  // Unhandled/unknown error
  logger.error("Unhandled error", {
    message: err?.message,
    stack: err?.stack,
    meta: { url: req.originalUrl },
  });

  const details =
    process.env.NODE_ENV === "development" ? { stack: err?.stack } : undefined;
  return errorResponse(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "Something went wrong",
    details
  );
}
