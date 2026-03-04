import { Op, Transaction } from "sequelize";
import { CustomerPackage, PackagePlan, PackageUsage } from "../models";

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
      usedSessions: {
        [Op.lt]: (CustomerPackage as any).sequelize!.col("total_sessions"),
      },
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
  if (!pkg) throw new Error("CustomerPackage not found");

  const remaining = pkg.totalSessions - pkg.usedSessions;
  if (remaining <= 0) throw new Error("Package has no remaining sessions");
  if (pkg.expiresAt < now) throw new Error("Package expired");

  const used = Math.min(qty, remaining);

  await PackageUsage.create(
    {
      customerPackageId,
      appointmentId,
      orderItemId,
      serviceId,
      qty: used,
      usedAt: now,
      createdBy: userId,
    },
    { transaction },
  );

  pkg.usedSessions += used;

  if (pkg.usedSessions >= pkg.totalSessions) {
    pkg.status = "used_up";
  }

  await pkg.save({ transaction });

  return { used, remainingAfter: pkg.totalSessions - pkg.usedSessions };
}
