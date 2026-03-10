export const APPOINTMENT_STATUSES = [
  "booked",
  "confirmed",
  "checked_in",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;

export const ORDER_STATUSES = [
  "open",
  "partially_paid",
  "paid",
  "cancelled",
  "refunded",
] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "refunded",
] as const;

export const SHIFT_STATUSES = ["open", "closed"] as const;

export const PACKAGE_STATUSES = [
  "active",
  "expired",
  "used_up",
  "cancelled",
] as const;

export const ORDER_ITEM_LINE_TYPES = ["service", "product", "package"] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];
export type OrderItemLineType = (typeof ORDER_ITEM_LINE_TYPES)[number];
