import { useTranslation } from "react-i18next";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import AppointmentActionsCell from "@/pages/appointments/_components/AppointmentActionsCell";
import AppointmentStatusBadge from "@/pages/appointments/_components/AppointmentStatusBadge";
import {
  getAppointmentSourceTypeLabel,
  isAppointmentCheckedOut,
} from "@/pages/appointments/appointmentWorkflow";
import {
  formatAppointmentDateTime,
  formatAppointmentTimeRange,
  getAppointmentActualRoomName,
  getAppointmentActualStaffName,
  getAppointmentCustomerName,
  getAppointmentRoomName,
  getAppointmentServiceName,
  getAppointmentStaffName,
} from "@/pages/appointments/appointmentPresentation";
import type { Appointment } from "../types";
import { cn } from "@/lib/utils";

interface AppointmentColumnsProps {
  editPermission: string;
  checkoutPermission: string;
}

export const useAppointmentsColumns = ({
  editPermission,
  checkoutPermission,
}: AppointmentColumnsProps): ColumnDef<Appointment>[] => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "schedule",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.schedule") || "Schedule"}
        </div>
      ),
      cell: ({ row }) => {
        const appointment = row.original;
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <div className="font-medium text-foreground">
              {formatAppointmentDateTime(appointment.startAt, dateLocale, "MMM d")}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatAppointmentTimeRange(
                appointment.startAt,
                appointment.endAt,
                dateLocale,
              )}
            </div>
            {isAppointmentCheckedOut(appointment) ? (
              <Badge className="mt-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                {t("paid") || "Paid"}
              </Badge>
            ) : null}
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "appointment",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.details") || "Appointment details"}
        </div>
      ),
      cell: ({ row }) => {
        const appointment = row.original;
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <div className="font-medium text-foreground">
              {getAppointmentCustomerName(appointment)}
            </div>
            <div className="text-sm text-muted-foreground">
              {getAppointmentServiceName(appointment)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {appointment.sourceType ? (
                <Badge variant="outline">
                  {getAppointmentSourceTypeLabel(t, appointment.sourceType)}
                </Badge>
              ) : null}
              {appointment.customerPackageId ? (
                <Badge variant="outline">#{appointment.customerPackageId}</Badge>
              ) : null}
              {appointment.cancelReason ? (
                <Badge
                  className={cn(
                    "border-rose-500/30 bg-rose-500/10 text-rose-700",
                  )}
                >
                  {t("appointments.cancel_reason") || "Cancel reason"}
                </Badge>
              ) : null}
            </div>
          </div>
        );
      },
      size: 260,
    },
    {
      accessorKey: "assignment",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("appointments.assignment") || "Assignment"}
        </div>
      ),
      cell: ({ row }) => {
        const appointment = row.original;
        const actualStaffChanged =
          appointment.actualStaffId &&
          appointment.actualStaffId !== appointment.staffId &&
          getAppointmentActualStaffName(appointment) !== "-";
        const actualRoomChanged =
          appointment.actualRoomId &&
          appointment.actualRoomId !== appointment.roomId &&
          getAppointmentActualRoomName(appointment) !== "-";

        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <div className="font-medium text-foreground">
              {getAppointmentStaffName(appointment)}
            </div>
            <div className="text-sm text-muted-foreground">
              {getAppointmentRoomName(appointment)}
            </div>
            {actualStaffChanged ? (
              <div className="mt-2 text-xs text-muted-foreground">
                {t("appointments.actual_staff") || "Actual staff"}:{" "}
                {getAppointmentActualStaffName(appointment)}
              </div>
            ) : null}
            {actualRoomChanged ? (
              <div className="text-xs text-muted-foreground">
                {t("appointments.actual_room") || "Actual room"}:{" "}
                {getAppointmentActualRoomName(appointment)}
              </div>
            ) : null}
          </div>
        );
      },
      size: 220,
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
          variant="table"
        />
      ),
      size: 260,
    },
  ];
};
