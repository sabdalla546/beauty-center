import { Op, Transaction } from "sequelize";
import { AppError } from "../errors/AppError";
import {
  CustomerPackage,
  OrderItem,
  PackagePlan,
  PackageUsage,
} from "../models";

/**
 * Find active package that can cover a specific service.
 * ✅ Now balance-based (FILS), NOT sessions-based.
 */
export async function findActivePackageForService(params: {
  customerId: number;
  serviceId: number;
  now: Date;
  transaction: Transaction;
}) {
  const { customerId, serviceId, now, transaction } = params;

  return CustomerPackage.findOne({
    where: {
      customerId,
      status: "active",
      expiresAt: { [Op.gte]: now },
      // ✅ balance remaining
      [Op.and]: [
        (CustomerPackage as any).sequelize!.where(
          (CustomerPackage as any).sequelize!.literal(
            "total_value_fils - used_value_fils",
          ),
          { [Op.gt]: 0 },
        ),
      ],
    },
    include: [
      {
        model: PackagePlan,
        as: "plan",
        required: true,
        where: {
          isActive: true,
          [Op.or]: [{ serviceId: null }, { serviceId }],
        },
      },
    ],
    order: [["expiresAt", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

/**
 * Apply package balance to an order (session = 1 order).
 * ✅ Covers SERVICES only (lineType="service").
 * ✅ Writes PackageUsage ledger per service line.
 * ✅ Updates OrderItems: coveredAmountFils / uncoveredAmountFils
 * ✅ Updates CustomerPackage.usedValueFils and status when depleted.
 */
export async function applyPackageToOrderTx(params: {
  customerId: number;
  orderId: number;
  userId: number | null;
  now: Date;
  transaction: Transaction;
}) {
  const { customerId, orderId, userId = null, now, transaction } = params;

  // 1) load service items of this order (lock)
  const items = await OrderItem.findAll({
    where: { orderId, lineType: "service" },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!items.length) {
    return { applied: false, coveredFils: 0, customerPackageId: null as any };
  }

  // ✅ Prevent double-apply (partial pay / retry / double click)
  const alreadyApplied = items.some(
    (it: any) =>
      Number(it.coveredAmountFils || 0) > 0 || !!it.coveredByCustomerPackageId,
  );
  if (alreadyApplied) {
    return { applied: false, coveredFils: 0, customerPackageId: null as any };
  }

  const serviceIds = Array.from(
    new Set(
      items.map((it: any) => Number(it.referenceId || 0)).filter(Boolean),
    ),
  );

  // 2) find one active package that matches ANY service in this session
  const pkg = await CustomerPackage.findOne({
    where: {
      customerId,
      status: "active",
      expiresAt: { [Op.gte]: now },
      // ✅ balance remaining
      [Op.and]: [
        (CustomerPackage as any).sequelize!.where(
          (CustomerPackage as any).sequelize!.literal(
            "total_value_fils - used_value_fils",
          ),
          { [Op.gt]: 0 },
        ),
      ],
    },
    include: [
      {
        model: PackagePlan,
        as: "plan",
        required: true,
        where: {
          isActive: true,
          [Op.or]: [
            { serviceId: null },
            { serviceId: { [Op.in]: serviceIds } },
          ],
        },
      },
    ],
    order: [["expiresAt", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!pkg) {
    return { applied: false, coveredFils: 0, customerPackageId: null as any };
  }

  const totalValueFils = Number((pkg as any).totalValueFils || 0);
  const usedValueFils = Number((pkg as any).usedValueFils || 0);
  let remaining = Math.max(0, totalValueFils - usedValueFils);

  if (remaining <= 0) {
    return { applied: false, coveredFils: 0, customerPackageId: null as any };
  }

  // 3) allocate remaining across service items (in order)
  let coveredTotal = 0;

  for (const it of items as any[]) {
    const lineTotal = Math.max(0, Number(it.totalPriceFils || 0));
    const cover = Math.min(lineTotal, remaining);
    const uncovered = lineTotal - cover;

    coveredTotal += cover;
    remaining -= cover;

    await it.update(
      {
        coveredByCustomerPackageId: Number((pkg as any).id),
        coveredAmountFils: cover,
        uncoveredAmountFils: uncovered,
      } as any,
      { transaction },
    );

    // usage ledger per service line
    await PackageUsage.create(
      {
        customerPackageId: Number((pkg as any).id),
        appointmentId: null,
        orderItemId: Number(it.id),
        serviceId: Number(it.referenceId),
        qty: 1,
        amountFils: cover, // ✅ required
        usedAt: now,
        createdBy: userId,
      } as any,
      { transaction },
    );

    if (remaining <= 0) break;
  }

  // 4) update pkg usedValueFils + status if depleted
  /*(pkg as any).usedValueFils = usedValueFils + coveredTotal;

  if (Number((pkg as any).usedValueFils) >= totalValueFils) {
    (pkg as any).status = "used_up";
  }

  await (pkg as any).save({ transaction });*/
  // 4) update pkg usedValueFils
  const newUsedValueFils = usedValueFils + coveredTotal;
  (pkg as any).usedValueFils = newUsedValueFils;

  // ✅ also update usedSessions proportionally to value usage
  const totalSessions = Math.max(0, Number((pkg as any).totalSessions || 0));

  let newUsedSessions = 0;
  if (totalValueFils > 0 && totalSessions > 0) {
    newUsedSessions = Math.floor(
      (newUsedValueFils * totalSessions) / totalValueFils,
    );
    newUsedSessions = Math.min(totalSessions, Math.max(0, newUsedSessions));
  }
  (pkg as any).usedSessions = newUsedSessions;

  // ✅ mark used_up when balance depleted
  if (newUsedValueFils >= totalValueFils) {
    (pkg as any).status = "used_up";
    (pkg as any).usedSessions = totalSessions; // ensure sessions ends too
  }

  await (pkg as any).save({ transaction });

  return {
    applied: true,
    coveredFils: coveredTotal,
    customerPackageId: Number((pkg as any).id),
  };
}

/**
 * Legacy sessions-based consumption.
 * ✅ Keep for appointments if you still use sessions logic elsewhere.
 * ✅ FIX: add amountFils to satisfy TS (0 for legacy).
 *
 * NOTE: POS should NOT call this anymore.
 */
export async function consumePackage(params: {
  customerPackageId: number;
  appointmentId?: number | null;
  orderItemId?: number | null;
  serviceId: number;
  qty: number;
  userId?: number | null;
  now: Date;
  transaction: Transaction;
}) {
  const {
    customerPackageId,
    appointmentId = null,
    orderItemId = null,
    serviceId,
    qty,
    userId = null,
    now,
    transaction,
  } = params;

  const pkg = await CustomerPackage.findByPk(customerPackageId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!pkg) throw new AppError("CustomerPackage not found", 404);

  const remaining =
    Number((pkg as any).totalSessions || 0) -
    Number((pkg as any).usedSessions || 0);
  if (remaining <= 0)
    throw new AppError("Package has no remaining sessions", 400);
  if ((pkg as any).expiresAt < now) throw new AppError("Package expired", 400);

  const used = Math.min(qty, remaining);

  await PackageUsage.create(
    {
      customerPackageId,
      appointmentId,
      orderItemId,
      serviceId,
      qty: used,
      amountFils: 0, // ✅ required by TS (legacy)
      usedAt: now,
      createdBy: userId,
    } as any,
    { transaction },
  );

  (pkg as any).usedSessions = Number((pkg as any).usedSessions || 0) + used;

  if (
    Number((pkg as any).usedSessions) >= Number((pkg as any).totalSessions || 0)
  ) {
    (pkg as any).status = "used_up";
  }

  await (pkg as any).save({ transaction });

  return {
    used,
    remainingAfter:
      Number((pkg as any).totalSessions || 0) -
      Number((pkg as any).usedSessions || 0),
  };
}
