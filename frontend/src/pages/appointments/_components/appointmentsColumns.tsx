import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit } from "react-icons/fa";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { Appointment } from "../types";

interface AppointmentColumnsProps {
  editPermission: string;
  checkoutPermission: string;
}

const statusStyles: Record<string, string> = {
  booked: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  checked_in: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  in_service: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  no_show: "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

const checkoutAllowedStatuses = new Set([
  "booked",
  "checked_in",
  "in_service",
  "completed",
]);

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
  const navigate = useNavigate();
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
        const status = String(row.original.status || "-");
        return (
          <div className="flex justify-center">
            <Badge
              className={
                statusStyles[status] ||
                "bg-slate-500/15 text-slate-600 border-slate-500/30"
              }
            >
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => (
        <div className="text-center">{t("actions") || "Actions"}</div>
      ),
      cell: ({ row }) => {
        const canCheckout = checkoutAllowedStatuses.has(
          String(row.original.status || ""),
        );
        return (
          <div className="flex justify-center gap-2">
            <ProtectedComponent permission={editPermission}>
              <Button
                variant="outline"
                size="sm"
                className="text-yellow-400 border-yellow-700 hover:bg-yellow-900/20 hover:border-yellow-600 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() =>
                  navigate(`/appointments/edit/${row.original.id}`, {
                    state: { appointment: row.original },
                  })
                }
              >
                <FaEdit className="w-3.5 h-3.5" />
              </Button>
            </ProtectedComponent>
            <ProtectedComponent permission={checkoutPermission}>
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-500 border-emerald-700 hover:bg-emerald-900/20 hover:border-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() =>
                  navigate(`/appointments/checkout/${row.original.id}`, {
                    state: { appointment: row.original },
                  })
                }
                disabled={!canCheckout}
              >
                <CreditCard className="w-3.5 h-3.5" />
              </Button>
            </ProtectedComponent>
          </div>
        );
      },
    },
  ];
};
