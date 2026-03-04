// src/validators/service.ts
import { z } from "zod";

// KWD with up to 3 decimals (string or number)
const kwdSchema = z.union([
  z.string().regex(/^\d+(\.\d{1,3})?$/, "Invalid KWD amount"),
  z.number().min(0),
]);

export const createServiceSchema = z.object({
  code: z.string().max(32).optional().nullable(),
  name: z.string().min(1).max(128),
  durationMinutes: z
    .coerce.number()
    .int()
    .min(5)
    .max(24 * 60),

  // ✅ price entered as KWD
  priceKwd: kwdSchema,

  requiredRoomTypeId: z
    .preprocess((val) => {
      if (val === "" || val === undefined) return undefined;
      if (val === null || val === "null") return null;
      return val;
    }, z.union([z.coerce.number().int().positive(), z.null()]))
    .optional(),
});

export const updateServiceSchema = z.object({
  code: z.string().max(32).optional().nullable(),
  name: z.string().min(1).max(128).optional(),
  durationMinutes: z
    .coerce.number()
    .int()
    .min(5)
    .max(24 * 60)
    .optional(),

  // ✅ price entered as KWD
  priceKwd: kwdSchema.optional(),

  requiredRoomTypeId: z
    .preprocess((val) => {
      if (val === "" || val === undefined) return undefined;
      if (val === null || val === "null") return null;
      return val;
    }, z.union([z.coerce.number().int().positive(), z.null()]))
    .optional(),
});

// ✅ optional: export types if you like
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
