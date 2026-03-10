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
  asyncHandler(getAppointmentsCalendar),
);

router.get(
  "/export/pdf",
  requirePermission("appointments.read"),
  asyncHandler(exportAppointmentsPdf),
);

router.post(
  "/",
  requirePermission("appointments.create"),
  asyncHandler(createAppointment),
);

router.post(
  "/:id/checkout",
  requirePermission("pos.orders.create"),
  asyncHandler(checkoutAppointment),
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

// Explicit workflow endpoints
router.post(
  "/:id/confirm",
  requirePermission("appointments.update"),
  asyncHandler(confirmAppointment),
);

router.post(
  "/:id/check-in",
  requirePermission("appointments.update"),
  asyncHandler(checkInAppointment),
);

router.post(
  "/:id/start",
  requirePermission("appointments.update"),
  asyncHandler(startAppointmentService),
);

router.post(
  "/:id/complete",
  requirePermission("appointments.update"),
  asyncHandler(completeAppointment),
);

router.post(
  "/:id/cancel",
  requirePermission("appointments.update"),
  asyncHandler(cancelAppointment),
);

router.post(
  "/:id/no-show",
  requirePermission("appointments.update"),
  asyncHandler(markAppointmentNoShow),
);

router.post(
  "/:id/reschedule",
  requirePermission("appointments.update"),
  asyncHandler(rescheduleAppointment),
);

export default router;
