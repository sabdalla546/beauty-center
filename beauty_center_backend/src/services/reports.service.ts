import { Op } from "sequelize";
import {
  Appointment,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
  ShiftSession,
} from "../models";
import { filsToKwd } from "../utils/money";

export type ReportGroupBy = "day" | "month" | "year";

type DateInput = string | null | undefined;

const n = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const kwd = (value: unknown) => filsToKwd(n(value));

const asDate = (value?: DateInput) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const range = (column: string, from?: DateInput, to?: DateInput) => {
  const fromDate = asDate(from);
  const toDate = asDate(to);
  if (!fromDate && !toDate) return undefined;

  const where: Record<symbol, Date> = {} as Record<symbol, Date>;
  if (fromDate) where[Op.gte] = fromDate;
  if (toDate) where[Op.lte] = toDate;
  return { [column]: where };
};
const groupPeriod = (value: Date | string, groupBy: ReportGroupBy) => {
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  if (groupBy === "year") return String(y);
  if (groupBy === "month") return String(y) + "-" + m;
  return String(y) + "-" + m + "-" + d;
};

const sortPeriods = <T extends { period: string }>(rows: T[]) =>
  rows.sort((a, b) => a.period.localeCompare(b.period));

export async function getOverviewReport(filters: {
  from?: DateInput;
  to?: DateInput;
  shiftId?: number | null;
}) {
  const orderWhere: any = { ...range("createdAt", filters.from, filters.to) };
  const paymentWhere: any = { ...range("createdAt", filters.from, filters.to), status: "completed" };
  const appointmentWhere: any = { ...range("startAt", filters.from, filters.to) };
  if (filters.shiftId) {
    orderWhere.shiftSessionId = Number(filters.shiftId);
    paymentWhere.shiftSessionId = Number(filters.shiftId);
  }

  const [orders, payments, appointments] = await Promise.all([
    Order.findAll({ where: orderWhere, raw: true }),
    Payment.findAll({ where: paymentWhere, raw: true }),
    Appointment.findAll({ where: appointmentWhere, raw: true }),
  ]);

  const activeOrders = (orders as any[]).filter((row) => row.status !== "cancelled");
  const grossSalesFils = (payments as any[])
    .filter((row) => n(row.amountFils) > 0)
    .reduce((sum, row) => sum + n(row.amountFils), 0);
  const refundsFils = (payments as any[])
    .filter((row) => n(row.amountFils) < 0)
    .reduce((sum, row) => sum + Math.abs(n(row.amountFils)), 0);
  const orderTotalFils = activeOrders.reduce((sum, row: any) => sum + n(row.totalFils), 0);
  const uniqueCustomersCount = new Set(
    activeOrders.map((row: any) => row.customerId).filter((id) => id != null),
  ).size;

  return {
    filters: { from: filters.from ?? null, to: filters.to ?? null, shiftId: filters.shiftId ?? null },
    kpis: {
      ordersCount: (orders as any[]).length,
      activeOrdersCount: activeOrders.length,
      paymentsCount: (payments as any[]).length,
      appointmentsCount: (appointments as any[]).length,
      uniqueCustomersCount,
      grossSalesFils, grossSalesKwd: kwd(grossSalesFils),
      refundsFils, refundsKwd: kwd(refundsFils),
      netSalesFils: grossSalesFils - refundsFils,
      netSalesKwd: kwd(grossSalesFils - refundsFils),
      orderTotalFils, orderTotalKwd: kwd(orderTotalFils),
      averageOrderValueFils: activeOrders.length ? Math.round(orderTotalFils / activeOrders.length) : 0,
      averageOrderValueKwd: kwd(activeOrders.length ? Math.round(orderTotalFils / activeOrders.length) : 0),
    },
  };
}

