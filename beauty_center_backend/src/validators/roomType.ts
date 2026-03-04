import { z } from "zod";

export const createRoomTypeSchema = z.object({
  name: z.string().min(1).max(128),
  requiresPrivate: z.boolean().optional(),
});

export const updateRoomTypeSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  requiresPrivate: z.boolean().optional(),
});
