// src/controllers/shift.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AppError } from "../errors/AppError";
import { sequelize } from "../db/db";

import { openShiftSchema, closeShiftSchema } from "../validators/shift";
import { ShiftSession, Order, Payment, PaymentMethod } from "../models";
import { kwdToFils } from "../utils/money";

const requireUserId = (req: Request) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError(
      req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized",
      401,
      "auth.unauthorized",
    );
  }
  return Number(userId);
};

/**
 * =========================
 * OPEN SHIFT
 * =========================
 */
export const openShift = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);

  const parsed = openShiftSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        message: req.t?.("shift.invalid_input", "Invalid input"),
        details: parsed.error.flatten(),
      },
    });
  }

  // prevent multiple open shifts for same user
  const existingOpen = await ShiftSession.findOne({
    where: { userId, status: "open" },
    order: [["id", "DESC"]],
  });

  if (existingOpen) {
    throw new AppError(
      req.t?.("shift.already_open", "You already have an open shift") ??
        "You already have an open shift",
      400,
      "shift.already_open",
      { shiftId: existingOpen.id },
    );
  }

  const openingCashFils = parsed.data.openingCashFils ?? 0;

  const shift = await ShiftSession.create({
    userId,
    status: "open",
    openedAt: new Date(),
    openingCashFils,
    expectedCashFils: openingCashFils, // initial expectation
    notes: parsed.data.notes ?? null,
  });

  res.status(201).json({ data: shift });
});

/**
 * =========================
 * GET MY OPEN SHIFT
 * =========================
 */
export const getMyOpenShift = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = requireUserId(req);

    const shift = await ShiftSession.findOne({
      where: { userId, status: "open" },
      order: [["id", "DESC"]],
    });

    res.json({ data: shift }); // null if none
  },
);

/**
 * =========================
 * CLOSE SHIFT (Z-CLOSE)
 * =========================
 *
 * - calculates expectedCashFils automatically
 * - stores closingCashFils counted by cashier
 * - sets status = closed
 */
export const closeShift = asyncHandler(async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const shiftId = Number(req.params.id);

  const parsed = closeShiftSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        message:
          req.t?.("shift.invalid_input", "Invalid input") ?? "Invalid input",
        details: parsed.error.flatten(),
      },
    });
  }

  // UI sends KWD, server converts to FILS
  const closingCashFilsFromUI = kwdToFils(parsed.data.closingCashKwd);

  const result = await sequelize.transaction(async (t) => {
    const shift = await ShiftSession.findByPk(shiftId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!shift) throw new AppError("Shift not found", 404, "shift.not_found");
    if (Number(shift.userId) !== Number(userId))
      throw new AppError("Forbidden", 403, "shift.forbidden");
    if (shift.status === "closed")
      throw new AppError("Shift already closed", 400, "shift.already_closed");

    const to = new Date();

    // ✅ choose cash method by ENV id first (most reliable)
    const cashMethodIdEnv = Number(process.env.CASH_METHOD_ID || 0);

    let cashMethod: any = null;

    if (cashMethodIdEnv > 0) {
      cashMethod = await PaymentMethod.findByPk(cashMethodIdEnv, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
    }

    // fallback: by code (change "cash" to your real code if needed)
    if (!cashMethod) {
      cashMethod = await PaymentMethod.findOne({
        where: { code: "cash", isActive: true } as any,
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
    }

    // Net cash inside THIS shift only (refunds are negative)
    let sumCashFils = 0;

    if (cashMethod) {
      const cashAgg = await Payment.findOne({
        where: {
          shiftSessionId: shift.id, // ✅ IMPORTANT
          methodId: cashMethod.id,
          status: "completed",
        } as any,
        attributes: [
          [
            sequelize.fn(
              "COALESCE",
              sequelize.fn("SUM", sequelize.col("amountFils")),
              0,
            ),
            "sumCashFils",
          ],
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
        raw: true,
      });

      sumCashFils = Number((cashAgg as any)?.sumCashFils ?? 0);
    }

    const openingCashFils = Number(shift.openingCashFils ?? 0);
    const expectedCashFils = openingCashFils + sumCashFils;

    await shift.update(
      {
        status: "closed",
        closedAt: to,
        expectedCashFils,
        closingCashFils: closingCashFilsFromUI,
        notes: parsed.data.notes ?? shift.notes ?? null,
      } as any,
      { transaction: t },
    );

    return {
      shiftId: shift.id,
      openedAt: shift.openedAt.toISOString(),
      closedAt: to.toISOString(),
      cashMethodId: cashMethod?.id ?? null,
      openingCashFils,
      sumCashFils,
      expectedCashFils,
      closingCashFils: closingCashFilsFromUI,
      varianceFils: closingCashFilsFromUI - expectedCashFils,
    };
  });

  res.json({ status: "success", data: result });
});
