// src/middlewares/notFound.ts
import { Request, Response, NextFunction } from "express";

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.status(404).json({
    ok: false,
    error: { message: "Not Found", code: "NOT_FOUND" },
  });
}
