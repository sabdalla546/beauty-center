// src/routes/paymentMethods.routes.ts
import { Router } from "express";
import {
  listPaymentMethods,
  listActivePaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "../controllers/paymentMethods.controller";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("payment_methods.read"), asyncHandler(listPaymentMethods));
router.get(
  "/active",
  requirePermission("payment_methods.read"),
  asyncHandler(listActivePaymentMethods),
);

router.post(
  "/",
  requirePermission("payment_methods.create"),
  asyncHandler(createPaymentMethod),
);
router.patch(
  "/:id",
  requirePermission("payment_methods.update"),
  asyncHandler(updatePaymentMethod),
);
router.delete(
  "/:id",
  requirePermission("payment_methods.delete"),
  asyncHandler(deletePaymentMethod),
);

export default router;
