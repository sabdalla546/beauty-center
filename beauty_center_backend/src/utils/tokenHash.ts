// src/utils/tokenHash.ts
import crypto from "crypto";

const HASH_SECRET =
  process.env.JWT_REFRESH_TOKEN_HASH_SECRET || "change_me_to_a_strong_secret";

export function hashRefreshToken(rawToken: string): string {
  // HMAC-SHA256 hex digest
  return crypto
    .createHmac("sha256", HASH_SECRET)
    .update(rawToken)
    .digest("hex");
}
