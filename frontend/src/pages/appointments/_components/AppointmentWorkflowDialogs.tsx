import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, type Locale } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { CalendarRange, DoorClosed, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";
import { useRooms } from "@/hooks/rooms/useRooms";
import { useStaff } from "@/hooks/staff/useStaff";
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
import AppointmentStatusBadge from "@/pages/appointments/_components/AppointmentStatusBadge";
import type { Appointment } from "@/pages/appointments/types";
import type {
  AppointmentAssignmentValues,
  AppointmentCancelValues,
  AppointmentRescheduleValues,
} from "@/hooks/appointments/useAppointmentMutations";
import { cn } from "@/lib/utils";

const toInputDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateTime = (value?: string | null, locale: Locale = enUS) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM d, yyyy h:mm a", { locale });
};

const RESPONSIVE_DIALOG_CLASSNAME =
  "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden p-0";

const RESPONSIVE_DIALOG_HEADER_CLASSNAME =
  "border-b border-border px-4 py-4 text-start sm:px-6 sm:py-5";

const RESPONSIVE_DIALOG_BODY_CLASSNAME =
  "min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5";

const RESPONSIVE_DIALOG_FOOTER_CLASSNAME =
  "border-t border-border px-4 py-4 sm:px-6";

type AppointmentDetailsDialogProps = {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenOrderHistory?: (orderId: number) => void;
};

export const AppointmentDetailsDialog: React.FC<
  AppointmentDetailsDialogProps
