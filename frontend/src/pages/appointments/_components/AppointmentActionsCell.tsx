import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Check,
  CircleOff,
  CreditCard,
  Eye,
  MoreHorizontal,
  Pencil,
  Play,
  ReceiptText,
  RotateCw,
  UserCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHasPermission } from "@/hooks/useHasPermission";
import {
  useCancelAppointment,
  useCheckInAppointment,
  useCompleteAppointment,
  useConfirmAppointment,
  useMarkAppointmentNoShow,
  useRescheduleAppointment,
  useStartAppointmentService,
} from "@/hooks/appointments/useAppointmentMutations";
import {
  canCheckoutAppointment,
  canEditAppointment,
  getAvailableAppointmentActions,
  isAppointmentCheckedOut,
} from "@/pages/appointments/appointmentWorkflow";
import {
  AppointmentAssignmentDialog,
  AppointmentCancelDialog,
  AppointmentDetailsDialog,
  AppointmentRescheduleDialog,
} from "@/pages/appointments/_components/AppointmentWorkflowDialogs";
import type { Appointment } from "@/pages/appointments/types";

interface AppointmentActionsCellProps {
  appointment: Appointment;
  editPermission: string;
  checkoutPermission: string;
}

const AppointmentActionsCell: React.FC<AppointmentActionsCellProps> = ({
  appointment,
  editPermission,
  checkoutPermission,
}) => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const canManageAppointment = useHasPermission(editPermission);
  const canAccessCheckout = useHasPermission(checkoutPermission);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const confirmMutation = useConfirmAppointment(appointment.id);
  const checkInMutation = useCheckInAppointment(appointment.id);
  const startMutation = useStartAppointmentService(appointment.id);
  const completeMutation = useCompleteAppointment(appointment.id);
  const cancelMutation = useCancelAppointment(appointment.id);
  const noShowMutation = useMarkAppointmentNoShow(appointment.id);
  const rescheduleMutation = useRescheduleAppointment(appointment.id);

  const availableActions = getAvailableAppointmentActions(appointment);
  const showEditButton = canManageAppointment && canEditAppointment(appointment);
  const showCheckoutButton =
    canAccessCheckout && canCheckoutAppointment(appointment);
  const showOrderHistoryButton =
    canAccessCheckout && isAppointmentCheckedOut(appointment);

  const actionBusy =
    confirmMutation.isPending ||
    checkInMutation.isPending ||
    startMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    noShowMutation.isPending ||
    rescheduleMutation.isPending;

  const hasMenuActions = availableActions.some((action) =>
    [
      "confirm",
      "check_in",
      "start_service",
      "complete",
      "cancel",
      "mark_no_show",
      "reschedule",
    ].includes(action),
  );
  const canOpenMenu = canManageAppointment && hasMenuActions;

  return (
    <>
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="shadow-sm"
          onClick={() => setDetailsOpen(true)}
          title={t("appointments.view_details") || "View details"}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>

        {showEditButton ? (
          <Button
            variant="outline"
            size="sm"
            className="text-yellow-500 border-yellow-700 hover:bg-yellow-900/20 hover:border-yellow-600 shadow-sm"
            onClick={() =>
              navigate(`/appointments/edit/${appointment.id}`, {
                state: { appointment },
              })
            }
            title={t("appointments.edit") || "Edit appointment"}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}

        {showCheckoutButton ? (
          <Button
            variant="outline"
            size="sm"
            className="text-emerald-500 border-emerald-700 hover:bg-emerald-900/20 hover:border-emerald-600 shadow-sm"
            onClick={() =>
              navigate(`/appointments/checkout/${appointment.id}`, {
                state: { appointment },
              })
            }
            title={t("appointments.checkout") || "Appointment checkout"}
          >
            <CreditCard className="h-3.5 w-3.5" />
          </Button>
        ) : null}

        {showOrderHistoryButton ? (
          <Button
            variant="outline"
            size="sm"
            className="shadow-sm"
            onClick={() =>
              navigate(`/pos/history?orderId=${appointment.checkoutOrderId}`)
            }
            title={t("appointments.open_order_history") || "Open order history"}
          >
            <ReceiptText className="h-3.5 w-3.5" />
          </Button>
        ) : null}

        {canOpenMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shadow-sm"
                disabled={actionBusy}
                title={t("appointments.more_actions") || "More actions"}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableActions.includes("confirm") ? (
                <DropdownMenuItem
                  onClick={() => confirmMutation.mutate({})}
                  disabled={actionBusy}
                >
                  <Check />
                  {t("appointments.confirm") || "Confirm appointment"}
                </DropdownMenuItem>
              ) : null}

              {availableActions.includes("check_in") ? (
                <DropdownMenuItem
                  onClick={() => checkInMutation.mutate({})}
                  disabled={actionBusy}
                >
                  <UserCheck />
                  {t("appointments.check_in") || "Check in"}
                </DropdownMenuItem>
              ) : null}

              {availableActions.includes("start_service") ? (
                <DropdownMenuItem
                  onClick={() => setStartOpen(true)}
                  disabled={actionBusy}
                >
                  <Play />
                  {t("appointments.start_service") || "Start service"}
                </DropdownMenuItem>
              ) : null}

              {availableActions.includes("complete") ? (
                <DropdownMenuItem
                  onClick={() => setCompleteOpen(true)}
                  disabled={actionBusy}
                >
                  <Check />
                  {t("appointments.complete") || "Complete"}
                </DropdownMenuItem>
              ) : null}

              {availableActions.includes("reschedule") ? (
                <DropdownMenuItem
                  onClick={() => setRescheduleOpen(true)}
                  disabled={actionBusy}
                >
                  <RotateCw />
                  {t("appointments.reschedule") || "Reschedule"}
                </DropdownMenuItem>
              ) : null}

              {availableActions.includes("mark_no_show") ? (
                <DropdownMenuItem
                  onClick={() => noShowMutation.mutate({})}
                  disabled={actionBusy}
                >
                  <CircleOff />
                  {t("appointments.mark_no_show") || "Mark no-show"}
                </DropdownMenuItem>
              ) : null}

              {availableActions.includes("cancel") ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCancelOpen(true)}
                    disabled={actionBusy}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle />
                    {t("appointments.cancel_title") || "Cancel appointment"}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <AppointmentDetailsDialog
        appointment={appointment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onOpenOrderHistory={(orderId) =>
          navigate(`/pos/history?orderId=${orderId}`)
        }
      />

      <AppointmentCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        isPending={cancelMutation.isPending}
        onSubmit={(values) =>
          cancelMutation.mutate(values, {
            onSuccess: () => setCancelOpen(false),
          })
        }
      />

      <AppointmentAssignmentDialog
        appointment={appointment}
        open={startOpen}
        onOpenChange={setStartOpen}
        isPending={startMutation.isPending}
        title={t("appointments.start_service_title") || "Start service"}
        description={
          t("appointments.start_service_description") ||
          "Optionally override the staff member or room before starting."
        }
        confirmLabel={t("appointments.start_service") || "Start service"}
        onSubmit={(values) =>
          startMutation.mutate(values, {
            onSuccess: () => setStartOpen(false),
          })
        }
      />

      <AppointmentAssignmentDialog
        appointment={appointment}
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        isPending={completeMutation.isPending}
        title={t("appointments.complete_title") || "Complete appointment"}
        description={
          t("appointments.complete_description") ||
          "Optionally update the actual staff member or room before completing."
        }
        confirmLabel={t("appointments.complete") || "Complete"}
        onSubmit={(values) =>
          completeMutation.mutate(values, {
            onSuccess: () => setCompleteOpen(false),
          })
        }
      />

      <AppointmentRescheduleDialog
        appointment={appointment}
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        isPending={rescheduleMutation.isPending}
        onSubmit={(values) =>
          rescheduleMutation.mutate(values, {
            onSuccess: () => setRescheduleOpen(false),
          })
        }
      />
    </>
  );
};

export default AppointmentActionsCell;
