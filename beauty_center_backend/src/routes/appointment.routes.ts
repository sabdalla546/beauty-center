// src/routes/appointment.routes.ts
import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { requirePermission } from "../middlewares/authorize";
import {
  getAppointmentsCalendar,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  exportAppointmentsPdf,
  confirmAppointment,
  checkInAppointment,
  startAppointmentService,
  completeAppointment,
  cancelAppointment,
  markAppointmentNoShow,
  rescheduleAppointment,
} from "../controllers/appointment.controller";

import { checkoutAppointment } from "../controllers/appointmentCheckout.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/calendar",
  requirePermission("appointments.read"),
  getAppointmentsCalendar,
);

router.get(
  "/export/pdf",
  requirePermission("appointments.read"),
  exportAppointmentsPdf,
);

router.post(
  "/",
  requirePermission("appointments.create"),
  createAppointment,
);

router.post(
  "/:id/checkout",
  requirePermission("pos.orders.create"),
  checkoutAppointment,
);

router.put(
  "/:id",
  requirePermission("appointments.update"),
  updateAppointment,
);

router.patch(
  "/:id/status",
  requirePermission("appointments.update"),
  updateAppointmentStatus,
);

// Explicit workflow endpoints
router.post(
  "/:id/confirm",
  requirePermission("appointments.update"),
  confirmAppointment,
);

router.post(
  "/:id/check-in",
  requirePermission("appointments.update"),
  checkInAppointment,
);

router.post(
  "/:id/start",
  requirePermission("appointments.update"),
  startAppointmentService,
);

router.post(
  "/:id/complete",
  requirePermission("appointments.update"),
  completeAppointment,
);

router.post(
  "/:id/cancel",
  requirePermission("appointments.update"),
  cancelAppointment,
);

router.post(
  "/:id/no-show",
  requirePermission("appointments.update"),
  markAppointmentNoShow,
);

router.post(
  "/:id/reschedule",
  requirePermission("appointments.update"),
  rescheduleAppointment,
);

export default router;