export async function getSalesReport(filters: { from?: DateInput; to?: DateInput; shiftId?: number | null; groupBy: ReportGroupBy; }) {
  const orderWhere: any = { ...range("createdAt", filters.from, filters.to) };
  if (filters.shiftId) orderWhere.shiftSessionId = Number(filters.shiftId);

  const [orders, items] = await Promise.all([
    Order.findAll({ where: orderWhere, raw: true }),
    OrderItem.findAll({
      raw: true,
      nest: true,
      include: [{ model: Order, as: "order", required: true, where: orderWhere }],
    }),
  ]);

  const activeOrders = (orders as any[]).filter((row) => row.status !== "cancelled");
  const timeline = new Map<string, { period: string; ordersCount: number; totalFils: number }>();
  for (const row of activeOrders) {
    const period = groupPeriod((row as any).createdAt, filters.groupBy);
    const bucket = timeline.get(period) ?? { period, ordersCount: 0, totalFils: 0 };
    bucket.ordersCount += 1;
    bucket.totalFils += n((row as any).totalFils);
    timeline.set(period, bucket);
  }

  const byLineType = Object.entries((items as any[]).reduce((acc: Record<string, { quantity: number; totalFils: number }>, row: any) => {
    if (row.order?.status === "cancelled") return acc;
    const key = String(row.lineType || "unknown");
    acc[key] = acc[key] || { quantity: 0, totalFils: 0 };
    acc[key].quantity += n(row.quantity);
    acc[key].totalFils += n(row.totalPriceFils);
    return acc;
  }, {})).map(([lineType, value]) => ({
    lineType, quantity: value.quantity, totalFils: value.totalFils, totalKwd: kwd(value.totalFils),
  }));

  const totalFils = activeOrders.reduce((sum, row: any) => sum + n(row.totalFils), 0);
  return {
    filters: { from: filters.from ?? null, to: filters.to ?? null, shiftId: filters.shiftId ?? null, groupBy: filters.groupBy },
    summary: { ordersCount: activeOrders.length, totalFils, totalKwd: kwd(totalFils) },
    timeline: sortPeriods(Array.from(timeline.values()).map((row) => ({ ...row, totalKwd: kwd(row.totalFils) }))),
    byLineType,
  };
}

export async function getPaymentsReport(filters: {
  from?: DateInput;
  to?: DateInput;
  shiftId?: number | null;
  paymentMethodId?: number | null;
  groupBy: ReportGroupBy;
}) {
  const where: any = { ...range("createdAt", filters.from, filters.to), status: "completed" };
  if (filters.shiftId) where.shiftSessionId = Number(filters.shiftId);
  if (filters.paymentMethodId) where.methodId = Number(filters.paymentMethodId);

  const payments = await Payment.findAll({
    where, raw: true, nest: true,
    include: [{ model: PaymentMethod, as: "method", attributes: ["id", "code", "nameEn", "nameAr"] }],
  });

  const timeline = new Map<string, { period: string; paymentsCount: number; netSalesFils: number }>();
  const byMethod = new Map<string, { methodId: number | null; methodCode: string; methodNameEn: string; methodNameAr: string; paymentsCount: number; grossSalesFils: number; refundsFils: number; netSalesFils: number }>();
  let grossSalesFils = 0;
  let refundsFils = 0;

  for (const row of payments as any[]) {
    const amountFils = n(row.amountFils);
    const period = groupPeriod(row.createdAt, filters.groupBy);
    const periodBucket = timeline.get(period) ?? { period, paymentsCount: 0, netSalesFils: 0 };
    periodBucket.paymentsCount += 1;
    periodBucket.netSalesFils += amountFils;
    timeline.set(period, periodBucket);

    const methodCode = String(row.method?.code || "unknown");
    const methodBucket = byMethod.get(methodCode) ?? {
      methodId: row.method?.id ? Number(row.method.id) : null,
      methodCode,
      methodNameEn: String(row.method?.nameEn || methodCode),
      methodNameAr: String(row.method?.nameAr || methodCode),
      paymentsCount: 0, grossSalesFils: 0, refundsFils: 0, netSalesFils: 0,
    };
    methodBucket.paymentsCount += 1;
    methodBucket.netSalesFils += amountFils;
    if (amountFils >= 0) {
      grossSalesFils += amountFils;
      methodBucket.grossSalesFils += amountFils;
    } else {
      refundsFils += Math.abs(amountFils);
      methodBucket.refundsFils += Math.abs(amountFils);
    }
    byMethod.set(methodCode, methodBucket);
  }

  return {
    filters: { from: filters.from ?? null, to: filters.to ?? null, shiftId: filters.shiftId ?? null, paymentMethodId: filters.paymentMethodId ?? null, groupBy: filters.groupBy },
    summary: {
      paymentsCount: (payments as any[]).length,
      grossSalesFils, grossSalesKwd: kwd(grossSalesFils),
      refundsFils, refundsKwd: kwd(refundsFils),
      netSalesFils: grossSalesFils - refundsFils, netSalesKwd: kwd(grossSalesFils - refundsFils),
    },
    timeline: sortPeriods(Array.from(timeline.values()).map((row) => ({ ...row, netSalesKwd: kwd(row.netSalesFils) }))),
    byMethod: Array.from(byMethod.values()).map((row) => ({
      ...row, grossSalesKwd: kwd(row.grossSalesFils), refundsKwd: kwd(row.refundsFils), netSalesKwd: kwd(row.netSalesFils),
    })),
  };
}

