// src/controllers/shiftSummary.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AppError } from "../errors/AppError";
import { fn, col, literal, Op } from "sequelize";
import { PackageUsage } from "../models";
import {
  ShiftSession,
  Payment,
  PaymentMethod,
  Order,
  OrderItem,
  Staff,
  Service,
} from "../models";

export const getShiftSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const rawId = req.params.shiftId ?? req.params.id;
    const shiftId = Number(rawId);
    if (!Number.isFinite(shiftId) || shiftId <= 0) {
      throw new AppError("Invalid shift id", 400, "shift.invalid_id");
    }

    const shift = await ShiftSession.findByPk(shiftId);
    if (!shift) throw new AppError("Shift not found", 404);

    if (shift.status !== "closed") {
      throw new AppError("Shift must be closed to generate Z-report", 400);
    }

    // keep period only for display
    const from = shift.openedAt;
    const to = shift.closedAt!;

    // ===============================
    // 1️⃣ Payments ledger (FILS) by shiftSessionId ✅
    // ===============================
    const payments = await Payment.findAll({
      include: [{ model: PaymentMethod, as: "method" }],
      where: {
        shiftSessionId: shiftId,
        status: "completed",
      },
    });

    let grossSalesFils = 0;
    let refundsFils = 0;

    const byMethod: Record<
      number,
      {
        methodId: number;
        methodCode: string;
        methodName: string;
        salesFils: number;
        refundsFils: number;
      }
    > = {};

    for (const p of payments as any[]) {
      const method = p.method;
      if (!method) continue;

      if (!byMethod[method.id]) {
        byMethod[method.id] = {
          methodId: method.id,
          methodCode: method.code,
          methodName: method.nameEn,
          salesFils: 0,
          refundsFils: 0,
        };
      }

      const amt = Number(p.amountFils || 0);

      if (amt >= 0) {
        grossSalesFils += amt;
        byMethod[method.id].salesFils += amt;
      } else {
        const r = Math.abs(amt);
        refundsFils += r;
        byMethod[method.id].refundsFils += r;
      }
    }

    const netSalesFils = grossSalesFils - refundsFils;

    // ===============================
    // 2️⃣ Cash control
    // ===============================
    const cashMethod = Object.values(byMethod).find(
      (m) => m.methodCode === "cash",
    );

    const expectedCashFils =
      (shift.openingCashFils ?? 0) +
      (cashMethod?.salesFils ?? 0) -
      (cashMethod?.refundsFils ?? 0);

    const actualCashFils = shift.closingCashFils ?? 0;
    const varianceFils = actualCashFils - expectedCashFils;

    // ===============================
    // 3️⃣ Commission calculation (Orders by shiftSessionId ✅)
    // ===============================
    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: Order,
          as: "order",
          required: true,
          where: {
            shiftSessionId: shiftId,
            status: "paid",
          },
        },
        { model: Staff, as: "staff", required: false },
        { model: Service, as: "service", required: false },
      ],
    });

    const commissionsByStaff: Record<
      number,
      {
        staffId: number;
        staffName: string;
        commissionFils: number;
        breakdown: {
          orderItemId: number;
          baseFils: number;
          percent: number;
          commissionFils: number;
        }[];
      }
    > = {};

    let totalCommissionFils = 0;

    for (const it of orderItems as any[]) {
      if (it.lineType !== "service" || !it.staffId) continue;

      const staff = it.staff;
      const service = it.service;

      const percent = (service?.commissionPercent ??
        staff?.commissionPercent ??
        0) as number;

      if (!percent || percent <= 0) continue;

      const baseFils = Number(it.totalPriceFils || 0);
      const commissionFils = Math.floor((baseFils * percent) / 100);

      totalCommissionFils += commissionFils;

      if (!commissionsByStaff[it.staffId]) {
        commissionsByStaff[it.staffId] = {
          staffId: it.staffId,
          staffName: staff?.displayName ?? `Staff #${it.staffId}`,
          commissionFils: 0,
          breakdown: [],
        };
      }

      commissionsByStaff[it.staffId].commissionFils += commissionFils;
      commissionsByStaff[it.staffId].breakdown.push({
        orderItemId: it.id,
        baseFils,
        percent,
        commissionFils,
      });
    }
    // ===============================
    // 3.5️⃣ Packages: sessions used during shift + redeemed value placeholder
    // ===============================

    // A) Sessions used (sum of PackageUsage.qty) linked to this shift
    // We filter by usedAt within shift period AND order belongs to this shift.
    const pkgUsageAgg = (await PackageUsage.findAll({
      attributes: [[fn("SUM", col("qty")), "sessionsUsed"]],
      include: [
        {
          model: OrderItem,
          as: "orderItem",
          required: true,
          attributes: [],
          include: [
            {
              model: Order,
              as: "order",
              required: true,
              attributes: [],
              where: { shiftSessionId: shiftId },
            },
          ],
        },
      ],
      where: {
        usedAt: { [Op.gte]: from, [Op.lte]: to },
      },
      raw: true,
    })) as unknown as Array<{ sessionsUsed: string | number }>;

    const sessionsUsedDuringShift =
      Number(pkgUsageAgg?.[0]?.sessionsUsed ?? 0) || 0;

    // B) Redeemed value placeholder: sum(unitPriceFils * coveredQty) for SERVICE items in paid orders
    let packageRedeemedValueFils = 0;

    for (const it of orderItems as any[]) {
      if (it.lineType !== "service") continue;

      const coveredQty = Number(it.coveredQty || 0);
      if (coveredQty > 0) {
        const unit = Number(it.unitPriceFils || 0);
        packageRedeemedValueFils += unit * coveredQty;
      }
    }

    // Recognized revenue placeholder:
    // cash net (netSalesFils) + redeemed value (delivered via old packages)
    const recognizedRevenuePlaceholderFils =
      netSalesFils + packageRedeemedValueFils;

    // ===============================
    // 4️⃣ Final response
    // ===============================
    res.json({
      status: "success",
      data: {
        shiftId,
        period: { from, to },

        sales: {
          grossFils: grossSalesFils,
          refundsFils,
          netFils: netSalesFils,
        },
        packages: {
          sessionsUsed: sessionsUsedDuringShift,
          redeemedValueFils: packageRedeemedValueFils,
        },

        recognizedRevenuePlaceholder: {
          cashNetSalesFils: netSalesFils,
          packageRedeemedValueFils,
          recognizedFils: recognizedRevenuePlaceholderFils,
          note: "Placeholder for deferred revenue. Package sales recognition will be implemented later.",
        },

        paymentsByMethod: Object.values(byMethod).map((m) => ({
          ...m,
          netFils: m.salesFils - m.refundsFils,
        })),

        cashControl: {
          openingCashFils: shift.openingCashFils ?? 0,
          expectedCashFils,
          actualCashFils,
          varianceFils,
        },

        commissions: {
          totalCommissionFils,
          byStaff: Object.values(commissionsByStaff),
        },
      },
    });
  },
);
