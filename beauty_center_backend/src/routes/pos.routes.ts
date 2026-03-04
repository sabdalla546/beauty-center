import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";

import {
  cancelOrderAndRefundPaidAmount,
  createPosOrder,
  getPosOrderInvoice80,
  getPosOrderById,
  listPosOrdersHistory,
  payPosOrder,
} from "../controllers/posOrders.controller";

import { refundOrder } from "../controllers/refund.controller";

const router = Router();
router.use(authenticate);

// Create order
router.post("/orders", requirePermission("pos.orders.create"), createPosOrder);

// Orders history (with filters: status/date/customerId/q/page/limit)
router.get(
  "/orders",
  requirePermission("pos.orders.read"),
  listPosOrdersHistory,
);

// Single order
router.get(
  "/orders/:id",
  requirePermission("pos.orders.read"),
  getPosOrderById,
);
router.get(
  "/orders/:id/invoice-80",
  requirePermission("pos.orders.read"),
  getPosOrderInvoice80,
);

// Pay
router.post(
  "/orders/:id/pay",
  requirePermission("pos.orders.pay"),
  payPosOrder,
);

// Refund
router.post(
  "/orders/:id/refund",
  requirePermission("pos.orders.refund"),
  refundOrder,
);
router.post(
  "/pos-orders/:id/cancel",
  requirePermission("pos.orders.canceled"),
  cancelOrderAndRefundPaidAmount,
);

export default router;
