import { z } from "zod";

/*export const refundOrderSchema = z.object({
  // full refund by default; allow partial later
  amountCents: z.number().int().min(1).optional(),
  method: z.string().min(1).max(32).optional().default("refund"),
  note: z.string().max(1000).optional().nullable(),
});
*/

export const refundOrderSchema = z.object({
  note: z.string().max(2000).optional().nullable(),
  // MVP: full refund only => we don't accept amountCents now
});
