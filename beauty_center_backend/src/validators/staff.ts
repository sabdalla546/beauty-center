// src/validators/staff.ts
import { z } from "zod";

export const createStaffSchema = z.object({
  userId: z.number().int().positive(),
  displayName: z.string().max(128).optional(),
  commissionPercent: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .transform((v) => (v === undefined ? 0 : v)),
  skills: z.record(z.string(), z.any()).optional(), // accept arbitrary JSON object of skills
});

export const updateStaffSchema = z.object({
  displayName: z.string().max(128).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  skills: z.record(z.string(), z.any()).optional(),
});

export const listStaffQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || Number.isFinite(v), {
      message: "page must be a number",
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || Number.isFinite(v), {
      message: "limit must be a number",
    }),
  search: z.string().optional(),
});
