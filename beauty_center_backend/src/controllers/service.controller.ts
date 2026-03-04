// src/controllers/service.controller.ts
import { Request, Response } from "express";
import { Op } from "sequelize";
import path from "path";
import fs from "fs/promises";

import { AppError } from "../errors/AppError";
import { asyncHandler } from "../middlewares/asyncHandler";

import { Service } from "../models/service.model";
import { RoomType } from "../models/roomType.model";

import {
  createServiceSchema,
  updateServiceSchema,
} from "../validators/service";

import { kwdToFils, filsToKwd } from "../utils/money";

/** =========================
 * Helpers
 ========================= */

const serviceUploadDir = path.join(process.cwd(), "uploads", "services");

const safeUnlink = async (filePath: string) => {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore
  }
};

const getBaseUrl = (req: Request) => {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  return `${proto}://${host}`;
};

const toServiceDTO = (req: Request, row: any) => {
  const json = row?.toJSON ? row.toJSON() : row;

  const imagePath = json.image ? `/uploads/services/${json.image}` : null;
  const imageUrl = imagePath ? `${getBaseUrl(req)}${imagePath}` : null;

  return {
    ...json,
    priceKwd: filsToKwd(Number(json.priceFils ?? 0)),
    imageUrl,
    imagePath,
  };
};

/** =========================
 * Controllers
 ========================= */

export const listServices = asyncHandler(
  async (req: Request, res: Response) => {
    const { requiredRoomTypeId, q } = req.query as any;

    const where: any = {};
    if (requiredRoomTypeId)
      where.requiredRoomTypeId = Number(requiredRoomTypeId);
    if (q) where.name = { [Op.like]: `%${String(q)}%` };

    const rows = await Service.findAll({
      where,
      include: [{ model: RoomType, as: "requiredRoomType", required: false }],
      order: [["id", "DESC"]],
    });

    res.json({ data: rows.map((r: any) => toServiceDTO(req, r)) });
  },
);

export const createService = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = createServiceSchema.safeParse(req.body);

    if (!parsed.success) {
      if (req.file?.filename) {
        await safeUnlink(path.join(serviceUploadDir, req.file.filename));
      }
      return res.status(400).json({
        error: {
          message: req.t?.("service.invalid_input", "Invalid input"),
          details: parsed.error.flatten(),
        },
      });
    }

    if (parsed.data.requiredRoomTypeId) {
      const rt = await RoomType.findByPk(parsed.data.requiredRoomTypeId);
      if (!rt) {
        if (req.file?.filename) {
          await safeUnlink(path.join(serviceUploadDir, req.file.filename));
        }
        throw new AppError("requiredRoomTypeId is invalid", 400);
      }
    }

    const image = req.file ? req.file.filename : null;

    try {
      const row = await Service.create({
        code: parsed.data.code ?? null,
        name: parsed.data.name,
        durationMinutes: parsed.data.durationMinutes,
        priceFils: kwdToFils(parsed.data.priceKwd),
        requiredRoomTypeId: parsed.data.requiredRoomTypeId ?? null,

        // ✅ store filename in DB
        image,
      } as any);

      res.status(201).json({ data: toServiceDTO(req, row) });
    } catch (e: any) {
      if (image) {
        await safeUnlink(path.join(serviceUploadDir, image));
      }
      throw e;
    }
  },
);

export const updateService = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = updateServiceSchema.safeParse(req.body);

    if (!parsed.success) {
      if (req.file?.filename) {
        await safeUnlink(path.join(serviceUploadDir, req.file.filename));
      }
      return res.status(400).json({
        error: {
          message: req.t?.("service.invalid_input", "Invalid input"),
          details: parsed.error.flatten(),
        },
      });
    }

    const row = await Service.findByPk(id);
    if (!row) {
      if (req.file?.filename) {
        await safeUnlink(path.join(serviceUploadDir, req.file.filename));
      }
      throw new AppError("Service not found", 404);
    }

    if (
      parsed.data.requiredRoomTypeId !== undefined &&
      parsed.data.requiredRoomTypeId !== null
    ) {
      const rt = await RoomType.findByPk(parsed.data.requiredRoomTypeId);
      if (!rt) {
        if (req.file?.filename) {
          await safeUnlink(path.join(serviceUploadDir, req.file.filename));
        }
        throw new AppError("requiredRoomTypeId is invalid", 400);
      }
    }

    const patch: any = { ...parsed.data };

    if (parsed.data.priceKwd !== undefined) {
      patch.priceFils = kwdToFils(parsed.data.priceKwd);
      delete patch.priceKwd;
    }

    // ✅ update image (optional)
    if (req.file?.filename) {
      const oldImage = (row as any).image as string | null;
      patch.image = req.file.filename;

      await row.update(patch as any);

      if (oldImage) {
        await safeUnlink(path.join(serviceUploadDir, oldImage));
      }

      return res.json({ data: toServiceDTO(req, row) });
    }

    await row.update(patch as any);

    res.json({ data: toServiceDTO(req, row) });
  },
);
