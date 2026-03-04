import { Op, fn, col } from "sequelize";
import {
  Payment,
  PaymentMethod,
  Order,
  OrderItem,
  Staff,
  Service,
  PackageUsage,
} from "../models";

type ReportArgs =
  | {
      // ✅ Shift-ledger mode (preferred)
      shiftSessionId: number;
      cashierId?: number;
    }
  | {
      // ✅ Period mode (for generic reports)
      from: Date;
      to: Date;
      cashierId?: number;
    };

export const buildSalesAndCommissionReport = async (args: ReportArgs) => {
  const cashierFilter = (cashierId?: number) =>
    cashierId ? { where: { createdBy: cashierId } } : {};

  // =========================
  // Payments (ledger)
  // =========================
  const paymentsWhere: any = { status: "completed" };

  if ("shiftSessionId" in args) {
    paymentsWhere.shiftSessionId = args.shiftSessionId;
  } else {
    paymentsWhere.createdAt = { [Op.gte]: args.from, [Op.lte]: args.to };
  }

  const payments = await Payment.findAll({
    where: paymentsWhere,
    include: [
      { model: PaymentMethod },
      {
        model: Order,
        required: true,
        attributes: ["id", "createdBy"],
        ...cashierFilter(args.cashierId),
      },
    ],
  });

  let grossFils = 0;
  let refundsFils = 0;

  const byMethod: Record<
    number,
    {
      methodId: number;
      code: string;
      name: string;
      salesFils: number;
      refundsFils: number;
    }
  > = {};

  for (const p of payments as any[]) {
    const m = p.PaymentMethod;
    if (!m) continue;

    if (!byMethod[m.id]) {
      byMethod[m.id] = {
        methodId: m.id,
        code: m.code,
        name: m.nameEn,
        salesFils: 0,
        refundsFils: 0,
      };
    }

    const amt = Number(p.amountFils || 0);

    if (amt >= 0) {
      grossFils += amt;
      byMethod[m.id].salesFils += amt;
    } else {
      const r = Math.abs(amt);
      refundsFils += r;
      byMethod[m.id].refundsFils += r;
    }
  }

  // =========================
  // Commissions
  // =========================
  const orderWhere: any = { status: "paid" };
  if ("shiftSessionId" in args) orderWhere.shiftSessionId = args.shiftSessionId;
  else orderWhere.createdAt = { [Op.gte]: args.from, [Op.lte]: args.to };

  if (args.cashierId) orderWhere.createdBy = args.cashierId;

  const items = await OrderItem.findAll({
    include: [
      {
        model: Order,
        required: true,
        where: orderWhere,
      },
      { model: Staff },
      { model: Service },
    ],
  });

  const commissionsByStaff: Record<
    number,
    { staffId: number; staffName: string; commissionFils: number }
  > = {};

  let totalCommissionFils = 0;

  for (const it of items as any[]) {
    if (it.lineType !== "service" || !it.staffId) continue;

    const staff = it.Staff;
    const service = it.Service;

    const percent = (service?.commissionPercent ??
      staff?.commissionPercent ??
      0) as number;

    if (!percent || percent <= 0) continue;

    const lineTotal = Number(it.totalPriceFils || 0);
    const commission = Math.floor((lineTotal * percent) / 100);

    totalCommissionFils += commission;

    if (!commissionsByStaff[it.staffId]) {
      commissionsByStaff[it.staffId] = {
        staffId: it.staffId,
        staffName: staff?.displayName ?? `Staff #${it.staffId}`,
        commissionFils: 0,
      };
    }

    commissionsByStaff[it.staffId].commissionFils += commission;
  }

  // =========================
  // Packages: sessions used + redeemed value placeholder
  // =========================

  // A) sessions used
  let sessionsUsed = 0;

  if ("shiftSessionId" in args) {
    const rows = (await PackageUsage.findAll({
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
              required: true,
              attributes: [],
              where: { shiftSessionId: args.shiftSessionId },
            },
          ],
        },
      ],
      raw: true,
    })) as unknown as Array<{ sessionsUsed: string | number }>;

    sessionsUsed = Number(rows?.[0]?.sessionsUsed ?? 0) || 0;
  } else {
    const rows = (await PackageUsage.findAll({
      attributes: [[fn("SUM", col("qty")), "sessionsUsed"]],
      where: { usedAt: { [Op.gte]: args.from, [Op.lte]: args.to } },
      raw: true,
    })) as unknown as Array<{ sessionsUsed: string | number }>;

    sessionsUsed = Number(rows?.[0]?.sessionsUsed ?? 0) || 0;
  }

  // B) redeemed value placeholder
  // delivered via package: sum(unitPriceFils * coveredQty) for SERVICE items
  let redeemedValueFils = 0;

  for (const it of items as any[]) {
    if (it.lineType !== "service") continue;
    const coveredQty = Number(it.coveredQty || 0);
    if (coveredQty > 0) {
      redeemedValueFils += Number(it.unitPriceFils || 0) * coveredQty;
    }
  }

  const netFils = grossFils - refundsFils;
  const recognizedRevenuePlaceholderFils = netFils + redeemedValueFils;

  return {
    sales: {
      grossFils,
      refundsFils,
      netFils,
    },
    paymentsByMethod: Object.values(byMethod).map((m) => ({
      ...m,
      netFils: m.salesFils - m.refundsFils,
    })),

    packages: {
      sessionsUsed,
      redeemedValueFils,
    },

    recognizedRevenuePlaceholder: {
      cashNetSalesFils: netFils,
      packageRedeemedValueFils: redeemedValueFils,
      recognizedFils: recognizedRevenuePlaceholderFils,
      note: "Placeholder for deferred revenue. Package sales recognition will be implemented later.",
    },

    commissions: {
      totalCommissionFils,
      byStaff: Object.values(commissionsByStaff),
    },
  };
};
