import { z } from "zod";

const kwdSchema = z.union([
  z.string().regex(/^\d+(\.\d{1,3})?$/, "Invalid KWD amount"),
  z.number().min(0),
]);

export const createProductSchema = z.object({
  sku: z.string().max(64).optional().nullable(),
  name: z.string().min(1).max(255),
  barcode: z.string().max(128).optional().nullable(),

  // ✅ entered as KWD
  costKwd: kwdSchema.optional().default(0),
  priceKwd: kwdSchema.optional().default(0),

  currentQty: z.number().int().optional().default(0),
});

export const updateProductSchema = z.object({
  sku: z.string().max(64).optional().nullable(),
  name: z.string().min(1).max(255).optional(),
  barcode: z.string().max(128).optional().nullable(),

  // ✅ entered as KWD
  costKwd: kwdSchema.optional(),
  priceKwd: kwdSchema.optional(),

  currentQty: z.number().int().optional(),
});

export const adjustStockSchema = z.object({
  change: z.number().int(),
  reason: z.string().min(1).max(64),
  referenceId: z.string().max(128).optional().nullable(),
});
