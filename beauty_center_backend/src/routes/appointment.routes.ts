// src/routes/appointment.routes.ts
import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import { asyncHandler } from "../middlewares/asyncHandler";

import {
  getAppointmentsCalendar,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "../controllers/appointment.controller";

import { checkoutAppointment } from "../controllers/appointmentCheckout.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/calendar",
  requirePermission("appointments.read"),
  asyncHandler(getAppointmentsCalendar),
);

router.post(
  "/",
  requirePermission("appointments.create"),
  asyncHandler(createAppointment),
);

router.post(
  "/:id/checkout",
  requirePermission("pos.orders.create"), // ✅ use your POS permission
  checkoutAppointment, // already wrapped by asyncHandler inside controller file
);

router.put(
  "/:id",
  requirePermission("appointments.update"),
  asyncHandler(updateAppointment),
);

router.patch(
  "/:id/status",
  requirePermission("appointments.update"),
  asyncHandler(updateAppointmentStatus),
);

export default router;
