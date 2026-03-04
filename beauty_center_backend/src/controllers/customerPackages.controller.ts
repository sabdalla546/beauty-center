import { Request, Response } from "express";
import { Op } from "sequelize";
import { AppError } from "../errors/AppError";
import { CustomerPackage, PackagePlan } from "../models";

const toBool = (v: any) => String(v).toLowerCase() === "true";

export const listCustomerPackages = async (req: Request, res: Response) => {
  const customerId = Number(req.params.customerId);
  if (!customerId)
    throw new AppError("Invalid customerId", 400, "common.invalid_id");

  const now = new Date();

  // ✅ POS defaults
  const onlyUsable = req.query.onlyUsable ? toBool(req.query.onlyUsable) : true;
  const includeInactive = req.query.includeInactive
    ? toBool(req.query.includeInactive)
    : false;

  const serviceId = req.query.serviceId ? Number(req.query.serviceId) : null;
  if (req.query.serviceId && (!serviceId || serviceId <= 0)) {
    throw new AppError("Invalid serviceId", 400, "common.invalid_id");
  }

  // base where
  const where: any = { customerId };

  if (includeInactive) {
    where.status = { [Op.in]: ["active", "used_up", "expired", "cancelled"] };
  } else {
    where.status = { [Op.in]: ["active", "used_up", "expired"] };
  }

  // include plan + optional service restriction filter
  const planWhere: any = {};
  if (serviceId) {
    // plan.serviceId null => allowed for any service
    // plan.serviceId = X => allowed only for that service
    planWhere[Op.or] = [{ serviceId: null }, { serviceId }];
  }

  const rows = await CustomerPackage.findAll({
    where,
    include: [
      {
        model: PackagePlan,
        as: "plan",
        required: true,
        ...(Object.keys(planWhere).length ? { where: planWhere } : {}),
      },
    ],
    order: [
      ["expiresAt", "ASC"],
      ["id", "DESC"],
    ],
  });

  const data = rows
    .map((r: any) => {
      const total = Number(r.totalSessions || 0);
      const used = Number(r.usedSessions || 0);
      const remaining = Math.max(0, total - used);

      const exp =
        r.expiresAt && new Date(r.expiresAt).getTime() < now.getTime();

      // NOTE: status may still be "active" but expired by time (until you run cron)
      const isExpired = Boolean(exp) || String(r.status) === "expired";

      const isUsable =
        String(r.status) === "active" && !isExpired && remaining > 0;

      return {
        ...(r.toJSON?.() ?? r),
        remainingSessions: remaining,
        isExpired,
        isUsable,
      };
    })
    .filter((x: any) => {
      if (!onlyUsable) return true;
      return x.isUsable;
    });

  return res.json({ data });
};
export const listUsableCustomerPackages = async (
  req: Request,
  res: Response,
) => {
  // force usable mode for POS
  (req as any).query.onlyUsable = "true";
  return listCustomerPackages(req, res);
};
