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

const kwdNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return value;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  },
  z
    .number()
    .min(0)
    .refine(
      (value) => {
        const scaled = value * 1000;
        return Math.abs(scaled - Math.round(scaled)) < 1e-6;
      },
      "Up to 3 decimal places",
    ),
);

export const serviceFormSchema = z.object({
  code: z.string().max(32).optional(),
  name: z.string().min(1).max(128),
  durationMinutes: requiredInt(5, 24 * 60),
  priceKwd: kwdNumber,
  requiredRoomTypeId: optionalInt,
});

export type ServiceFormSchema = z.infer<typeof serviceFormSchema>;
