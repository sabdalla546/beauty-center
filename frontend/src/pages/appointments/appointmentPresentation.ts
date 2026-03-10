import { format, type Locale } from "date-fns";

import type { Appointment } from "@/pages/appointments/types";

const formatDateSafe = (
  value: string | Date,
  pattern: string,
  locale?: Locale,
) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, pattern, locale ? { locale } : undefined);
};

type AppointmentStaffLike = Appointment["staff"] | Appointment["actualStaff"];

const getStaffDisplayName = (staff?: AppointmentStaffLike | null) => {
  if (!staff) return "-";
  if (staff.displayName) return staff.displayName;
  const user = staff.user || staff.User;
  if (!user) return "-";
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.email || "-";
};

export const formatAppointmentDateTime = (
  value?: string | Date | null,
  locale?: Locale,
  pattern = "MMM d, yyyy h:mm a",
) => {
  if (!value) return "-";
  return formatDateSafe(value, pattern, locale);
};

export const formatAppointmentTime = (
  value?: string | Date | null,
  locale?: Locale,
  pattern = "h:mm a",
) => {
  if (!value) return "-";
  return formatDateSafe(value, pattern, locale);
};

export const formatAppointmentTimeRange = (
  startAt?: string | null,
  endAt?: string | null,
  locale?: Locale,
) => {
  if (!startAt) return "-";
  const startText = formatAppointmentTime(startAt, locale);
  if (!endAt) return startText;
  const endText = formatAppointmentTime(endAt, locale);
  return `${startText} - ${endText}`;
};

export const getAppointmentCustomerName = (appointment?: Appointment | null) => {
  const customer = appointment?.customer;
  if (!customer) return appointment?.id ? `#${appointment.id}` : "-";
  const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  return fullName || customer.phone || (appointment?.id ? `#${appointment.id}` : "-");
};

export const getAppointmentServiceName = (appointment?: Appointment | null) =>
  appointment?.service?.name || "-";

export const getAppointmentStaffName = (appointment?: Appointment | null) =>
  getStaffDisplayName(appointment?.staff);

export const getAppointmentActualStaffName = (
  appointment?: Appointment | null,
) => getStaffDisplayName(appointment?.actualStaff);

export const getAppointmentRoomName = (appointment?: Appointment | null) =>
  appointment?.room?.name || "-";

export const getAppointmentActualRoomName = (appointment?: Appointment | null) =>
  appointment?.actualRoom?.name || "-";

export const formatAppointmentDurationMinutes = (
  appointment?: Appointment | null,
) => {
  if (!appointment?.startAt || !appointment?.endAt) return null;
  const start = new Date(appointment.startAt);
  const end = new Date(appointment.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return minutes > 0 ? minutes : null;
};
