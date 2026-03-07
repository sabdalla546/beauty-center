import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
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

router.get("/overview", requirePermission("reports.read"), getOverviewReportHandler);
router.get("/sales", requirePermission("reports.read"), getSalesReportHandler);
router.get("/payments", requirePermission("reports.read"), getPaymentsReportHandler);
router.get("/shifts", requirePermission("reports.read"), getShiftsReportHandler);
router.get("/appointments", requirePermission("reports.read"), getAppointmentsReportHandler);
router.get("/inventory", requirePermission("reports.read"), getInventoryReportHandler);
router.get("/packages", requirePermission("reports.read"), getPackagesReportHandler);

export default router;
