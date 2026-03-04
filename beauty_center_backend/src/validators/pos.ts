import { z } from "zod";

const kwdSchema = z.union([
  z.string().regex(/^\d+(\.\d{1,3})?$/, "Invalid KWD amount"),
  z.number().min(0),
]);

export const createPosOrderSchema = z.object({
  externalRef: z.string().max(128).optional().nullable(),
  customerId: z.number().int().optional().nullable(),

  items: z
    .array(
      z.object({
        lineType: z.enum(["service", "product", "package"]),
        referenceId: z.number().int().optional().nullable(),
        description: z.string().max(256).optional().nullable(),
        quantity: z.number().int().min(1).default(1),

        // ✅ entered as KWD
        unitPriceKwd: kwdSchema,
        totalPriceKwd: kwdSchema,

        staffId: z.number().int().optional().nullable(),
        roomId: z.number().int().optional().nullable(),
        appointmentId: z.number().int().optional().nullable(),
      }),
    )
    .min(1),

  // ✅ entered as KWD
  discountKwd: kwdSchema.optional().default(0),
  taxKwd: kwdSchema.optional().default(0),
});

export const payPosOrderSchema = z.object({
  payments: z
    .array(
      z.object({
        methodId: z.number().int().positive(),
        amountKwd: kwdSchema, // ✅
        providerReference: z.string().max(256).optional().nullable(),
      }),
    )
    .min(1),
});
