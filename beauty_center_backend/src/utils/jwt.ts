// src/utils/jwt.ts
import * as jwt from "jsonwebtoken";
import { Op, Transaction } from "sequelize";
import { RefreshToken } from "../models/refreshToken.model";
import { hashRefreshToken } from "./tokenHash";
import { logger } from "./logger";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
const ACCESS_EXP = process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_EXP = process.env.JWT_REFRESH_EXPIRY || "30d";

const MAX_REFRESH_TOKENS = Number(process.env.MAX_REFRESH_TOKENS || "5");
const MAX_REFRESH_TOKENS_PER_DEVICE = Number(
  process.env.MAX_REFRESH_TOKENS_PER_DEVICE || "2",
);
const DESTROY_OLD_TOKENS =
  (process.env.DESTROY_OLD_TOKENS || "false") === "true";
const PRUNE_INTERVAL_MS = Number(
  process.env.REFRESH_PRUNE_INTERVAL_MS || 1000 * 60 * 15,
);
const CLEANUP_INTERVAL_MS = Number(
  process.env.REFRESH_CLEANUP_INTERVAL_MS || 1000 * 60 * 60 * 24,
);
const REVOCATION_GRACE_DAYS = Number(process.env.REVOCATION_GRACE_DAYS || "30");

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.warn("JWT secrets missing in env");
}

/** helpers for jwt.sign type-safe calls */
export function signAccessToken(payload: object): string {
  // payload must be object|string|Buffer, secret is string (jwt.Secret)
  return jwt.sign(
    payload as object,
    ACCESS_SECRET as jwt.Secret,
    {
      expiresIn: ACCESS_EXP,
    } as jwt.SignOptions,
  );
}
export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET as jwt.Secret);
}
export function signRefreshToken(payload: object): string {
  return jwt.sign(
    payload as object,
    REFRESH_SECRET as jwt.Secret,
    {
      expiresIn: REFRESH_EXP,
    } as jwt.SignOptions,
  );
}
export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET as jwt.Secret);
}

/**
 * createRefreshToken
 * returns { rawToken, db } with db typed as RefreshToken instance
 */
export async function createRefreshToken(
  userId: number,
  deviceMeta?: {
    deviceId?: string;
    deviceName?: string;
    ip?: string;
    userAgent?: string;
  },
  transaction?: Transaction,
): Promise<{ rawToken: string; db: RefreshToken }> {
  // create raw token
  const rawToken = signRefreshToken({ sub: userId });
  const decoded: any = jwt.decode(rawToken);
  const expiresAt = new Date((decoded.exp as number) * 1000);
  const tokenHash = hashRefreshToken(rawToken);

  const deviceId = deviceMeta?.deviceId ?? null;
  const deviceInfo =
    deviceMeta != null
      ? {
          name: deviceMeta.deviceName ?? null,
          ip: deviceMeta.ip ?? null,
          userAgent: deviceMeta.userAgent ?? null,
        }
      : null;

  // pass transaction option when provided
  const createOpts: any = transaction ? { transaction } : {};

  // create row — cast result to RefreshToken to satisfy TS
  const createdRaw = await RefreshToken.create(
    {
      userId,
      tokenHash,
      deviceId,
      deviceInfo,
      expiresAt,
      revoked: false,
    } as any,
    createOpts,
  );

  // defensive runtime check: should not happen, but keeps TS and runtime safe
  if (!createdRaw) {
    // If DB driver returned nothing (unexpected), throw so caller sees a clear error
    throw new Error("Failed to create refresh token row");
  }

  // cast to strongly-typed instance (avoids 'void | RefreshToken' union)
  const created = createdRaw as unknown as RefreshToken;

  // enforce per-device limit first, then per-user (pass transaction down)
  if (deviceId) {
    await enforceRefreshTokenLimitPerDevice(
      userId,
      deviceId,
      MAX_REFRESH_TOKENS_PER_DEVICE,
      transaction,
    );
  }
  await enforceRefreshTokenLimit(userId, MAX_REFRESH_TOKENS, transaction);

  return { rawToken, db: created };
}

/**
 * findRefreshTokenRow: optionally transactional
 */
export async function findRefreshTokenRow(
  rawToken: string,
  transaction?: Transaction,
): Promise<RefreshToken | null> {
  const tokenHash = hashRefreshToken(rawToken);
  const row = await RefreshToken.findOne({
    where: { tokenHash, revoked: false, expiresAt: { [Op.gt]: new Date() } },
    transaction,
  });
  return row;
}

