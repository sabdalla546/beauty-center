import {
  APPOINTMENT_RESCHEDULE_ALLOWED_TARGETS,
  APPOINTMENT_STATUS_UPDATE_ALLOWED,
  type AppointmentStatus,
} from "../constants/domain";

export const APPOINTMENT_STATUS_FLOW: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  booked: ["confirmed", "checked_in", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_service", "cancelled"],
  in_service: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
  rescheduled: [],
};

export const TERMINAL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
];

export const canTransitionAppointmentStatus = (
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean => {
  if (from === to) return true;
  const allowed = APPOINTMENT_STATUS_FLOW[from] ?? [];
  return allowed.includes(to);
};

export const isTerminalAppointmentStatus = (status: string) =>
  TERMINAL_APPOINTMENT_STATUSES.includes(status as AppointmentStatus);

const now = () => new Date();

const clearExecutionAndClosureFieldsForStatus = (status: AppointmentStatus) => {
  switch (status) {
    case "booked":
    case "confirmed":
      return {
        checkedInAt: null,
        startedAt: null,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        noShowMarkedAt: null,
        noShowMarkedBy: null,
      };
    case "checked_in":
      return {
        startedAt: null,
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        noShowMarkedAt: null,
        noShowMarkedBy: null,
      };
    case "in_service":
      return {
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        noShowMarkedAt: null,
        noShowMarkedBy: null,
      };
    case "completed":
      return {
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        noShowMarkedAt: null,
        noShowMarkedBy: null,
      };
    case "cancelled":
      return {
        noShowMarkedAt: null,
        noShowMarkedBy: null,
        completedAt: null,
        completedBy: null,
      };
    case "no_show":
      return {
        cancelledAt: null,
        cancelledBy: null,
        cancelReason: null,
        completedAt: null,
        completedBy: null,
        startedAt: null,
      };
    case "rescheduled":
      return {
        noShowMarkedAt: null,
        noShowMarkedBy: null,
      };
    default:
      return {};
  }
};

export function buildAppointmentStatusPatch(args: {
  nextStatus: AppointmentStatus;
  userId: number | null;
  body?: any;
  row?: any;
}) {
  const { nextStatus, userId, body, row } = args;

  const effects: Record<string, any> = {
    status: nextStatus,
    ...clearExecutionAndClosureFieldsForStatus(nextStatus),
  };

  if (nextStatus === "checked_in") {
    effects.checkedInAt = row?.checkedInAt ?? now();
  }

  if (nextStatus === "in_service") {
    effects.checkedInAt = row?.checkedInAt ?? now();
    effects.startedAt = row?.startedAt ?? now();

    if (body?.actualStaffId !== undefined) {
      effects.actualStaffId = body.actualStaffId ?? null;
    }
    if (body?.actualRoomId !== undefined) {
      effects.actualRoomId = body.actualRoomId ?? null;
    }
  }

  if (nextStatus === "completed") {
    effects.checkedInAt = row?.checkedInAt ?? now();
    effects.startedAt = row?.startedAt ?? now();
    effects.completedAt = row?.completedAt ?? now();
    effects.completedBy = userId ?? null;

    if (body?.actualStaffId !== undefined) {
      effects.actualStaffId = body.actualStaffId ?? null;
    }
    if (body?.actualRoomId !== undefined) {
      effects.actualRoomId = body.actualRoomId ?? null;
    }
  }

  if (nextStatus === "cancelled") {
    effects.cancelledAt = now();
    effects.cancelledBy = userId ?? null;
    effects.cancelReason = body?.cancelReason ?? null;
  }

  if (nextStatus === "no_show") {
    effects.noShowMarkedAt = now();
    effects.noShowMarkedBy = userId ?? null;
  }

  return effects;
}

export { APPOINTMENT_STATUS_UPDATE_ALLOWED, APPOINTMENT_RESCHEDULE_ALLOWED_TARGETS };
