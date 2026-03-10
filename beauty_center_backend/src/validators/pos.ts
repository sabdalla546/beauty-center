import { ORDER_ITEM_LINE_TYPES } from "../constants/domain";
import { z } from "zod";

const kwdSchema = z.union([
  z.string().regex(/^\d+(\.\d{1,3})?$/, "Invalid KWD amount"),
  z.number().min(0),
]);

export const createPosOrderSchema = z
  .object({
    externalRef: z.string().max(128).optional().nullable(),
    customerId: z.number().int().optional().nullable(),

    items: z
      .array(
        z.object({
          lineType: z.enum(ORDER_ITEM_LINE_TYPES),
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
  })
  .superRefine((val, ctx) => {
    for (let idx = 0; idx < val.items.length; idx += 1) {
      const item = val.items[idx];

      if (!item.referenceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", idx, "referenceId"],
          message: `referenceId is required for lineType=${item.lineType}`,
        });
      }

      if (item.lineType === "package" && !val.customerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customerId"],
          message: "customerId is required when selling package items",
        });
      }

      if (item.lineType !== "service" && (item.staffId || item.roomId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", idx],
          message: "staffId/roomId are only allowed for service line items",
        });
      }

      if (item.lineType === "package" && item.appointmentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", idx, "appointmentId"],
          message: "appointmentId is not allowed for package line items",
        });
      }
    }
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
