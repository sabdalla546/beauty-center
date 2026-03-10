// src/middlewares/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncWrappedHandler = RequestHandler & { __asyncWrapped?: true };

/**
 * Usage:
 * router.post('/', asyncHandler(async (req,res)=> { ... }));
 *
 * Idempotent wrapper:
 * - if handler is already wrapped, returns it as-is.
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  const maybeWrapped = fn as AsyncWrappedHandler;
  if (maybeWrapped.__asyncWrapped) return fn;

  const wrapped: AsyncWrappedHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  wrapped.__asyncWrapped = true;
  return wrapped;
};