export async function getShiftsReport(filters: { from?: DateInput; to?: DateInput; status?: "open" | "closed" | null; }) {
  const where: any = { ...range("openedAt", filters.from, filters.to) };
  if (filters.status) where.status = filters.status;

  const shifts = await ShiftSession.findAll({ where, raw: true });
  const shiftIds = (shifts as any[]).map((row) => Number(row.id)).filter(Boolean);
  const payments = shiftIds.length
    ? await Payment.findAll({
        where: { status: "completed", shiftSessionId: { [Op.in]: shiftIds } },
        raw: true, nest: true,
        include: [{ model: PaymentMethod, as: "method", attributes: ["code"] }],
      })
    : [];

  const paymentsByShift = new Map<number, { grossSalesFils: number; refundsFils: number; cashSalesFils: number; cashRefundsFils: number }>();
  for (const row of payments as any[]) {
    const shiftId = Number(row.shiftSessionId || 0);
    const bucket = paymentsByShift.get(shiftId) ?? { grossSalesFils: 0, refundsFils: 0, cashSalesFils: 0, cashRefundsFils: 0 };
    const amountFils = n(row.amountFils);
    const methodCode = String(row.method?.code || "");
    if (amountFils >= 0) {
      bucket.grossSalesFils += amountFils;
      if (methodCode === "cash") bucket.cashSalesFils += amountFils;
    } else {
      bucket.refundsFils += Math.abs(amountFils);
      if (methodCode === "cash") bucket.cashRefundsFils += Math.abs(amountFils);
    }
    paymentsByShift.set(shiftId, bucket);
  }

  const items = (shifts as any[]).map((row) => {
    const agg = paymentsByShift.get(Number(row.id)) ?? { grossSalesFils: 0, refundsFils: 0, cashSalesFils: 0, cashRefundsFils: 0 };
    const expectedCashFils = row.expectedCashFils != null ? n(row.expectedCashFils) : n(row.openingCashFils) + agg.cashSalesFils - agg.cashRefundsFils;
    const closingCashFils = n(row.closingCashFils);
    const netSalesFils = agg.grossSalesFils - agg.refundsFils;
    return {
      id: Number(row.id), userId: Number(row.userId), status: String(row.status), openedAt: row.openedAt, closedAt: row.closedAt,
      openingCashFils: n(row.openingCashFils), openingCashKwd: kwd(row.openingCashFils),
      closingCashFils, closingCashKwd: kwd(closingCashFils),
      expectedCashFils, expectedCashKwd: kwd(expectedCashFils),
      varianceFils: closingCashFils - expectedCashFils, varianceKwd: kwd(closingCashFils - expectedCashFils),
      grossSalesFils: agg.grossSalesFils, grossSalesKwd: kwd(agg.grossSalesFils),
      refundsFils: agg.refundsFils, refundsKwd: kwd(agg.refundsFils),
      netSalesFils, netSalesKwd: kwd(netSalesFils),
    };
  });

  const summary = items.reduce((acc, row) => ({
    shiftsCount: acc.shiftsCount + 1,
    openShiftsCount: acc.openShiftsCount + (row.status === "open" ? 1 : 0),
    closedShiftsCount: acc.closedShiftsCount + (row.status === "closed" ? 1 : 0),
    grossSalesFils: acc.grossSalesFils + row.grossSalesFils,
    refundsFils: acc.refundsFils + row.refundsFils,
    netSalesFils: acc.netSalesFils + row.netSalesFils,
    openingCashFils: acc.openingCashFils + row.openingCashFils,
    closingCashFils: acc.closingCashFils + row.closingCashFils,
    expectedCashFils: acc.expectedCashFils + row.expectedCashFils,
    varianceFils: acc.varianceFils + row.varianceFils,
  }), {
    shiftsCount: 0, openShiftsCount: 0, closedShiftsCount: 0, grossSalesFils: 0, refundsFils: 0, netSalesFils: 0, openingCashFils: 0, closingCashFils: 0, expectedCashFils: 0, varianceFils: 0,
  });

  return {
    filters: { from: filters.from ?? null, to: filters.to ?? null, status: filters.status ?? null },
    summary: { ...summary,
      grossSalesKwd: kwd(summary.grossSalesFils), refundsKwd: kwd(summary.refundsFils), netSalesKwd: kwd(summary.netSalesFils),
      openingCashKwd: kwd(summary.openingCashFils), closingCashKwd: kwd(summary.closingCashFils),
      expectedCashKwd: kwd(summary.expectedCashFils), varianceKwd: kwd(summary.varianceFils),
    },
    items,
  };
}

