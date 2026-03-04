// src/routes/customerRoutes.ts
import express from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { customerController } from "../controllers/customer.controller";

const router = express.Router();

// List & search customers (requires view permission)
router.get(
  "/",
  authenticate,
  requirePermission("customers.read"),
  customerController.listCustomers,
);

// Create customer
router.post(
  "/",
  authenticate,
  requirePermission("customers.create"),
  customerController.createCustomer,
);

// Get single customer
router.get(
  "/:id",
  authenticate,
  requirePermission("customers.read"),
  customerController.getCustomer,
);

// Update
router.put(
  "/:id",
  authenticate,
  requirePermission("customers.update"),
  customerController.updateCustomer,
);

// Delete (soft if paranoid)
router.delete(
  "/:id",
  authenticate,
  requirePermission("customers.delete"),
  customerController.deleteCustomer,
);

// Restore (if model supports restore)
router.post(
  "/:id/restore",
  authenticate,
  requirePermission("customers.restore"),
  customerController.restoreCustomer,
);

export default router;
