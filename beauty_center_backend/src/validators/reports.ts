import { z } from "zod";

const reportDateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  z.string().datetime(),
]);
const nullableIsoDate = reportDateSchema.optional().nullable();
const nullableId = z.coerce.number().int().positive().optional().nullable();

export const reportGroupBySchema = z
  .enum(["day", "month", "year"])
  .optional()
  .default("day");

export const overviewReportSchema = z.object({
  from: nullableIsoDate,
  to: nullableIsoDate,
  shiftId: nullableId,
});

export const salesReportSchema = z.object({
  from: nullableIsoDate,
  to: nullableIsoDate,
  shiftId: nullableId,
  groupBy: reportGroupBySchema,
});

export const paymentsReportSchema = z.object({
  from: nullableIsoDate,
  to: nullableIsoDate,
  shiftId: nullableId,
  paymentMethodId: nullableId,
  groupBy: reportGroupBySchema,
});

export const shiftsReportSchema = z.object({
  from: nullableIsoDate,
  to: nullableIsoDate,
  status: z.enum(["open", "closed"]).optional().nullable(),
});

export const appointmentsReportSchema = z.object({
  from: nullableIsoDate,
  to: nullableIsoDate,
  staffId: nullableId,
  roomId: nullableId,
  serviceId: nullableId,
  groupBy: reportGroupBySchema,
});

export const inventoryReportSchema = z.object({
  from: nullableIsoDate,
  to: nullableIsoDate,
  productId: nullableId,
  reason: z.string().trim().min(1).optional().nullable(),
  groupBy: reportGroupBySchema,
});

export const packagesReportSchema = z.object({
  from: nullableIsoDate,
  to: nullableIsoDate,
  planId: nullableId,
  serviceId: nullableId,
  status: z.string().trim().min(1).optional().nullable(),
  groupBy: reportGroupBySchema,
});

export const reportExportFormatSchema = z
  .enum(["json", "csv", "pdf"])
  .optional()
  .default("json");
