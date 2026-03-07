import { Request, Response } from "express";
import { ZodType } from "zod";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getAppointmentsReport,
  getInventoryReport,
  getOverviewReport,
  getPackagesReport,
  getPaymentsReport,
  getSalesReport,
  getShiftsReport,
} from "../services/reports.service";
import { sendReportResponse } from "../utils/reportExport";
import {
  appointmentsReportSchema,
  inventoryReportSchema,
  overviewReportSchema,
  packagesReportSchema,
  paymentsReportSchema,
  reportExportFormatSchema,
  salesReportSchema,
  shiftsReportSchema,
} from "../validators/reports";

const invalidQuery = (res: Response, details: unknown) =>
  res.status(400).json({
    error: { message: "Invalid query parameters", details },
  });

const createReportHandler = <T>(
  reportName: string,
  schema: ZodType<T>,
  loader: (query: T) => Promise<unknown>,
) =>
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return invalidQuery(res, parsed.error.flatten());

    const exportFormat = reportExportFormatSchema.safeParse(req.query.format);
    if (!exportFormat.success) {
      return invalidQuery(res, exportFormat.error.flatten());
    }

    const data = await loader(parsed.data);
    return sendReportResponse(res, reportName, data, exportFormat.data);
  });

export const getOverviewReportHandler = createReportHandler(
  "overview",
  overviewReportSchema,
  getOverviewReport,
);

export const getSalesReportHandler = createReportHandler(
  "sales",
  salesReportSchema,
  getSalesReport,
);

export const getPaymentsReportHandler = createReportHandler(
  "payments",
  paymentsReportSchema,
  getPaymentsReport,
);

export const getShiftsReportHandler = createReportHandler(
  "shifts",
  shiftsReportSchema,
  getShiftsReport,
);

export const getAppointmentsReportHandler = createReportHandler(
  "appointments",
  appointmentsReportSchema,
  getAppointmentsReport,
);

export const getInventoryReportHandler = createReportHandler(
  "inventory",
  inventoryReportSchema,
  getInventoryReport,
);

export const getPackagesReportHandler = createReportHandler(
  "packages",
  packagesReportSchema,
  getPackagesReport,
);