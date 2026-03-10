import express from "express";
import { staffController } from "../controllers/staff.controller";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = express.Router();

router.post(
  "/",
  authenticate,
  requirePermission("staff.create"),
  asyncHandler(staffController.createStaff),
);
router.get(
  "/",
  authenticate,
  requirePermission("staff.read"),
  asyncHandler(staffController.listStaff),
);
router.get(
  "/:id",
  authenticate,
  requirePermission("staff.read"),
  asyncHandler(staffController.getStaff),
);
router.put(
  "/:id",
  authenticate,
  requirePermission("staff.update"),
  asyncHandler(staffController.updateStaff),
);
router.delete(
  "/:id",
  authenticate,
  requirePermission("staff.delete"),
  asyncHandler(staffController.deleteStaff),
);
router.post(
  "/:id/restore",
  authenticate,
  requirePermission("staff.restore"),
  asyncHandler(staffController.restoreStaff),
);

export default router;
