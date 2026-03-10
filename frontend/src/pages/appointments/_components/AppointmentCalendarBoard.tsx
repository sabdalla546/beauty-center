import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { ar, enUS } from "date-fns/locale";
import {
  CalendarRange,
  ChevronDown,
  CheckCircle2,
  CreditCard,
  DoorClosed,
  Package2,
  Scissors,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import AppointmentActionsCell from "@/pages/appointments/_components/AppointmentActionsCell";
import AppointmentStatusBadge from "@/pages/appointments/_components/AppointmentStatusBadge";
import {
  canCheckoutAppointment,
  getAppointmentSourceTypeLabel,
  isAppointmentCheckedOut,
} from "@/pages/appointments/appointmentWorkflow";
import {
  formatAppointmentDateTime,
  formatAppointmentDurationMinutes,
  formatAppointmentTimeRange,
  getAppointmentActualRoomName,
  getAppointmentActualStaffName,
  getAppointmentCustomerName,
  getAppointmentRoomName,
  getAppointmentServiceName,
  getAppointmentStaffName,
} from "@/pages/appointments/appointmentPresentation";
import type { Appointment } from "@/pages/appointments/types";
import { cn } from "@/lib/utils";

interface AppointmentCalendarBoardProps {
  appointments: Appointment[];
  editPermission: string;
  checkoutPermission: string;
}

type DayGroup = {
  key: string;
  label: string;
  sublabel: string;
  appointments: Appointment[];
  awaitingArrivalCount: number;
  inProgressCount: number;
  readyForCheckoutCount: number;
};

const getDayKey = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const AppointmentEventCard = ({
  appointment,
  editPermission,
  checkoutPermission,
  dense = false,
}: {
  appointment: Appointment;
  editPermission: string;
  checkoutPermission: string;
  dense?: boolean;
}) => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;
  const scheduledStaff = getAppointmentStaffName(appointment);
  const actualStaff = getAppointmentActualStaffName(appointment);
  const scheduledRoom = getAppointmentRoomName(appointment);
  const actualRoom = getAppointmentActualRoomName(appointment);
  const durationMinutes = formatAppointmentDurationMinutes(appointment);
  const actualStaffChanged =
    appointment.actualStaffId &&
    appointment.actualStaffId !== appointment.staffId &&
    actualStaff !== "-";
  const actualRoomChanged =
    appointment.actualRoomId &&
    appointment.actualRoomId !== appointment.roomId &&
    actualRoom !== "-";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-background/95 shadow-sm transition-colors hover:border-primary/25 hover:bg-background",
        dense ? "p-3" : "p-4",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium"
            >
              {formatAppointmentTimeRange(
                appointment.startAt,
                appointment.endAt,
                dateLocale,
              )}
            </Badge>
            {durationMinutes ? (
              <Badge
                variant="outline"
                className="rounded-full bg-background px-2 py-0.5 text-[11px]"
              >
                <Scissors className="h-3 w-3" />
                {durationMinutes} {t("appointments.minutes") || "min"}
              </Badge>
            ) : null}
          </div>

          <div
            className={cn(
              "mt-2 font-semibold text-foreground",
              dense ? "text-sm" : "text-base",
            )}
          >
            {getAppointmentCustomerName(appointment)}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {getAppointmentServiceName(appointment)}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <AppointmentStatusBadge
            status={appointment.status}
            className="px-2 py-0.5 text-[11px]"
          />
          {isAppointmentCheckedOut(appointment) ? (
            <Badge className="border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              {t("paid") || "Paid"}
            </Badge>
          ) : null}
          {canCheckoutAppointment(appointment) ? (
            <Badge className="border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700">
              <CreditCard className="h-3 w-3" />
              {t("appointments.ready_for_checkout") || "Ready for checkout"}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <UserRound className="h-3 w-3" />
            {t("appointments.staff") || "Staff"}
          </div>
          <div className="mt-1 truncate font-medium text-foreground">
            {scheduledStaff}
          </div>
          {actualStaffChanged ? (
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {t("appointments.actual_staff") || "Actual staff"}: {actualStaff}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <DoorClosed className="h-3 w-3" />
            {t("appointments.room") || "Room"}
          </div>
          <div className="mt-1 truncate font-medium text-foreground">
            {scheduledRoom}
          </div>
          {actualRoomChanged ? (
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {t("appointments.actual_room") || "Actual room"}: {actualRoom}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {appointment.sourceType ? (
          <Badge
            variant="outline"
            className="bg-background px-2 py-0.5 text-[11px]"
          >
            <Package2 className="h-3 w-3" />
            {getAppointmentSourceTypeLabel(t, appointment.sourceType)}
          </Badge>
        ) : null}
        {appointment.customerPackageId ? (
          <Badge
            variant="outline"
            className="bg-background px-2 py-0.5 text-[11px]"
          >
            #{appointment.customerPackageId}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 border-t border-border/70 pt-3">
        <AppointmentActionsCell
          appointment={appointment}
          editPermission={editPermission}
          checkoutPermission={checkoutPermission}
          variant={dense ? "table" : "card"}
        />
      </div>
    </div>
  );
};

const AppointmentCalendarBoard: React.FC<AppointmentCalendarBoardProps> = ({
  appointments,
  editPermission,
  checkoutPermission,
}) => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const groupedDays = useMemo<DayGroup[]>(() => {
    const sorted = [...appointments].sort((left, right) => {
      return (
        new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
      );
    });

    const groups = new Map<string, Appointment[]>();
    sorted.forEach((appointment) => {
      const key = getDayKey(appointment.startAt);
      if (!key) return;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(appointment);
    });

    return Array.from(groups.entries()).map(([key, dayAppointments]) => {
      const date = new Date(`${key}T00:00:00`);
      const awaitingArrivalCount = dayAppointments.filter((appointment) =>
        ["booked", "confirmed"].includes(
          String(appointment.status).trim().toLowerCase(),
        ),
      ).length;
      const inProgressCount = dayAppointments.filter((appointment) =>
        ["checked_in", "in_service"].includes(
          String(appointment.status).trim().toLowerCase(),
        ),
      ).length;
      const readyForCheckoutCount = dayAppointments.filter((appointment) =>
        canCheckoutAppointment(appointment),
      ).length;

      return {
        key,
        label: formatAppointmentDateTime(date, dateLocale, "EEEE"),
        sublabel: formatAppointmentDateTime(date, dateLocale, "MMM d"),
        appointments: dayAppointments,
        awaitingArrivalCount,
        inProgressCount,
        readyForCheckoutCount,
      };
    });
  }, [appointments, dateLocale]);

  const summaryCards = [
    {
      key: "range_total",
      label: t("appointments.range_total") || "Appointments in range",
      value: appointments.length,
      tone: "bg-primary/10 text-primary",
    },
    {
      key: "awaiting_arrival",
      label: t("appointments.awaiting_arrival") || "Awaiting arrival",
      value: appointments.filter((appointment) =>
        ["booked", "confirmed"].includes(String(appointment.status).toLowerCase()),
      ).length,
      tone: "bg-cyan-500/10 text-cyan-700",
    },
    {
      key: "in_progress",
      label: t("appointments.in_progress") || "In progress",
      value: appointments.filter((appointment) =>
        ["checked_in", "in_service"].includes(
          String(appointment.status).toLowerCase(),
        ),
      ).length,
      tone: "bg-amber-500/10 text-amber-700",
    },
    {
      key: "ready_for_checkout",
      label: t("appointments.ready_for_checkout") || "Ready for checkout",
      value: appointments.filter((appointment) => canCheckoutAppointment(appointment))
        .length,
      tone: "bg-emerald-500/10 text-emerald-700",
    },
  ];

  const toggleDayCollapse = (dayKey: string) => {
    setCollapsedDays((current) => ({
      ...current,
      [dayKey]: !current[dayKey],
    }));
  };

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <div className="border-b border-border bg-muted/20 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarRange className="h-4 w-4 text-primary" />
              {t("appointments.live_board") || "Live calendar board"}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("appointments.live_board_hint") ||
                "Scan today's flow, spot bottlenecks, and act without opening every row."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.key}
                className={cn(
                  "min-w-[120px] rounded-2xl border border-border px-4 py-3 text-center",
                  card.tone,
                )}
              >
                <div className="text-2xl font-semibold">{card.value}</div>
                <div className="text-xs font-medium">{card.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {groupedDays.length ? (
        <div className="overflow-x-auto px-6 py-5">
          <div className="grid min-w-full gap-4 lg:grid-flow-col lg:auto-cols-[minmax(300px,1fr)]">
            {groupedDays.map((group) => {
                const dense =
                  group.appointments.length >= 7 || appointments.length >= 18;
                const cardGridClass =
                  groupedDays.length === 1
                    ? "md:grid-cols-2 2xl:grid-cols-3"
                    : groupedDays.length === 2
                      ? "xl:grid-cols-2"
                      : "";

                return (
                  <div
                    key={group.key}
                    className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/10"
                  >
                    <div className="border-b border-border/60 bg-background/70 p-4 backdrop-blur-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {group.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {group.sublabel} | {group.appointments.length}{" "}
                            {t("appointments.title") || "Appointments"}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <Badge
                            variant="outline"
                            className="bg-background px-2 py-0.5 text-[11px]"
                          >
                            {t("appointments.awaiting_arrival") ||
                              "Awaiting arrival"}
                            : {group.awaitingArrivalCount}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-background px-2 py-0.5 text-[11px]"
                          >
                            {t("appointments.in_progress") || "In progress"}:{" "}
                            {group.inProgressCount}
                          </Badge>
                          <Badge
                            className="border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700"
                          >
                            {t("appointments.ready_for_checkout") ||
                              "Ready for checkout"}
                            : {group.readyForCheckoutCount}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => toggleDayCollapse(group.key)}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <span>
                              {collapsedDays[group.key]
                                ? t("appointments.expand_day") || "Expand"
                                : t("appointments.collapse_day") || "Collapse"}
                            </span>
                            <motion.span
                              animate={{ rotate: collapsedDays[group.key] ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </motion.span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {!collapsedDays[group.key] ? (
                        <motion.div
                          key={`${group.key}-content`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div
                            className={cn(
                              "p-4",
                              dense && "max-h-[72vh] overflow-y-auto",
                            )}
                          >
                            <div className={cn("grid grid-cols-1 gap-3", cardGridClass)}>
                              {group.appointments.map((appointment) => (
                                <AppointmentEventCard
                                  key={appointment.id}
                                  appointment={appointment}
                                  editPermission={editPermission}
                                  checkoutPermission={checkoutPermission}
                                  dense={dense}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={`${group.key}-collapsed`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.16 }}
                          className="px-4 py-3 text-xs text-muted-foreground"
                        >
                          {group.appointments.length}{" "}
                          {t("appointments.collapsed_day_summary") ||
                            "appointments hidden in this day."}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <div className="text-sm font-medium text-foreground">
            {t("appointments.no_matching_appointments") ||
              "No appointments match the current filters."}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {t("appointments.live_board_empty_hint") ||
              "Adjust the date range or filters to view appointments on the board."}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AppointmentCalendarBoard;
