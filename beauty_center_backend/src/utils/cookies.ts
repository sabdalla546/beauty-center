// src/utils/cookies.ts
import { Response } from "express";

export function setRefreshCookie(
  res: Response,
  token: string,
  expiresAt: Date
) {
  const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token";
  const httpOnly = (process.env.REFRESH_TOKEN_HTTP_ONLY ?? "true") === "true";
  const sameSite = (process.env.REFRESH_TOKEN_SAME_SITE as any) || "lax";

  res.cookie(cookieName, token, {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite,
    expires: expiresAt,
  });
}

export function clearRefreshCookie(res: Response) {
  const cookieName = process.env.REFRESH_TOKEN_COOKIE_NAME || "refresh_token";
  res.clearCookie(cookieName, {
    httpOnly: (process.env.REFRESH_TOKEN_HTTP_ONLY ?? "true") === "true",
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.REFRESH_TOKEN_SAME_SITE as any) || "lax",
  });
}
