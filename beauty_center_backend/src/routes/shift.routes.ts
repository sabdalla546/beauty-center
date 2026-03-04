import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import {
  openShift,
  closeShift,
  getMyOpenShift,
} from "../controllers/shift.controller";
import { getShiftSummary } from "../controllers/shiftSummary.controller";

const router = Router();
router.use(authenticate);

router.get("/me/open", requirePermission("shifts.read"), getMyOpenShift);
router.post("/open", requirePermission("shifts.open"), openShift);
router.post("/:id/close", requirePermission("shifts.close"), closeShift);
router.post("/:id/summary", requirePermission("shifts.read"), getShiftSummary);

export default router;