/**
 * enforceRefreshTokenLimit - transaction-aware
 */
export async function enforceRefreshTokenLimit(
  userId: number,
  max: number = MAX_REFRESH_TOKENS,
  transaction?: Transaction,
) {
  if (max <= 0) return;

  const findOpts: any = {
    where: { userId, revoked: false, expiresAt: { [Op.gt]: new Date() } },
    order: [["createdAt", "ASC"]],
  };
  if (transaction) {
    findOpts.transaction = transaction;
    // lock to prevent races (cast to any to satisfy TS)
    findOpts.lock = (transaction as any).LOCK?.UPDATE ?? undefined;
  }

  const activeTokens = await RefreshToken.findAll(findOpts);

  if (activeTokens.length <= max) return;

  const excess = activeTokens.length - max;
  const toHandle = activeTokens.slice(0, excess);

  for (const r of toHandle) {
    try {
      if (DESTROY_OLD_TOKENS) {
        await r.destroy(transaction ? { transaction } : undefined);
      } else {
        r.revoked = true;
        r.revokedAt = new Date();
        await r.save(transaction ? { transaction } : undefined);
      }
    } catch (err) {
      logger.error("Failed to handle old refresh token:", err);
    }
  }
}

/**
 * enforceRefreshTokenLimitPerDevice - transaction-aware
 */
export async function enforceRefreshTokenLimitPerDevice(
  userId: number,
  deviceId: string,
  max: number = MAX_REFRESH_TOKENS_PER_DEVICE,
  transaction?: Transaction,
) {
  if (!deviceId || max <= 0) return;

  const findOpts: any = {
    where: {
      userId,
      deviceId,
      revoked: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "ASC"]],
  };

  if (transaction) {
    findOpts.transaction = transaction;
    findOpts.lock = (transaction as any).LOCK?.UPDATE ?? undefined;
  }

  const activeTokens = await RefreshToken.findAll(findOpts);

  if (activeTokens.length <= max) return;

  const excess = activeTokens.length - max;
  const toHandle = activeTokens.slice(0, excess);

  for (const r of toHandle) {
    try {
      if (DESTROY_OLD_TOKENS) {
        await r.destroy(transaction ? { transaction } : undefined);
      } else {
        r.revoked = true;
        r.revokedAt = new Date();
        await r.save(transaction ? { transaction } : undefined);
      }
    } catch (err) {
      logger.error("Failed to handle old device token:", err);
    }
  }
}

/* ... pruneExpiredRefreshTokens, cleanupOldRevokedTokens, startRefreshTokenMaintenance unchanged ... */

export async function pruneExpiredRefreshTokens() {
  const now = new Date();
  const expired = await RefreshToken.findAll({
    where: { revoked: false, expiresAt: { [Op.lte]: now } },
  });

  for (const row of expired) {
    try {
      row.revoked = true;
      row.revokedAt = new Date();
      await row.save();
    } catch (err) {
      logger.error("Failed to revoke expired refresh token:", err);
    }
  }

  return expired.length;
}

export async function cleanupOldRevokedTokens(
  graceDays = REVOCATION_GRACE_DAYS,
) {
  const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);
  const toDelete = await RefreshToken.findAll({
    where: { revoked: true, revokedAt: { [Op.lte]: cutoff } },
  });

  let deleted = 0;
  for (const row of toDelete) {
    try {
      await row.destroy();
      deleted++;
    } catch (err) {
      logger.error("Failed to permanently delete revoked token:", err);
    }
  }
  return deleted;
}

export function startRefreshTokenMaintenance(
  pruneIntervalMs = PRUNE_INTERVAL_MS,
  cleanupIntervalMs = CLEANUP_INTERVAL_MS,
) {
  const pruneId = setInterval(async () => {
    try {
      const n = await pruneExpiredRefreshTokens();
      if (n > 0) logger.info(`[refresh-prune] revoked ${n} expired tokens`);
    } catch (err) {
      logger.error("[refresh-prune] error", err);
    }
  }, pruneIntervalMs);

  const cleanupId = setInterval(async () => {
    try {
      const n = await cleanupOldRevokedTokens();
      if (n > 0)
        logger.info(`[refresh-cleanup] deleted ${n} old revoked tokens`);
    } catch (err) {
      logger.error("[refresh-cleanup] error", err);
    }
  }, cleanupIntervalMs);

  return { pruneId, cleanupId };
}