export async function getAppointmentsReport(filters: {
  from?: DateInput;
  to?: DateInput;
  groupBy: ReportGroupBy;
  staffId?: number | null;
  roomId?: number | null;
  serviceId?: number | null;
}) {
  const { Room, Service, Staff } = await import("../models");
  const where: any = { ...range("startAt", filters.from, filters.to) };
  if (filters.staffId) where.staffId = Number(filters.staffId);
  if (filters.roomId) where.roomId = Number(filters.roomId);
  if (filters.serviceId) where.serviceId = Number(filters.serviceId);

  const rows = await Appointment.findAll({
    where, raw: true, nest: true,
    include: [
      { model: Staff, as: "staff", attributes: ["id", "displayName"] },
      { model: Room, as: "room", attributes: ["id", "name"] },
      { model: Service, as: "service", attributes: ["id", "name"] },
    ],
  });

  const byStatus = Object.entries((rows as any[]).reduce((acc: Record<string, number>, row: any) => {
    const key = String(row.status || "unknown");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([status, count]) => ({ status, count }));

  const timeline = new Map<string, { period: string; appointmentsCount: number }>();
  for (const row of rows as any[]) {
    const period = groupPeriod(row.startAt, filters.groupBy);
    const bucket = timeline.get(period) ?? { period, appointmentsCount: 0 };
    bucket.appointmentsCount += 1;
    timeline.set(period, bucket);
  }

  const byStaff = Object.entries((rows as any[]).reduce((acc: Record<string, { staffId: number | null; staffName: string; appointmentsCount: number }>, row: any) => {
    const key = row.staff?.id ? String(row.staff.id) : "unassigned";
    acc[key] = acc[key] || { staffId: row.staff?.id ? Number(row.staff.id) : null, staffName: String(row.staff?.displayName || "Unassigned"), appointmentsCount: 0 };
    acc[key].appointmentsCount += 1;
    return acc;
  }, {})).map(([, value]) => value);

  const byRoom = Object.entries((rows as any[]).reduce((acc: Record<string, { roomId: number | null; roomName: string; appointmentsCount: number }>, row: any) => {
    const key = row.room?.id ? String(row.room.id) : "unassigned";
    acc[key] = acc[key] || { roomId: row.room?.id ? Number(row.room.id) : null, roomName: String(row.room?.name || "Unassigned"), appointmentsCount: 0 };
    acc[key].appointmentsCount += 1;
    return acc;
  }, {})).map(([, value]) => value);

  const byService = Object.entries((rows as any[]).reduce((acc: Record<string, { serviceId: number | null; serviceName: string; appointmentsCount: number }>, row: any) => {
    const key = row.service?.id ? String(row.service.id) : "unknown";
    acc[key] = acc[key] || { serviceId: row.service?.id ? Number(row.service.id) : null, serviceName: String(row.service?.name || "Unknown"), appointmentsCount: 0 };
    acc[key].appointmentsCount += 1;
    return acc;
  }, {})).map(([, value]) => value);

  return {
    filters: { from: filters.from ?? null, to: filters.to ?? null, groupBy: filters.groupBy, staffId: filters.staffId ?? null, roomId: filters.roomId ?? null, serviceId: filters.serviceId ?? null },
    summary: { appointmentsCount: (rows as any[]).length },
    byStatus,
    timeline: sortPeriods(Array.from(timeline.values())),
    byStaff, byRoom, byService,
  };
}

export async function getInventoryReport(filters: {
  from?: DateInput;
  to?: DateInput;
  groupBy: ReportGroupBy;
  productId?: number | null;
  reason?: string | null;
}) {
  const { Product, StockMovement } = await import("../models");
  const movementWhere: any = { ...range("createdAt", filters.from, filters.to) };
  if (filters.productId) movementWhere.productId = Number(filters.productId);
  if (filters.reason) movementWhere.reason = filters.reason;

  const [movements, soldItems, lowStockProducts] = await Promise.all([
    StockMovement.findAll({
      where: movementWhere, raw: true, nest: true,
      include: [{ model: Product, as: "product", attributes: ["id", "name", "sku", "currentQty"] }],
    }),
    OrderItem.findAll({
      raw: true, nest: true,
      where: { lineType: "product", ...(filters.productId ? { referenceId: Number(filters.productId) } : {}) },
      include: [
        { model: Order, as: "order", required: true, where: { ...range("createdAt", filters.from, filters.to), status: { [Op.ne]: "cancelled" } } },
        { model: Product, as: "product", attributes: ["id", "name", "sku", "currentQty"] },
      ],
    }),
    Product.findAll({ raw: true, where: filters.productId ? { id: Number(filters.productId) } : undefined, order: [["currentQty", "ASC"]], limit: filters.productId ? undefined : 10 }),
  ]);

  const stockInQty = (movements as any[]).filter((row) => n(row.change) > 0).reduce((sum, row) => sum + n(row.change), 0);
  const stockOutQty = (movements as any[]).filter((row) => n(row.change) < 0).reduce((sum, row) => sum + Math.abs(n(row.change)), 0);
  const timeline = new Map<string, { period: string; movementCount: number; netChangeQty: number }>();
  for (const row of movements as any[]) {
    const period = groupPeriod(row.createdAt, filters.groupBy);
    const bucket = timeline.get(period) ?? { period, movementCount: 0, netChangeQty: 0 };
    bucket.movementCount += 1;
    bucket.netChangeQty += n(row.change);
    timeline.set(period, bucket);
  }

  const byReason = Object.entries((movements as any[]).reduce((acc: Record<string, { reason: string; movementCount: number; netChangeQty: number }>, row: any) => {
    const key = String(row.reason || "unknown");
    acc[key] = acc[key] || { reason: key, movementCount: 0, netChangeQty: 0 };
    acc[key].movementCount += 1;
    acc[key].netChangeQty += n(row.change);
    return acc;
  }, {})).map(([, value]) => value);

  const topSellingProducts = Object.entries((soldItems as any[]).reduce((acc: Record<string, { productId: number | null; productName: string; sku: string | null; soldQty: number; soldRevenueFils: number; currentQty: number }>, row: any) => {
    const key = row.product?.id ? String(row.product.id) : String(row.referenceId || "unknown");
    acc[key] = acc[key] || { productId: row.product?.id ? Number(row.product.id) : null, productName: String(row.product?.name || row.description || "Unknown"), sku: row.product?.sku ?? null, soldQty: 0, soldRevenueFils: 0, currentQty: n(row.product?.currentQty) };
    acc[key].soldQty += n(row.quantity);
    acc[key].soldRevenueFils += n(row.totalPriceFils);
    return acc;
  }, {})).map(([, value]) => ({ ...value, soldRevenueKwd: kwd(value.soldRevenueFils) }))
    .sort((a, b) => b.soldQty - a.soldQty);

  const soldQty = (soldItems as any[]).reduce((sum, row) => sum + n(row.quantity), 0);
  const soldRevenueFils = (soldItems as any[]).reduce((sum, row) => sum + n(row.totalPriceFils), 0);
  const lowStockThreshold = 5;
  const lowStock = (lowStockProducts as any[]).filter((row) => n(row.currentQty) <= lowStockThreshold);

  return {
    filters: { from: filters.from ?? null, to: filters.to ?? null, groupBy: filters.groupBy, productId: filters.productId ?? null, reason: filters.reason ?? null },
    summary: {
      movementCount: (movements as any[]).length,
      stockInQty, stockOutQty, netChangeQty: stockInQty - stockOutQty,
      soldQty, soldRevenueFils, soldRevenueKwd: kwd(soldRevenueFils),
      lowStockThreshold, lowStockCount: lowStock.length,
    },
    timeline: sortPeriods(Array.from(timeline.values())),
    byReason,
    topSellingProducts,
    lowStockProducts: lowStock,
  };
}


export async function getPackagesReport(filters: {
  from?: DateInput;
  to?: DateInput;
  groupBy: ReportGroupBy;
  planId?: number | null;
  status?: string | null;
  serviceId?: number | null;
}) {
  const { CustomerPackage, PackagePlan, PackageUsage, Service } = await import("../models");
  const soldWhere: any = { ...range("createdAt", filters.from, filters.to) };
  const usageWhere: any = { ...range("usedAt", filters.from, filters.to) };
  if (filters.planId) soldWhere.planId = Number(filters.planId);
  if (filters.status) soldWhere.status = filters.status;
  if (filters.serviceId) usageWhere.serviceId = Number(filters.serviceId);

  const [customerPackages, usages] = await Promise.all([
    CustomerPackage.findAll({
      where: soldWhere, raw: true, nest: true,
      include: [{ model: PackagePlan, as: "plan", attributes: ["id", "name", "serviceId", "sessionsCount", "validDays"] }],
    }),
    PackageUsage.findAll({ where: usageWhere, raw: true, nest: true }),
  ]);

  const services = await Service.findAll({
    raw: true,
    where: (usages as any[]).length
      ? { id: { [Op.in]: Array.from(new Set((usages as any[]).map((row: any) => row.serviceId).filter(Boolean))) } }
      : undefined,
  });
  const serviceMap = new Map((services as any[]).map((row: any) => [String(row.id), row.name]));

  const byStatus = Object.entries((customerPackages as any[]).reduce((acc: Record<string, number>, row: any) => {
    const key = String(row.status || "unknown");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([status, count]) => ({ status, count }));

  const usageTimeline = new Map<string, { period: string; usagesCount: number; sessionsUsed: number; usedValueFils: number }>();
  for (const row of usages as any[]) {
    const period = groupPeriod(row.usedAt, filters.groupBy);
    const bucket = usageTimeline.get(period) ?? { period, usagesCount: 0, sessionsUsed: 0, usedValueFils: 0 };
    bucket.usagesCount += 1;
    bucket.sessionsUsed += n(row.qty);
    bucket.usedValueFils += n(row.amountFils);
    usageTimeline.set(period, bucket);
  }

  const byPlan = Object.entries((customerPackages as any[]).reduce((acc: Record<string, { planId: number | null; planName: string; soldCount: number; totalValueFils: number; totalSessions: number; usedSessions: number }>, row: any) => {
    const key = row.plan?.id ? String(row.plan.id) : String(row.planId || "unknown");
    acc[key] = acc[key] || { planId: row.plan?.id ? Number(row.plan.id) : null, planName: String(row.plan?.name || "Unknown"), soldCount: 0, totalValueFils: 0, totalSessions: 0, usedSessions: 0 };
    acc[key].soldCount += 1;
    acc[key].totalValueFils += n(row.totalValueFils);
    acc[key].totalSessions += n(row.totalSessions);
    acc[key].usedSessions += n(row.usedSessions);
    return acc;
  }, {})).map(([, value]) => ({ ...value, totalValueKwd: kwd(value.totalValueFils) }));

  const byService = Object.entries((usages as any[]).reduce((acc: Record<string, { serviceId: number | null; serviceName: string; usagesCount: number; sessionsUsed: number; usedValueFils: number }>, row: any) => {
    const key = row.serviceId ? String(row.serviceId) : "unknown";
    acc[key] = acc[key] || { serviceId: row.serviceId ? Number(row.serviceId) : null, serviceName: String(serviceMap.get(key) || "Unknown"), usagesCount: 0, sessionsUsed: 0, usedValueFils: 0 };
    acc[key].usagesCount += 1;
    acc[key].sessionsUsed += n(row.qty);
    acc[key].usedValueFils += n(row.amountFils);
    return acc;
  }, {})).map(([, value]) => ({ ...value, usedValueKwd: kwd(value.usedValueFils) }));

  const soldValueFils = (customerPackages as any[]).reduce((sum, row) => sum + n(row.totalValueFils), 0);
  const usedValueFils = (usages as any[]).reduce((sum, row) => sum + n(row.amountFils), 0);
  const totalSessions = (customerPackages as any[]).reduce((sum, row) => sum + n(row.totalSessions), 0);
  const usedSessions = (usages as any[]).reduce((sum, row) => sum + n(row.qty), 0);

  return {
    filters: { from: filters.from ?? null, to: filters.to ?? null, groupBy: filters.groupBy, planId: filters.planId ?? null, status: filters.status ?? null, serviceId: filters.serviceId ?? null },
    summary: {
      packagesSoldCount: (customerPackages as any[]).length,
      soldValueFils, soldValueKwd: kwd(soldValueFils),
      usedValueFils, usedValueKwd: kwd(usedValueFils),
      remainingValueFils: soldValueFils - usedValueFils, remainingValueKwd: kwd(soldValueFils - usedValueFils),
      totalSessions, usedSessions, remainingSessions: totalSessions - usedSessions,
    },
    byStatus,
    usageTimeline: sortPeriods(Array.from(usageTimeline.values()).map((row) => ({ ...row, usedValueKwd: kwd(row.usedValueFils) }))),
    byPlan,
    byService,
  };
}
