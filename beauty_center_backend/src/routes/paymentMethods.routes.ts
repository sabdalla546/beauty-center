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

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("payment_methods.read"), listPaymentMethods);
router.get(
  "/active",
  requirePermission("payment_methods.read"),
  listActivePaymentMethods,
);

router.post(
  "/",
  requirePermission("payment_methods.create"),
  createPaymentMethod,
);
router.patch(
  "/:id",
  requirePermission("payment_methods.update"),
  updatePaymentMethod,
);
router.delete(
  "/:id",
  requirePermission("payment_methods.delete"),
  deletePaymentMethod,
);

export default router;
