import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  openShift,
  closeShift,
  getMyOpenShift,
} from "../controllers/shift.controller";
import { getShiftSummary } from "../controllers/shiftSummary.controller";

const router = Router();
router.use(authenticate);

router.get("/me/open", requirePermission("shifts.read"), asyncHandler(getMyOpenShift));
router.post("/open", requirePermission("shifts.open"), asyncHandler(openShift));
router.post("/:id/close", requirePermission("shifts.close"), asyncHandler(closeShift));
router.post("/:id/summary", requirePermission("shifts.read"), asyncHandler(getShiftSummary));

export default router;
