// src/middlewares/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Usage:
 * router.post('/', asyncHandler(async (req,res)=> { ... }));
 */
export const asyncHandler =
  (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    // fn may return a promise; forward errors to next()
    Promise.resolve((fn as any)(req, res, next)).catch(next);
  };
