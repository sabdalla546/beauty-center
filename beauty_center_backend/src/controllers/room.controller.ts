import { Request, Response } from "express";
import { Op } from "sequelize";
import { AppError } from "../errors/AppError";
import { asyncHandler } from "../middlewares/asyncHandler";
import { Room } from "../models/room.model";
import { RoomType } from "../models/roomType.model";
import { createRoomSchema, updateRoomSchema } from "../validators/room";

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const { roomTypeId, status, q } = req.query as any;

  const where: any = {};
  if (roomTypeId) where.roomTypeId = Number(roomTypeId);
  if (status) where.status = String(status);
  if (q) where.name = { [Op.like]: `%${String(q)}%` };

  const rows = await Room.findAll({
    where,
    include: [{ model: RoomType, as: "roomType", required: false }],
    order: [["id", "DESC"]],
  });

  res.json({ data: rows });
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return res.status(400).json({
      error: {
        message:
          req.t?.("room.invalid_input", "Invalid input") ?? "Invalid input",
        details: flat,
      },
    });
  }

  // validate roomTypeId if provided
  if (parsed.data.roomTypeId) {
    const rt = await RoomType.findByPk(parsed.data.roomTypeId);
    if (!rt)
      throw new AppError(
        req.t?.("room.room_type_invalid", "roomTypeId is invalid") ??
          "roomTypeId is invalid",
        400,
        "room.room_type_invalid",
      );
  }

  const row = await Room.create(parsed.data as any);
  res.status(201).json({ data: row });
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = updateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return res.status(400).json({
      error: {
        message:
          req.t?.("room.invalid_input", "Invalid input") ?? "Invalid input",
        details: flat,
      },
    });
  }

  const row = await Room.findByPk(id);
  if (!row)
    throw new AppError(
      req.t?.("room.not_found", "Room not found") ?? "Room not found",
      404,
      "room.not_found",
    );

  if (parsed.data.roomTypeId !== undefined && parsed.data.roomTypeId !== null) {
    const rt = await RoomType.findByPk(parsed.data.roomTypeId);
    if (!rt)
      throw new AppError(
        req.t?.("room.room_type_invalid", "roomTypeId is invalid") ??
          "roomTypeId is invalid",
        400,
        "room.room_type_invalid",
      );
  }

  await row.update(parsed.data as any);
  res.json({ data: row });
});
