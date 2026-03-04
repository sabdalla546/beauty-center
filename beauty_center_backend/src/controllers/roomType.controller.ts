import { Request, Response } from "express";
import { RoomType } from "../models/roomType.model";
import { AppError } from "../errors/AppError";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  createRoomTypeSchema,
  updateRoomTypeSchema,
} from "../validators/roomType";

export const listRoomTypes = asyncHandler(
  async (req: Request, res: Response) => {
    const rows = await RoomType.findAll({ order: [["id", "DESC"]] });
    res.json({ data: rows });
  },
);

export const createRoomType = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = createRoomTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("room_type.invalid_input", "Invalid input") ??
            "Invalid input",
          details: flat,
        },
      });
    }

    const row = await RoomType.create(parsed.data as any);
    res.status(201).json({ data: row });
  },
);

export const updateRoomType = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = updateRoomTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("room_type.invalid_input", "Invalid input") ??
            "Invalid input",
          details: flat,
        },
      });
    }

    const row = await RoomType.findByPk(id);
    if (!row)
      throw new AppError(
        req.t?.("room_type.not_found", "RoomType not found") ??
          "RoomType not found",
        404,
        "room_type.not_found",
      );

    await row.update(parsed.data as any);
    res.json({ data: row });
  },
);
