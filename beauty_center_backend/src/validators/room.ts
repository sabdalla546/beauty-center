import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().min(1).max(64),
  roomTypeId: z.number().int().positive().optional().nullable(),
  capacity: z.number().int().min(1).max(50).optional(),
  status: z.string().max(32).optional(), // available | maintenance | out_of_service ...
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  roomTypeId: z.number().int().positive().optional().nullable(),
  capacity: z.number().int().min(1).max(50).optional(),
  status: z.string().max(32).optional(),
});
