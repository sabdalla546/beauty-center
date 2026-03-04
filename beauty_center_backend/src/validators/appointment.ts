// src/validators/appointment.ts
import { z } from "zod";

const dateLike = z.union([z.string(), z.date()]);

const toDate = (v: unknown): Date => {
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return d;
};

const isValidDate = (d: Date) =>
  d instanceof Date && !Number.isNaN(d.getTime());

export const createAppointmentSchema = z
  .object({
    customerId: z.number().int().positive(),
    serviceId: z.number().int().positive(),
    staffId: z.number().int().positive().optional().nullable(),
    roomId: z.number().int().positive().optional().nullable(),
    startAt: dateLike,
    // ✅ endAt optional (server can auto-calc)
    endAt: dateLike.optional(),
    status: z.string().max(32).optional(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const start = toDate(val.startAt);
    if (!isValidDate(start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startAt is invalid",
        path: ["startAt"],
      });
      return;
    }

    if (val.endAt !== undefined) {
      const end = toDate(val.endAt);
      if (!isValidDate(end)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endAt is invalid",
          path: ["endAt"],
        });
        return;
      }

      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endAt must be after startAt",
          path: ["endAt"],
        });
      }
    }
  });

export const updateAppointmentSchema = z
  .object({
    customerId: z.number().int().positive().optional(),
    serviceId: z.number().int().positive().optional(),
    staffId: z.number().int().positive().optional().nullable(),
    roomId: z.number().int().positive().optional().nullable(),
    startAt: dateLike.optional(),
    endAt: dateLike.optional(),
    status: z.string().max(32).optional(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    // validate provided date fields individually
    if (val.startAt !== undefined) {
      const start = toDate(val.startAt);
      if (!isValidDate(start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "startAt is invalid",
          path: ["startAt"],
        });
      }
    }

    if (val.endAt !== undefined) {
      const end = toDate(val.endAt);
      if (!isValidDate(end)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endAt is invalid",
          path: ["endAt"],
        });
      }
    }

    // if both provided, check ordering
    if (val.startAt !== undefined && val.endAt !== undefined) {
      const start = toDate(val.startAt);
      const end = toDate(val.endAt);

      if (isValidDate(start) && isValidDate(end) && end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endAt must be after startAt",
          path: ["endAt"],
        });
      }
    }
  });

export const updateAppointmentStatusSchema = z.object({
  status: z.string().min(1).max(32),
});
