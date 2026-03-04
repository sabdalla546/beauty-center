// src/controllers/refund.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AppError } from "../errors/AppError";
import { sequelize } from "../db";

import {
  Order,
  OrderItem,
  Payment,
  Product,
  ShiftSession,
  StockMovement,
} from "../models";

export const refundOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderId = Number(req.params.id);
  const userId = (req as any).user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const t = await sequelize.transaction();
  try {
    const openShift = await ShiftSession.findOne({
      where: { userId, status: "open" },
      transaction: t,
      lock: t.LOCK.UPDATE,
      order: [["id", "DESC"]],
    });
    if (!openShift) {
      throw new AppError(
        req.t?.("shift.not_open", "You must open a shift first") ??
          "You must open a shift first",
        400,
        "shift.not_open",
      );
    }

    // 1️⃣ Lock order
    const order = await Order.findByPk(orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) throw new AppError("Order not found", 404);
    if (order.status === "refunded")
      throw new AppError("Order already refunded", 400);

    if (order.status !== "paid")
      throw new AppError("Only paid orders can be refunded", 400);

    // 2️⃣ Reverse stock
    const items = await OrderItem.findAll({
      where: { orderId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    for (const it of items) {
      if (it.lineType !== "product") continue;

      const product = await Product.findByPk(it.referenceId!, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!product) throw new AppError("Product not found", 404);

      const qty = Math.max(1, it.quantity);
      const after = product.currentQty + qty;

      await product.update({ currentQty: after }, { transaction: t });

      await StockMovement.create(
        {
          productId: product.id,
          change: qty,
          reason: "refund",
          referenceId: String(order.id),
          resultingQty: after,
          createdBy: userId,
        },
        { transaction: t },
      );
    }

    // 3️⃣ Refund payments (same split & methods)
    const paidPayments = await Payment.findAll({
      where: { orderId, status: "completed" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const positive = paidPayments.filter((p) => Number(p.amountFils) > 0);
    if (!positive.length) throw new AppError("No payments to refund", 400);

    for (const p of positive) {
      await Payment.create(
        {
          orderId,
          methodId: (p as any).methodId,
          amountFils: -Math.abs(Number((p as any).amountFils || 0)),
          status: "completed",
          providerReference: "refund",
          shiftSessionId: (openShift as any).id, // ✅ add this
        } as any,
        { transaction: t },
      );
    }

    // 4️⃣ Update order status
    await order.update({ status: "refunded" }, { transaction: t });

    await t.commit();

    res.json({
      status: "success",
      data: {
        orderId,
        status: "refunded",
        refundedFils: order.totalFils,
      },
    });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});
