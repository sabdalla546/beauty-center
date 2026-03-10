import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";

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
router.post("/orders", requirePermission("pos.orders.create"), asyncHandler(createPosOrder));

// Orders history (with filters: status/date/customerId/q/page/limit)
router.get(
  "/orders",
  requirePermission("pos.orders.read"),
  asyncHandler(listPosOrdersHistory),
);

// Single order
router.get(
  "/orders/:id",
  requirePermission("pos.orders.read"),
  asyncHandler(getPosOrderById),
);
router.get(
  "/orders/:id/invoice-80",
  requirePermission("pos.orders.read"),
  asyncHandler(getPosOrderInvoice80),
);

// Pay
router.post(
  "/orders/:id/pay",
  requirePermission("pos.orders.pay"),
  asyncHandler(payPosOrder),
);

// Refund
router.post(
  "/orders/:id/refund",
  requirePermission("pos.orders.refund"),
  asyncHandler(refundOrder),
);
router.post(
  "/pos-orders/:id/cancel",
  requirePermission("pos.orders.canceled"),
  asyncHandler(cancelOrderAndRefundPaidAmount),
);

export default router;
