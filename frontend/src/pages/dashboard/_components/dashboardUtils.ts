import type { Customer } from "@/pages/customers/types";
import type { Staff } from "@/pages/staff/types";

export const startOfDay = (value = new Date()) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const endOfDay = (value = new Date()) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const daysAgo = (days: number, value = new Date()) => {
  const next = new Date(value);
  next.setDate(next.getDate() - days);
  return startOfDay(next);
};

export const formatNumber = (
  value: number | null | undefined,
  locale: string,
  options?: Intl.NumberFormatOptions,
) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";

  try {
    return new Intl.NumberFormat(locale, options).format(numeric);
  } catch {
    return String(numeric);
  }
};

export const formatKwd = (
  value: number | null | undefined,
  locale: string,
  compact = false,
) =>
  formatNumber(value, locale, {
    minimumFractionDigits: compact ? 0 : 3,
    maximumFractionDigits: compact ? 1 : 3,
  });

export const formatTime = (value: string | null | undefined, locale: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
};

export const formatShortDate = (
  value: string | null | undefined,
  locale: string,
) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
};

export const getCustomerDisplayName = (customer?: Customer | null) => {
  if (!customer) return "Walk-in";
  const fullName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  return fullName || customer.phone || `#${customer.id}`;
};

export const getStaffDisplayName = (staff?: Staff | null) => {
  if (!staff) return "Unassigned";
  if (staff.displayName) return staff.displayName;

  const user = staff.user || staff.User;
  if (!user) return `#${staff.id}`;

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.email || `#${staff.id}`;
};

export const toSentenceCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
