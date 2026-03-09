import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";

import AppointmentActionsCell from "@/pages/appointments/_components/AppointmentActionsCell";
import AppointmentStatusBadge from "@/pages/appointments/_components/AppointmentStatusBadge";
import type { Appointment } from "../types";

interface AppointmentColumnsProps {
  editPermission: string;
  checkoutPermission: string;
}

const formatDateTime = (value?: string | null, locale = enUS) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM d, yyyy h:mm a", { locale });
};

const getCustomerName = (appointment: Appointment) => {
  const customer = appointment.customer;
  if (!customer) return "-";
  const name = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  return name || customer.phone || "-";
};

const getStaffName = (appointment: Appointment) => {
  const staff = appointment.staff;
  if (!staff) return "-";
  if (staff.displayName) return staff.displayName;
  const user = staff.user || staff.User;
  if (!user) return "-";
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email || "-";
};

export const useAppointmentsColumns = ({
  editPermission,
  checkoutPermission,
}: AppointmentColumnsProps): ColumnDef<Appointment>[] => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "startAt",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.start") || "Start"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {formatDateTime(row.original.startAt, dateLocale)}
        </div>
      ),
    },
    {
      accessorKey: "endAt",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.end") || "End"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {formatDateTime(row.original.endAt, dateLocale)}
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.customer") || t("customer") || "Customer"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {getCustomerName(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "service",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.service") || t("service") || "Service"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.service?.name || "-"}
        </div>
      ),
    },
    {
      accessorKey: "staff",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.staff") || t("staff") || "Staff"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {getStaffName(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "room",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.room") || t("room") || "Room"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.room?.name || "-"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <div className="text-center">{t("status") || "Status"}</div>
      ),
      cell: ({ row }) => {
        return (
          <div className="flex justify-center">
            <AppointmentStatusBadge status={row.original.status} />
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => (
        <div className="text-center">{t("actions") || "Actions"}</div>
      ),
      cell: ({ row }) => (
        <AppointmentActionsCell
          appointment={row.original}
          editPermission={editPermission}
          checkoutPermission={checkoutPermission}
        />
      ),
    },
  ];
};
