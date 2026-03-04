import express from "express";
import { staffController } from "../controllers/staff.controller";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";

const router = express.Router();

router.post(
  "/",
  authenticate,
  requirePermission("staff.create"),
  staffController.createStaff,
);
router.get(
  "/",
  authenticate,
  requirePermission("staff.read"),
  staffController.listStaff,
);
router.get(
  "/:id",
  authenticate,
  requirePermission("staff.read"),
  staffController.getStaff,
);
router.put(
  "/:id",
  authenticate,
  requirePermission("staff.update"),
  staffController.updateStaff,
);
router.delete(
  "/:id",
  authenticate,
  requirePermission("staff.delete"),
  staffController.deleteStaff,
);
router.post(
  "/:id/restore",
  authenticate,
  requirePermission("staff.restore"),
  staffController.restoreStaff,
);

export default router;
