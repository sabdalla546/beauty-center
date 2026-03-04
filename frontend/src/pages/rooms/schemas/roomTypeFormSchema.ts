import { z } from "zod";

export const roomTypeFormSchema = z.object({
  name: z.string().min(1).max(128),
  requiresPrivate: z.boolean().optional(),
});

export type RoomTypeFormSchema = z.infer<typeof roomTypeFormSchema>;
