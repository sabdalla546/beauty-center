import { Request, Response } from "express";
import { Op } from "sequelize";
import { PackageUsage, CustomerPackage, PackagePlan } from "../models";

export const listPackageUsages = async (req: Request, res: Response) => {
  const { customerId, dateFrom, dateTo } = req.query as any;

  const where: any = {};
  if (dateFrom)
    where.usedAt = {
      ...(where.usedAt || {}),
      [Op.gte]: new Date(String(dateFrom)),
    };
  if (dateTo)
    where.usedAt = {
      ...(where.usedAt || {}),
      [Op.lte]: new Date(String(dateTo)),
    };

  const include: any[] = [
    {
      model: CustomerPackage,
      as: "customerPackage",
      include: [{ model: PackagePlan, as: "plan" }],
    },
  ];

  if (customerId) {
    include[0].where = { customerId: Number(customerId) };
    include[0].required = true;
  }

  const rows = await PackageUsage.findAll({
    where,
    include,
    order: [["id", "DESC"]],
  });

  return res.json({ data: rows });
};
