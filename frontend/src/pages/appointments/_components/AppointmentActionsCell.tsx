import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Check,
  CircleOff,
  ChevronDown,
  CreditCard,
  Eye,
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
  DropdownMenuLabel,
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
  getPrimaryAppointmentAction,
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
  variant?: "table" | "card";
}

const AppointmentActionsCell: React.FC<AppointmentActionsCellProps> = ({
  appointment,
  editPermission,
  checkoutPermission,
  variant = "table",
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
  const primaryAction = getPrimaryAppointmentAction(appointment);
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

  const hasMenuActions =
    canManageAppointment &&
    (availableActions.some((action) =>
      [
        "confirm",
        "check_in",
        "start_service",
        "complete",
        "cancel",
        "mark_no_show",
        "reschedule",
      ].includes(action),
    ) ||
      showEditButton);
  const canOpenMenu = canManageAppointment && hasMenuActions;
  const compact = variant === "table";

  const handlePrimaryAction = () => {
    switch (primaryAction) {
      case "confirm":
        confirmMutation.mutate({});
        return;
      case "check_in":
        checkInMutation.mutate({});
        return;
      case "start_service":
        setStartOpen(true);
        return;
      case "complete":
        setCompleteOpen(true);
        return;
      case "checkout":
        navigate(`/appointments/checkout/${appointment.id}`, {
          state: { appointment },
        });
        return;
      default:
        return;
    }
  };

  const getPrimaryLabel = () => {
    switch (primaryAction) {
      case "confirm":
        return t("appointments.confirm") || "Confirm appointment";
      case "check_in":
        return t("appointments.check_in") || "Check in";
      case "start_service":
        return t("appointments.start_service") || "Start service";
      case "complete":
        return t("appointments.complete") || "Complete";
      case "checkout":
        return t("appointments.checkout_now") || "Checkout";
      default:
        return "";
    }
  };

  const getPrimaryIcon = () => {
    switch (primaryAction) {
      case "confirm":
      case "complete":
        return <Check className="h-3.5 w-3.5" />;
      case "check_in":
        return <UserCheck className="h-3.5 w-3.5" />;
      case "start_service":
        return <Play className="h-3.5 w-3.5" />;
      case "checkout":
        return <CreditCard className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const menuActions = availableActions.filter((action) => action !== primaryAction);
  const hasWorkflowActions = menuActions.some((action) =>
    ["confirm", "check_in", "start_service", "complete"].includes(action),
  );
  const hasManageActions =
    showEditButton || menuActions.includes("reschedule") || (compact && showOrderHistoryButton);
  const hasExceptionActions =
    menuActions.includes("mark_no_show") || menuActions.includes("cancel");

  return (
    <>
      <div
        className={
          compact
            ? "flex justify-center gap-2"
            : "flex flex-wrap items-center gap-2"
        }
      >
        <Button
          variant="outline"
          size="sm"
          className={compact ? "shadow-sm" : "shadow-sm"}
          onClick={() => setDetailsOpen(true)}
          title={t("appointments.view_details") || "View details"}
        >
          <Eye className="h-3.5 w-3.5" />
          {!compact ? <span>{t("appointments.view_details") || "View details"}</span> : null}
        </Button>

        {primaryAction && ((primaryAction !== "checkout" && canManageAppointment) || (primaryAction === "checkout" && showCheckoutButton)) ? (
          <Button
            size="sm"
            className={
              primaryAction === "checkout"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : undefined
            }
            onClick={handlePrimaryAction}
            disabled={actionBusy}
            title={getPrimaryLabel()}
          >
            {getPrimaryIcon()}
            <span>{getPrimaryLabel()}</span>
          </Button>
        ) : null}

        {showOrderHistoryButton && !compact ? (
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
            <span>{t("appointments.open_order_history") || "Open order history"}</span>
          </Button>
        ) : null}

        {showEditButton && !canOpenMenu ? (
          <Button
            variant="outline"
            size="sm"
            className="text-yellow-600 border-yellow-700/40 hover:bg-yellow-500/10 hover:border-yellow-600 shadow-sm"
            onClick={() =>
              navigate(`/appointments/edit/${appointment.id}`, {
                state: { appointment },
              })
            }
            title={t("appointments.edit") || "Edit appointment"}
          >
            <Pencil className="h-3.5 w-3.5" />
            {!compact ? (
              <span>{t("appointments.edit") || "Edit appointment"}</span>
            ) : null}
          </Button>
        ) : null}

        {showOrderHistoryButton && compact ? (
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
                <span>{compact ? t("actions") || "Actions" : t("appointments.more_actions") || "More actions"}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {hasWorkflowActions ? (
                <>
                  <DropdownMenuLabel>
                    {t("appointments.action_group_workflow") || "Workflow"}
                  </DropdownMenuLabel>
                  {menuActions.includes("confirm") ? (
                    <DropdownMenuItem
                      onClick={() => confirmMutation.mutate({})}
                      disabled={actionBusy}
                    >
                      <Check />
                      {t("appointments.confirm") || "Confirm appointment"}
                    </DropdownMenuItem>
                  ) : null}

                  {menuActions.includes("check_in") ? (
                    <DropdownMenuItem
                      onClick={() => checkInMutation.mutate({})}
                      disabled={actionBusy}
                    >
                      <UserCheck />
                      {t("appointments.check_in") || "Check in"}
                    </DropdownMenuItem>
                  ) : null}

                  {menuActions.includes("start_service") ? (
                    <DropdownMenuItem
                      onClick={() => setStartOpen(true)}
                      disabled={actionBusy}
                    >
                      <Play />
                      {t("appointments.start_service") || "Start service"}
                    </DropdownMenuItem>
                  ) : null}

                  {menuActions.includes("complete") ? (
                    <DropdownMenuItem
                      onClick={() => setCompleteOpen(true)}
                      disabled={actionBusy}
                    >
                      <Check />
                      {t("appointments.complete") || "Complete"}
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}

              {hasManageActions ? (
                <>
                  {hasWorkflowActions ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>
                    {t("appointments.action_group_manage") || "Manage"}
                  </DropdownMenuLabel>
                </>
              ) : null}

              {showEditButton ? (
                <DropdownMenuItem
                  onClick={() =>
                    navigate(`/appointments/edit/${appointment.id}`, {
                      state: { appointment },
                    })
                  }
                >
                  <Pencil />
                  {t("appointments.edit") || "Edit appointment"}
                </DropdownMenuItem>
              ) : null}

              {menuActions.includes("reschedule") ? (
                <DropdownMenuItem
                  onClick={() => setRescheduleOpen(true)}
                  disabled={actionBusy}
                >
                  <RotateCw />
                  {t("appointments.reschedule") || "Reschedule"}
                </DropdownMenuItem>
              ) : null}

              {compact && showOrderHistoryButton ? (
                <DropdownMenuItem
                  onClick={() =>
                    navigate(`/pos/history?orderId=${appointment.checkoutOrderId}`)
                  }
                >
                  <ReceiptText />
                  {t("appointments.open_order_history") || "Open order history"}
                </DropdownMenuItem>
              ) : null}

              {hasExceptionActions ? (
                <>
                  {hasWorkflowActions || hasManageActions ? (
                    <DropdownMenuSeparator />
                  ) : null}
                  <DropdownMenuLabel>
                    {t("appointments.action_group_exception") || "Exceptions"}
                  </DropdownMenuLabel>
                </>
              ) : null}

              {menuActions.includes("mark_no_show") ? (
                <DropdownMenuItem
                  onClick={() => noShowMutation.mutate({})}
                  disabled={actionBusy}
                >
                  <CircleOff />
                  {t("appointments.mark_no_show") || "Mark no-show"}
                </DropdownMenuItem>
              ) : null}

              {menuActions.includes("cancel") ? (
                <DropdownMenuItem
                  onClick={() => setCancelOpen(true)}
                  disabled={actionBusy}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle />
                  {t("appointments.cancel_title") || "Cancel appointment"}
                </DropdownMenuItem>
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
        appointment={appointment}
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
