import { z } from "zod";

export const listPosOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),

  status: z.string().max(32).optional().nullable(), // "open" | "paid" | "refunded" | "void" ...
  customerId: z.coerce.number().int().positive().optional().nullable(),

  from: z.string().datetime().optional().nullable(), // ISO
  to: z.string().datetime().optional().nullable(), // ISO

  q: z.string().max(255).optional().nullable(), // search in externalRef or id
});
