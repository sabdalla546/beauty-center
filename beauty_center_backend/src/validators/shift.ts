// validators/shift.ts
import { z } from "zod";

export const openShiftSchema = z.object({
  openingCashFils: z.number().int().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
});

export const closeShiftSchema = z.object({
  // UI sends KWD, server converts to FILS
  closingCashKwd: z.number().min(0),
  notes: z.string().max(2000).optional().nullable(),
});

export const shiftSummarySchema = z.object({
  to: z.union([z.string(), z.date()]).optional(),
});
