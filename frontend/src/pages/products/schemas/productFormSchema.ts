import { z } from "zod";

const optionalInt = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  },
  z.number().int().min(0).optional(),
);

const optionalKwd = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
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
    )
    .optional(),
);

export const productFormSchema = z.object({
  sku: z.string().max(64).optional(),
  name: z.string().min(1).max(255),
  barcode: z.string().max(128).optional(),
  costKwd: optionalKwd,
  priceKwd: optionalKwd,
  currentQty: optionalInt,
});

export type ProductFormSchema = z.infer<typeof productFormSchema>;