> = ({ appointment, open, onOpenChange, onOpenOrderHistory }) => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  const rows = useMemo(
    () =>
      [
        {
          label: t("appointments.customer") || "Customer",
          value:
            getAppointmentCustomerName(appointment),
        },
        {
          label: t("appointments.service") || "Service",
          value: getAppointmentServiceName(appointment),
        },
        {
          label: t("appointments.staff") || "Staff",
          value: getAppointmentStaffName(appointment),
        },
        {
          label: t("appointments.actual_staff") || "Actual staff",
          value: getAppointmentActualStaffName(appointment),
        },
        {
          label: t("appointments.room") || "Room",
          value: getAppointmentRoomName(appointment),
        },
        {
          label: t("appointments.actual_room") || "Actual room",
          value: getAppointmentActualRoomName(appointment),
        },
        {
          label: t("appointments.source_type") || "Source type",
          value: getAppointmentSourceTypeLabel(t, appointment?.sourceType),
        },
        {
          label: t("appointments.source_id") || "Source ID",
          value:
            appointment?.sourceId !== undefined && appointment?.sourceId !== null
              ? `#${appointment.sourceId}`
              : "-",
        },
        {
          label: t("appointments.customer_package") || "Customer package",
          value:
            appointment?.customerPackageId !== undefined &&
            appointment?.customerPackageId !== null
              ? `#${appointment.customerPackageId}`
              : "-",
        },
        {
          label: t("appointments.start") || "Start time",
          value: formatDateTime(appointment?.startAt, dateLocale),
        },
        {
          label: t("appointments.end") || "End time",
          value: formatDateTime(appointment?.endAt, dateLocale),
        },
        {
          label: t("appointments.checked_in_at") || "Checked in at",
          value: formatDateTime(appointment?.checkedInAt, dateLocale),
        },
        {
          label: t("appointments.started_at") || "Started at",
          value: formatDateTime(appointment?.startedAt, dateLocale),
        },
        {
          label: t("appointments.completed_at") || "Completed at",
          value: formatDateTime(appointment?.completedAt, dateLocale),
        },
        {
          label: t("appointments.cancelled_at") || "Cancelled at",
          value: formatDateTime(appointment?.cancelledAt, dateLocale),
        },
        {
          label: t("appointments.no_show_marked_at") || "No-show marked at",
          value: formatDateTime(appointment?.noShowMarkedAt, dateLocale),
        },
        {
          label: t("appointments.checked_out_at") || "Checked out at",
          value: formatDateTime(appointment?.checkedOutAt, dateLocale),
        },
        {
          label: t("appointments.checkout_order") || "Checkout order",
          value:
            appointment?.checkoutOrderId !== undefined &&
            appointment?.checkoutOrderId !== null
              ? `#${appointment.checkoutOrderId}`
              : "-",
        },
        {
          label: t("appointments.rescheduled_from") || "Rescheduled from",
          value:
            appointment?.rescheduledFromAppointmentId !== undefined &&
            appointment?.rescheduledFromAppointmentId !== null
              ? `#${appointment.rescheduledFromAppointmentId}`
              : "-",
        },
      ].filter((row) => row.value && row.value !== "-"),
    [appointment, dateLocale, t],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(RESPONSIVE_DIALOG_CLASSNAME, "sm:max-w-2xl")}>
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col" dir={i18n.dir()}>
          <DialogHeader className={RESPONSIVE_DIALOG_HEADER_CLASSNAME}>
            <DialogTitle>
              {t("appointments.view_details") || "Appointment details"}
            </DialogTitle>
            <DialogDescription>
              {t("appointments.details_hint") ||
                "Review the appointment before checkout."}
            </DialogDescription>
          </DialogHeader>

          {appointment ? (
            <div className={cn(RESPONSIVE_DIALOG_BODY_CLASSNAME, "space-y-4")}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    {getAppointmentCustomerName(appointment)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getAppointmentServiceName(appointment)}
                  </div>
                </div>
                <AppointmentStatusBadge status={appointment.status} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div className="text-xs text-muted-foreground">{row.label}</div>
                    <div className="mt-1 break-words text-sm font-medium text-foreground">
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>

              {appointment.cancelReason ? (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t("appointments.cancel_reason") || "Cancel reason"}
                  </div>
                  <div className="mt-1 break-words text-sm text-foreground">
                    {appointment.cancelReason}
                  </div>
                </div>
              ) : null}

              {appointment.notes ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t("appointments.notes") || "Notes"}
                  </div>
                  <div className="mt-1 break-words text-sm text-foreground">
                    {appointment.notes}
                  </div>
                </div>
              ) : null}

              {appointment.internalNotes ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t("appointments.internal_notes") || "Internal notes"}
                  </div>
                  <div className="mt-1 break-words text-sm text-foreground">
                    {appointment.internalNotes}
                  </div>
                </div>
              ) : null}

              {isAppointmentCheckedOut(appointment) ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-foreground">
                  <div className="font-medium">
                    {t("appointments.already_checked_out") ||
                      "This appointment has already been checked out."}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {t("appointments.already_checked_out_hint") ||
                      "Financial checkout is separate from operational completion."}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className={RESPONSIVE_DIALOG_FOOTER_CLASSNAME}>
            {appointment?.checkoutOrderId && onOpenOrderHistory ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenOrderHistory(appointment.checkoutOrderId!)}
              >
                {t("appointments.open_order_history") || "Open order history"}
              </Button>
            ) : null}
            <Button type="button" onClick={() => onOpenChange(false)}>
              {t("appointments.close") || "Close"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

type AppointmentCancelDialogProps = {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (values: AppointmentCancelValues) => void;
};

export const AppointmentCancelDialog: React.FC<
  AppointmentCancelDialogProps
> = ({ appointment, open, onOpenChange, isPending, onSubmit }) => {
  const { t, i18n } = useTranslation("common");
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setCancelReason("");
      setError("");
    }
  }, [open]);

  const handleSubmit = () => {
    const reason = cancelReason.trim();
    if (!reason) {
      setError(
        t("appointments.cancel_reason_required") ||
          "Cancel reason is required.",
      );
      return;
    }

    onSubmit({ cancelReason: reason });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(RESPONSIVE_DIALOG_CLASSNAME, "sm:max-w-lg")}>
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col" dir={i18n.dir()}>
          <DialogHeader className={RESPONSIVE_DIALOG_HEADER_CLASSNAME}>
            <DialogTitle>
              {t("appointments.cancel_title") || "Cancel appointment"}
            </DialogTitle>
            <DialogDescription>
              {t("appointments.cancel_description") ||
                "Provide a reason before cancelling this appointment."}
            </DialogDescription>
          </DialogHeader>

          <div className={cn(RESPONSIVE_DIALOG_BODY_CLASSNAME, "space-y-4")}>
            <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4">
              <div className="text-sm font-medium text-foreground">
                {getAppointmentCustomerName(appointment)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {getAppointmentServiceName(appointment)}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {formatAppointmentTimeRange(appointment.startAt, appointment.endAt)}
              </div>
            </div>

            <label className="text-sm font-medium text-foreground">
              {t("appointments.cancel_reason") || "Cancel reason"}
            </label>
            <textarea
              rows={4}
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                if (error) setError("");
              }}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder={
                t("appointments.cancel_reason_placeholder") ||
                "Explain why this appointment is being cancelled."
              }
            />
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
          </div>

          <DialogFooter className={RESPONSIVE_DIALOG_FOOTER_CLASSNAME}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {t("appointments.cancel_title") || "Cancel appointment"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

type AppointmentAssignmentDialogProps = {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onSubmit: (values: AppointmentAssignmentValues) => void;
};

export const AppointmentAssignmentDialog: React.FC<
  AppointmentAssignmentDialogProps
> = ({
  appointment,
  open,
  onOpenChange,
  isPending,
  title,
  description,
  confirmLabel,
  onSubmit,
}) => {
  const { t, i18n } = useTranslation("common");
  const [staffSearch, setStaffSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [actualStaffId, setActualStaffId] = useState<number | undefined>();
  const [actualRoomId, setActualRoomId] = useState<number | undefined>();

  const staffQuery = useStaff({
    currentPage: 1,
    itemsPerPage: 50,
    searchQuery: staffSearch,
    enabled: open,
  });
  const roomsQuery = useRooms({
    searchQuery: roomSearch,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setActualStaffId(
      appointment.actualStaffId ?? appointment.staffId ?? undefined,
    );
    setActualRoomId(appointment.actualRoomId ?? appointment.roomId ?? undefined);
  }, [appointment, open]);

  const staff = staffQuery.data?.data ?? [];
  const rooms = roomsQuery.data?.data ?? [];
  const scheduledStaff = getAppointmentStaffName(appointment);
  const scheduledRoom = getAppointmentRoomName(appointment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(RESPONSIVE_DIALOG_CLASSNAME, "sm:max-w-lg")}>
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col" dir={i18n.dir()}>
          <DialogHeader className={RESPONSIVE_DIALOG_HEADER_CLASSNAME}>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className={cn(RESPONSIVE_DIALOG_BODY_CLASSNAME, "space-y-4")}>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="text-sm font-medium text-foreground">
                {getAppointmentCustomerName(appointment)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {getAppointmentServiceName(appointment)}
              </div>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                    {t("appointments.staff") || "Staff"}
                  </div>
                  <div className="mt-1 break-words font-medium text-foreground">
                    {scheduledStaff}
                  </div>
                </div>
                <div className="rounded-lg bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <DoorClosed className="h-3.5 w-3.5" />
                    {t("appointments.room") || "Room"}
                  </div>
                  <div className="mt-1 break-words font-medium text-foreground">
                    {scheduledRoom}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                {t("appointments.actual_staff") || "Actual staff"}
              </label>
              <SearchableSelect
                value={actualStaffId ? String(actualStaffId) : ""}
                onValueChange={(value) =>
                  setActualStaffId(value ? Number(value) : undefined)
                }
                placeholder={t("appointments.select_staff") || "Select staff"}
                searchPlaceholder={t("appointments.search_staff") || "Search staff..."}
                onSearch={setStaffSearch}
                isLoading={staffQuery.isLoading}
                emptyMessage={t("appointments.no_staff") || "No staff found"}
                allowClear={!!actualStaffId}
                onClear={() => setActualStaffId(undefined)}
                dir={i18n.dir()}
              >
                {staff.length ? (
                  staff.map((member) => (
                    <SearchableSelectItem key={member.id} value={String(member.id)}>
                      {member.displayName ||
                        `${member.user?.firstName ?? ""} ${
                          member.user?.lastName ?? ""
                        }`.trim() ||
                        member.user?.email ||
                        `#${member.id}`}
                    </SearchableSelectItem>
                  ))
                ) : (
                  <SearchableSelectEmpty
                    message={t("appointments.no_staff") || "No staff found"}
                  />
                )}
              </SearchableSelect>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                {t("appointments.actual_room") || "Actual room"}
              </label>
              <SearchableSelect
                value={actualRoomId ? String(actualRoomId) : ""}
                onValueChange={(value) =>
                  setActualRoomId(value ? Number(value) : undefined)
                }
                placeholder={t("appointments.select_room") || "Select room"}
                searchPlaceholder={t("appointments.search_rooms") || "Search rooms..."}
                onSearch={setRoomSearch}
                isLoading={roomsQuery.isLoading}
                emptyMessage={t("appointments.no_rooms") || "No rooms found"}
                allowClear={!!actualRoomId}
                onClear={() => setActualRoomId(undefined)}
                dir={i18n.dir()}
              >
                {rooms.length ? (
                  rooms.map((room) => (
                    <SearchableSelectItem key={room.id} value={String(room.id)}>
                      {room.name}
                    </SearchableSelectItem>
                  ))
                ) : (
                  <SearchableSelectEmpty
                    message={t("appointments.no_rooms") || "No rooms found"}
                  />
                )}
              </SearchableSelect>
            </div>
          </div>

          <DialogFooter className={RESPONSIVE_DIALOG_FOOTER_CLASSNAME}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={() =>
                onSubmit({
                  actualStaffId: actualStaffId ?? null,
                  actualRoomId: actualRoomId ?? null,
                })
              }
              disabled={isPending}
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

type AppointmentRescheduleDialogProps = {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (values: AppointmentRescheduleValues) => void;
};

export const AppointmentRescheduleDialog: React.FC<
  AppointmentRescheduleDialogProps
> = ({ appointment, open, onOpenChange, isPending, onSubmit }) => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;
  const [staffSearch, setStaffSearch] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [newStartAt, setNewStartAt] = useState("");
  const [newEndAt, setNewEndAt] = useState("");
  const [staffId, setStaffId] = useState<number | undefined>();
  const [roomId, setRoomId] = useState<number | undefined>();
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"booked" | "confirmed">("booked");
  const [error, setError] = useState("");

  const staffQuery = useStaff({
    currentPage: 1,
    itemsPerPage: 50,
    searchQuery: staffSearch,
    enabled: open,
  });
  const roomsQuery = useRooms({
    searchQuery: roomSearch,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setNewStartAt(toInputDateTime(appointment.startAt));
    setNewEndAt(toInputDateTime(appointment.endAt));
    setStaffId(appointment.staffId ?? undefined);
    setRoomId(appointment.roomId ?? undefined);
    setReason("");
    setStatus("booked");
    setError("");
  }, [appointment, open]);

  const staff = staffQuery.data?.data ?? [];
  const rooms = roomsQuery.data?.data ?? [];

  const handleSubmit = () => {
    if (!newStartAt.trim()) {
      setError(
        t("appointments.reschedule_start_required") ||
          "New start time is required.",
      );
      return;
    }

    if (newEndAt.trim()) {
      const start = new Date(newStartAt);
      const end = new Date(newEndAt);
      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end <= start
      ) {
        setError(
          t("appointments.reschedule_end_after_start") ||
            "New end time must be after the new start time.",
        );
        return;
      }
    }

    onSubmit({
      newStartAt,
      newEndAt: newEndAt.trim() || undefined,
      staffId: staffId ?? null,
      roomId: roomId ?? null,
      reason: reason.trim() || null,
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(RESPONSIVE_DIALOG_CLASSNAME, "sm:max-w-xl")}>
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col" dir={i18n.dir()}>
          <DialogHeader className={RESPONSIVE_DIALOG_HEADER_CLASSNAME}>
            <DialogTitle>
              {t("appointments.reschedule_title") || "Reschedule appointment"}
            </DialogTitle>
            <DialogDescription>
              {t("appointments.reschedule_description") ||
                "Choose the new slot and optional assignment overrides."}
            </DialogDescription>
          </DialogHeader>

          <div className={cn(RESPONSIVE_DIALOG_BODY_CLASSNAME, "space-y-4")}>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {getAppointmentCustomerName(appointment)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {getAppointmentServiceName(appointment)}
                  </div>
                </div>
                <AppointmentStatusBadge status={appointment.status} />
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {t("appointments.original_schedule") || "Current slot"}
                  </div>
                  <div className="mt-1 break-words font-medium text-foreground">
                    {formatAppointmentDateTime(appointment.startAt, dateLocale)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatAppointmentTimeRange(
                      appointment.startAt,
                      appointment.endAt,
                      dateLocale,
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                    {t("appointments.staff") || "Staff"}
                  </div>
                  <div className="mt-1 break-words font-medium text-foreground">
                    {getAppointmentStaffName(appointment)}
                  </div>
                </div>

                <div className="rounded-lg bg-background/80 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <DoorClosed className="h-3.5 w-3.5" />
                    {t("appointments.room") || "Room"}
                  </div>
                  <div className="mt-1 break-words font-medium text-foreground">
                    {getAppointmentRoomName(appointment)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("appointments.new_start") || "New start time"}
                </label>
                <Input
                  type="datetime-local"
                  value={newStartAt}
                  onChange={(event) => {
                    setNewStartAt(event.target.value);
                    if (error) setError("");
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("appointments.new_end") || "New end time"}
                </label>
                <Input
                  type="datetime-local"
                  value={newEndAt}
                  onChange={(event) => {
                    setNewEndAt(event.target.value);
                    if (error) setError("");
                  }}
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("appointments.end_optional") ||
                    "Leave blank to auto-calculate from service duration."}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("appointments.staff") || "Staff"}
                </label>
                <SearchableSelect
                  value={staffId ? String(staffId) : ""}
                  onValueChange={(value) =>
                    setStaffId(value ? Number(value) : undefined)
                  }
                  placeholder={t("appointments.select_staff") || "Select staff"}
                  searchPlaceholder={
                    t("appointments.search_staff") || "Search staff..."
                  }
                  onSearch={setStaffSearch}
                  isLoading={staffQuery.isLoading}
                  emptyMessage={t("appointments.no_staff") || "No staff found"}
                  allowClear={!!staffId}
                  onClear={() => setStaffId(undefined)}
                  dir={i18n.dir()}
                >
                  {staff.length ? (
                    staff.map((member) => (
                      <SearchableSelectItem
                        key={member.id}
                        value={String(member.id)}
                      >
                        {member.displayName ||
                          `${member.user?.firstName ?? ""} ${
                            member.user?.lastName ?? ""
                          }`.trim() ||
                          member.user?.email ||
                          `#${member.id}`}
                      </SearchableSelectItem>
                    ))
                  ) : (
                    <SearchableSelectEmpty
                      message={t("appointments.no_staff") || "No staff found"}
                    />
                  )}
                </SearchableSelect>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("appointments.room") || "Room"}
                </label>
                <SearchableSelect
                  value={roomId ? String(roomId) : ""}
                  onValueChange={(value) =>
                    setRoomId(value ? Number(value) : undefined)
                  }
                  placeholder={t("appointments.select_room") || "Select room"}
                  searchPlaceholder={
                    t("appointments.search_rooms") || "Search rooms..."
                  }
                  onSearch={setRoomSearch}
                  isLoading={roomsQuery.isLoading}
                  emptyMessage={t("appointments.no_rooms") || "No rooms found"}
                  allowClear={!!roomId}
                  onClear={() => setRoomId(undefined)}
                  dir={i18n.dir()}
                >
                  {rooms.length ? (
                    rooms.map((room) => (
                      <SearchableSelectItem key={room.id} value={String(room.id)}>
                        {room.name}
                      </SearchableSelectItem>
                    ))
                  ) : (
                    <SearchableSelectEmpty
                      message={t("appointments.no_rooms") || "No rooms found"}
                    />
                  )}
                </SearchableSelect>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  {t("appointments.new_status") || "New appointment status"}
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as "booked" | "confirmed")
                  }
                >
                  <option value="booked">
                    {t("appointments.status_booked") || "Booked"}
                  </option>
                  <option value="confirmed">
                    {t("appointments.status_confirmed") || "Confirmed"}
                  </option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground">
                  {t("appointments.reason_optional") || "Reason"}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={
                    t("appointments.reason_placeholder") ||
                    "Optional reason for rescheduling."
                  }
                />
              </div>
            </div>

            {error ? <div className="text-sm text-destructive">{error}</div> : null}
          </div>

          <DialogFooter className={RESPONSIVE_DIALOG_FOOTER_CLASSNAME}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {t("appointments.reschedule") || "Reschedule"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
