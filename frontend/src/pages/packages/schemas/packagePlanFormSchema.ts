import { z } from "zod";

const toNumber = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};

const positiveInt = z.preprocess(
  toNumber,
  z.number().int().min(1, "Must be at least 1"),
);

const kwdField = z.preprocess(
  toNumber,
  z
    .number()
    .min(0.001, "Minimum 0.001")
    .refine((value) => {
      const scaled = value * 1000;
      return Math.abs(scaled - Math.round(scaled)) < 1e-6;
    }, "Up to 3 decimal places"),
);

export const packagePlanFormSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  priceKwd: kwdField,
  sessionsCount: positiveInt,
  validDays: positiveInt,
  serviceId: z.preprocess(toNumber, z.number().int().positive().optional()),
});

export type PackagePlanFormSchema = z.infer<typeof packagePlanFormSchema>;
