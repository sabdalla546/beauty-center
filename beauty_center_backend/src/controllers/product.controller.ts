// src/controllers/product.controller.ts
import { Request, Response } from "express";
import { Op } from "sequelize";
import path from "path";
import fs from "fs/promises";

import { asyncHandler } from "../middlewares/asyncHandler";
import { AppError } from "../errors/AppError";
import { sequelize } from "../db/db";

import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
} from "../validators/product";

import { Product, StockMovement } from "../models";
import { kwdToFils, filsToKwd } from "../utils/money";

/** =========================
 * Helpers
 ========================= */

const productUploadDir = path.join(process.cwd(), "uploads", "products");

const safeUnlink = async (filePath: string) => {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore
  }
};

const getBaseUrl = (req: Request) => {
  // supports proxies later (Cloudways/Nginx)
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}`;
};

const toProductDTO = (req: Request, row: any) => {
  const json = row?.toJSON ? row.toJSON() : row;

  const imagePath = json.image ? `/uploads/products/${json.image}` : null;
  const imageUrl = imagePath ? `${getBaseUrl(req)}${imagePath}` : null;

  return {
    ...json,
    costKwd: filsToKwd(Number(json.costFils ?? json.costCents ?? 0)),
    priceKwd: filsToKwd(Number(json.priceFils ?? json.priceCents ?? 0)),
    imageUrl,
    imagePath, // optional: keeps relative path too
  };
};

/** =========================
 * Controllers
 ========================= */

export const listProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const { q, barcode, sku, page = "1", limit = "20" } = req.query as any;

    const where: any = {};
    if (q) where.name = { [Op.like]: `%${String(q)}%` };
    if (barcode) where.barcode = String(barcode);
    if (sku) where.sku = String(sku);

    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));
    const offset = (p - 1) * l;

    const { rows, count } = await Product.findAndCountAll({
      where,
      order: [["id", "DESC"]],
      limit: l,
      offset,
    });

    res.json({
      data: rows.map((r: any) => toProductDTO(req, r)),
      meta: { total: count, page: p, limit: l, pages: Math.ceil(count / l) },
    });
  },
);

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const body = {
      ...req.body,
      costKwd:
        req.body.costKwd !== undefined ? Number(req.body.costKwd) : undefined,
      priceKwd:
        req.body.priceKwd !== undefined ? Number(req.body.priceKwd) : undefined,
      currentQty:
        req.body.currentQty !== undefined
          ? Number(req.body.currentQty)
          : undefined,
    };
    const parsed = createProductSchema.safeParse(body);

    // if validation fails and file uploaded => delete file
    if (!parsed.success) {
      if (req.file?.filename) {
        await safeUnlink(path.join(productUploadDir, req.file.filename));
      }
      return res.status(400).json({
        error: {
          message: req.t?.("product.invalid_input", "Invalid input"),
          details: parsed.error.flatten(),
        },
      });
    }

    const image = req.file ? req.file.filename : null;

    try {
      const row = await Product.create({
        sku: parsed.data.sku ?? null,
        name: parsed.data.name,
        barcode: parsed.data.barcode ?? null,

        costFils: kwdToFils(parsed.data.costKwd ?? 0),
        priceFils: kwdToFils(parsed.data.priceKwd ?? 0),

        currentQty: parsed.data.currentQty ?? 0,

        // ✅ store filename in DB
        image,
      } as any);

      res.status(201).json({ data: toProductDTO(req, row) });
    } catch (e: any) {
      // if DB create fails after file upload => delete uploaded image
      if (image) {
        await safeUnlink(path.join(productUploadDir, image));
      }

      throw new AppError(
        req.t?.("product.create_failed", "Failed to create product") ??
          "Failed to create product",
        500,
        "product.create_failed",
        e?.message,
      );
    }
  },
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const body = {
      ...req.body,
      costKwd:
        req.body.costKwd !== undefined ? Number(req.body.costKwd) : undefined,
      priceKwd:
        req.body.priceKwd !== undefined ? Number(req.body.priceKwd) : undefined,
      currentQty:
        req.body.currentQty !== undefined
          ? Number(req.body.currentQty)
          : undefined,
    };

    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      if (req.file?.filename) {
        await safeUnlink(path.join(productUploadDir, req.file.filename));
      }
      return res.status(400).json({
        error: {
          message: req.t?.("product.invalid_input", "Invalid input"),
          details: parsed.error.flatten(),
        },
      });
    }

    const row = await Product.findByPk(id);
    if (!row) {
      if (req.file?.filename) {
        await safeUnlink(path.join(productUploadDir, req.file.filename));
      }
      throw new AppError(
        req.t?.("product.not_found", "Product not found") ??
          "Product not found",
        404,
        "product.not_found",
      );
    }

    const patch: any = {};
    if (parsed.data.sku !== undefined) patch.sku = parsed.data.sku;
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.barcode !== undefined) patch.barcode = parsed.data.barcode;
    if (parsed.data.currentQty !== undefined)
      patch.currentQty = parsed.data.currentQty;

    if (parsed.data.costKwd !== undefined)
      patch.costFils = kwdToFils(parsed.data.costKwd);
    if (parsed.data.priceKwd !== undefined)
      patch.priceFils = kwdToFils(parsed.data.priceKwd);

    // ✅ update image (optional)
    if (req.file?.filename) {
      const oldImage = (row as any).image as string | null;
      patch.image = req.file.filename;

      await row.update(patch);

      // delete old file after successful update
      if (oldImage) {
        await safeUnlink(path.join(productUploadDir, oldImage));
      }

      return res.json({ data: toProductDTO(req, row) });
    }

    await row.update(patch);

    res.json({ data: toProductDTO(req, row) });
  },
);

export const adjustProductStock = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const parsed = adjustStockSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: req.t?.("stock.invalid_input", "Invalid input"),
          details: parsed.error.flatten(),
        },
      });
    }

    const t = await sequelize.transaction();
    try {
      const product = await Product.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!product) {
        throw new AppError(
          req.t?.("product.not_found", "Product not found") ??
            "Product not found",
          404,
          "product.not_found",
        );
      }

      const before = Number((product as any).currentQty ?? 0);
      const change = Number(parsed.data.change);
      const after = before + change;

      if (after < 0) {
        throw new AppError(
          req.t?.("stock.negative_not_allowed", "Stock cannot go negative") ??
            "Stock cannot go negative",
          400,
          "stock.negative_not_allowed",
          { before, change },
        );
      }

      await product.update({ currentQty: after } as any, { transaction: t });

      await StockMovement.create(
        {
          productId: (product as any).id,
          change,
          reason: parsed.data.reason,
          referenceId: parsed.data.referenceId ?? null,
          resultingQty: after,
          createdBy: (req as any).user?.id ?? null,
        } as any,
        { transaction: t },
      );

      await t.commit();

      res.json({
        data: {
          product: toProductDTO(req, product),
          before,
          after,
        },
      });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);
