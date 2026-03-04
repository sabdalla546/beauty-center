import { z } from "zod";

const requiredInt = (min: number, max?: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return value;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    },
    max !== undefined
      ? z.number().int().min(min).max(max)
      : z.number().int().min(min),
  );

const optionalInt = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  },
  z.number().int().positive().optional(),
);

const optionalIntRange = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    },
    z.number().int().min(min).max(max).optional(),
  );

export const roomFormSchema = z.object({
  name: z.string().min(1).max(64),
  roomTypeId: optionalInt,
  capacity: optionalIntRange(1, 50),
  status: z.string().max(32).optional(),
});

export type RoomFormSchema = z.infer<typeof roomFormSchema>;
