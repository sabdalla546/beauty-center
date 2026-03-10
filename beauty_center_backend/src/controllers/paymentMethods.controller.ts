// src/controllers/paymentMethods.controller.ts
import { Request, Response } from "express";
import { PaymentMethod } from "../models";
import { AppError } from "../errors/AppError";
import { asyncHandler } from "../middlewares/asyncHandler";
import { ok } from "../utils/apiResponse";

export const listPaymentMethods = asyncHandler(
  async (_req: Request, res: Response) => {
    const rows = await PaymentMethod.findAll({ order: [["id", "ASC"]] });
    ok(res, rows);
  },
);

export const listActivePaymentMethods = asyncHandler(
  async (_req: Request, res: Response) => {
    const rows = await PaymentMethod.findAll({
      where: { isActive: true },
      order: [["id", "ASC"]],
    });
    ok(res, rows);
  },
);

export const createPaymentMethod = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, nameEn, nameAr, isActive } = req.body;

    if (!code || !nameEn || !nameAr) {
      throw new AppError("Missing fields", 400);
    }

    const exists = await PaymentMethod.findOne({ where: { code } });
    if (exists) throw new AppError("Payment method code already exists", 400);

    const row = await PaymentMethod.create({
      code,
      nameEn,
      nameAr,
      isActive: isActive ?? true,
    });

    ok(res, row, 201);
  },
);

export const updatePaymentMethod = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const row = await PaymentMethod.findByPk(id);
    if (!row) throw new AppError("Not found", 404);

    const { nameEn, nameAr, isActive } = req.body;
    if (nameEn !== undefined) row.nameEn = nameEn;
    if (nameAr !== undefined) row.nameAr = nameAr;
    if (isActive !== undefined) row.isActive = Boolean(isActive);

    await row.save();
    ok(res, row);
  },
);

export const deletePaymentMethod = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const row = await PaymentMethod.findByPk(id);
    if (!row) throw new AppError("Not found", 404);

    // safer: soft-disable instead of hard delete
    row.isActive = false;
    await row.save();

    ok(res, { message: "Disabled" });
  },
);
