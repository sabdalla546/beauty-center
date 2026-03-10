import { z } from "zod";

export const checkoutAppointmentSchema = z.object({
  products: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        qty: z.number().int().min(1).default(1),
      }),
    )
    .optional()
    .default([]),

  discountFils: z.number().int().min(0).optional().default(0),
  taxFils: z.number().int().min(0).optional().default(0),

  notes: z.string().max(500).optional().nullable(),
});
