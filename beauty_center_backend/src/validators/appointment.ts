import {
  APPOINTMENT_RESCHEDULE_ALLOWED_TARGETS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_UPDATE_ALLOWED,
} from "../constants/domain";
import { z } from "zod";

const dateLike = z.union([z.string(), z.date()]);

const toDate = (v: unknown): Date => {
  if (v instanceof Date) return v;
  return new Date(String(v));
};

const isValidDate = (d: Date) =>
  d instanceof Date && !Number.isNaN(d.getTime());

export const appointmentStatusEnum = z.enum(APPOINTMENT_STATUSES);

export const appointmentSourceTypeEnum = z.enum([
  "single_service",
  "package",
  "complimentary",
  "adjustment",
]);

export const createAppointmentSchema = z
  .object({
    customerId: z.number().int().positive(),
    serviceId: z.number().int().positive(),
    staffId: z.number().int().positive().optional().nullable(),
    roomId: z.number().int().positive().optional().nullable(),
    startAt: dateLike,
    endAt: dateLike.optional(),

    // already added in model, but avoid forcing usage now
    sourceType: appointmentSourceTypeEnum.optional(),
    sourceId: z.number().int().positive().optional().nullable(),
    customerPackageId: z.number().int().positive().optional().nullable(),

    status: appointmentStatusEnum.optional(),
    notes: z.string().optional().nullable(),
    internalNotes: z.string().optional().nullable(),
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

    if (val.sourceType === "package" && !val.customerPackageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customerPackageId is required when sourceType is package",
        path: ["customerPackageId"],
      });
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

    sourceType: appointmentSourceTypeEnum.optional(),
    sourceId: z.number().int().positive().optional().nullable(),
    customerPackageId: z.number().int().positive().optional().nullable(),

    status: appointmentStatusEnum.optional(),
    notes: z.string().optional().nullable(),
    internalNotes: z.string().optional().nullable(),

    cancelReason: z.string().max(255).optional().nullable(),
  })
  .superRefine((val, ctx) => {
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

    if (val.sourceType === "package" && val.customerPackageId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customerPackageId is required when sourceType is package",
        path: ["customerPackageId"],
      });
    }
  });

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUS_UPDATE_ALLOWED),
  cancelReason: z.string().max(255).optional().nullable(),
});
export const confirmAppointmentSchema = z.object({});

export const checkInAppointmentSchema = z.object({});

export const startAppointmentServiceSchema = z.object({
  actualStaffId: z.number().int().positive().optional().nullable(),
  actualRoomId: z.number().int().positive().optional().nullable(),
});

export const completeAppointmentSchema = z.object({
  actualStaffId: z.number().int().positive().optional().nullable(),
  actualRoomId: z.number().int().positive().optional().nullable(),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().trim().min(1).max(255),
});

export const markAppointmentNoShowSchema = z.object({});

export const rescheduleAppointmentSchema = z
  .object({
    newStartAt: dateLike,
    newEndAt: dateLike.optional(),
    staffId: z.number().int().positive().optional().nullable(),
    roomId: z.number().int().positive().optional().nullable(),
    reason: z.string().trim().max(255).optional().nullable(),
    status: z.enum(APPOINTMENT_RESCHEDULE_ALLOWED_TARGETS).optional(),
  })
  .superRefine((val, ctx) => {
    const start = toDate(val.newStartAt);
    if (!isValidDate(start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "newStartAt is invalid",
        path: ["newStartAt"],
      });
      return;
    }

    if (val.newEndAt !== undefined) {
      const end = toDate(val.newEndAt);
      if (!isValidDate(end)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "newEndAt is invalid",
          path: ["newEndAt"],
        });
        return;
      }

      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "newEndAt must be after newStartAt",
          path: ["newEndAt"],
        });
      }
    }
  });
