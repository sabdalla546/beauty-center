// src/utils/transaction.ts
import { Transaction } from "sequelize";
import { sequelize } from "../db";

/**
 * Run function inside a managed transaction.
 * Commits on success, rolls back on error.
 *
 * Usage:
 *   return withTransaction(async (t) => {
 *     await Model.create(..., { transaction: t });
 *     ...
 *   });
 */
export async function withTransaction<T>(
  fn: (t: Transaction) => Promise<T>
): Promise<T> {
  const t = await sequelize.transaction();
  try {
    const result = await fn(t);
    await t.commit();
    return result;
  } catch (err) {
    try {
      await t.rollback();
    } catch (rbErr) {
      // best-effort rollback logging; don't override original error
      // eslint-disable-next-line no-console
      console.error("Transaction rollback failed:", rbErr);
    }
    throw err;
  }
}
