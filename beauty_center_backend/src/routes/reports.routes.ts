import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getAppointmentsReportHandler,
  getInventoryReportHandler,
  getOverviewReportHandler,
  getPackagesReportHandler,
  getPaymentsReportHandler,
  getSalesReportHandler,
  getShiftsReportHandler,
} from "../controllers/reports.controller";

const router = Router();
router.use(authenticate);

router.get("/overview", requirePermission("reports.read"), asyncHandler(getOverviewReportHandler));
router.get("/sales", requirePermission("reports.read"), asyncHandler(getSalesReportHandler));
router.get("/payments", requirePermission("reports.read"), asyncHandler(getPaymentsReportHandler));
router.get("/shifts", requirePermission("reports.read"), asyncHandler(getShiftsReportHandler));
router.get("/appointments", requirePermission("reports.read"), asyncHandler(getAppointmentsReportHandler));
router.get("/inventory", requirePermission("reports.read"), asyncHandler(getInventoryReportHandler));
router.get("/packages", requirePermission("reports.read"), asyncHandler(getPackagesReportHandler));

export default router;
