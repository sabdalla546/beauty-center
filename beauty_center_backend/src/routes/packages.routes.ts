import express from "express";
import { authenticate } from "../middlewares/authenticate";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requirePermission } from "../middlewares/authorize";

import {
  listPlans,
  createPlan,
  updatePlan,
  togglePlanActive,
} from "../controllers/packagePlans.controller";

import {
  listCustomerPackages,
  listUsableCustomerPackages,
} from "../controllers/customerPackages.controller";

import { listPackageUsages } from "../controllers/packageUsages.controller";

const router = express.Router();

router.use(authenticate);

// Plans
router.get(
  "/plans",
  requirePermission("packages.read"),
  asyncHandler(listPlans),
);
router.post(
  "/plans",
  requirePermission("packages.create"),
  asyncHandler(createPlan),
);
router.put(
  "/plans/:id",
  requirePermission("packages.update"),
  asyncHandler(updatePlan),
);
router.patch(
  "/plans/:id/toggle",
  requirePermission("packages.update"),
  asyncHandler(togglePlanActive),
);

// Customer packages (all / for admin screens)
router.get(
  "/customers/:customerId",
  requirePermission("packages.read"),
  asyncHandler(listCustomerPackages),
);

// ✅ POS-friendly
router.get(
  "/customers/:customerId/usable",
  requirePermission("packages.read"),
  asyncHandler(listUsableCustomerPackages),
);

// Usage ledger
router.get(
  "/usages",
  requirePermission("packages.read"),
  asyncHandler(listPackageUsages),
);

export default router;
