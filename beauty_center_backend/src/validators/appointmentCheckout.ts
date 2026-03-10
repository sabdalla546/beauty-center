import { z } from "zod";

export const appointmentCheckoutSchema = z.object({
  externalRef: z.string().max(128).optional().nullable(),

  // optional: add products to the order
  products: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        qty: z.number().int().positive().default(1),
      }),
    )
    .optional()
    .nullable(),

  /**
   * Pricing adjustments
   *
   * Preferred input:
   * - discountKwd / taxKwd: numbers in KWD (can be decimals), server converts to FILS.
   *
   * Backward-compat (temporary):
   * - discountFils / taxFils: integers in FILS.
   */
  discountKwd: z.number().min(0).optional().nullable(),
  taxKwd: z.number().min(0).optional().nullable(),

  discountFils: z.number().int().min(0).optional().nullable(),
  taxFils: z.number().int().min(0).optional().nullable(),


  // optional notes
  notes: z.string().max(2000).optional().nullable(),
});
