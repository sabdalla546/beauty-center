import type { TFunction } from "i18next";

import type { Appointment } from "@/pages/appointments/types";

export const APPOINTMENT_STATUS_ORDER = [
  "booked",
  "confirmed",
  "checked_in",
  "in_service",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;

export type AppointmentWorkflowAction =
  | "view"
  | "edit"
  | "confirm"
  | "check_in"
  | "start_service"
  | "complete"
  | "cancel"
  | "mark_no_show"
  | "reschedule"
  | "checkout";

export const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  booked: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  confirmed: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  checked_in: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  in_service: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  no_show: "bg-slate-500/15 text-slate-600 border-slate-500/30",
  rescheduled: "bg-violet-500/15 text-violet-600 border-violet-500/30",
};

export const APPOINTMENT_SOURCE_TYPE_OPTIONS = [
  "single_service",
  "package",
  "complimentary",
  "adjustment",
] as const;

const APPOINTMENT_ACTIONS_BY_STATUS: Record<string, AppointmentWorkflowAction[]> = {
  booked: [
    "view",
    "edit",
    "confirm",
    "check_in",
    "cancel",
    "mark_no_show",
    "reschedule",
  ],
  confirmed: [
    "view",
    "edit",
    "check_in",
    "cancel",
    "mark_no_show",
    "reschedule",
  ],
  checked_in: ["view", "start_service", "cancel"],
  in_service: ["view", "complete", "cancel"],
  completed: ["view", "checkout"],
  cancelled: ["view"],
  no_show: ["view"],
  rescheduled: ["view"],
};

export const getAppointmentStatusTranslationKey = (status?: string | null) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "appointments.status_unknown";
  return `appointments.status_${normalized}`;
};

export const getAppointmentSourceTypeTranslationKey = (
  sourceType?: string | null,
) => {
  const normalized = String(sourceType || "").trim().toLowerCase();
  if (!normalized) return "appointments.source_unknown";
  return `appointments.source_${normalized}`;
};

export const getAppointmentStatusLabel = (
  t: TFunction<"common">,
  status?: string | null,
) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) {
    return t("appointments.status_unknown") || "Unknown";
  }

  const key = getAppointmentStatusTranslationKey(normalized);
  const translated = t(key);
  if (translated && translated !== key) {
    return translated;
  }

  return normalized
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

export const getAppointmentSourceTypeLabel = (
  t: TFunction<"common">,
  sourceType?: string | null,
) => {
  const normalized = String(sourceType || "").trim().toLowerCase();
  if (!normalized) {
    return t("appointments.source_unknown") || "Unknown";
  }

  const key = getAppointmentSourceTypeTranslationKey(normalized);
  const translated = t(key);
  if (translated && translated !== key) {
    return translated;
  }

  return normalized
    .split("_")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

export const getAppointmentStatusClassName = (status?: string | null) =>
  APPOINTMENT_STATUS_STYLES[String(status || "").trim().toLowerCase()] ||
  "bg-slate-500/15 text-slate-600 border-slate-500/30";

export const isAppointmentCheckedOut = (appointment?: Appointment | null) =>
  Boolean(appointment?.checkoutOrderId || appointment?.checkedOutAt);

export const canCheckoutAppointment = (appointment?: Appointment | null) =>
  Boolean(
    appointment &&
      String(appointment.status || "").trim().toLowerCase() === "completed" &&
      !isAppointmentCheckedOut(appointment),
  );

export const canEditAppointment = (appointment?: Appointment | null) =>
  ["booked", "confirmed"].includes(
    String(appointment?.status || "").trim().toLowerCase(),
  );

export const getAvailableAppointmentActions = (
  appointment?: Appointment | null,
) => {
  const normalized = String(appointment?.status || "")
    .trim()
    .toLowerCase();
  const actions = APPOINTMENT_ACTIONS_BY_STATUS[normalized] || ["view"];

  if (!canCheckoutAppointment(appointment)) {
    return actions.filter((action) => action !== "checkout");
  }

  return actions;
};
