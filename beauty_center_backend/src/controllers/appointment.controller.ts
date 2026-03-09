import { Request, Response } from "express";
import { Op, Transaction } from "sequelize";
import { AppError } from "../errors/AppError";
import { asyncHandler } from "../middlewares/asyncHandler";
import { sequelize } from "../db/db";

import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  confirmAppointmentSchema,
  checkInAppointmentSchema,
  startAppointmentServiceSchema,
  completeAppointmentSchema,
  cancelAppointmentSchema,
  markAppointmentNoShowSchema,
  rescheduleAppointmentSchema,
} from "../validators/appointment";
import {
  Appointment,
  Customer,
  CustomerPackage,
  Order,
  Room,
  Service,
  Staff,
} from "../models";

import {
  ensureAppointmentConstraints,
  toDate,
} from "../services/appointmentConflicts.service";
import { sendReportResponse } from "../utils/reportExport";
const invalidAppointmentInput = (
  req: Request,
  res: Response,
  details: unknown,
) =>
  res.status(400).json({
    error: {
      message:
        req.t?.("appointment.invalid_input", "Invalid input") ??
        "Invalid input",
      details,
    },
  });
const APPOINTMENT_STATUS_FLOW: Record<string, string[]> = {
  booked: ["confirmed", "checked_in", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_service", "cancelled"],
  in_service: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
  rescheduled: [],
};

const canTransitionAppointmentStatus = (from: string, to: string): boolean => {
  if (from === to) return true;
  const allowed = APPOINTMENT_STATUS_FLOW[from] ?? [];
  return allowed.includes(to);
};

const isTerminalAppointmentStatus = (status: string) =>
  ["completed", "cancelled", "no_show", "rescheduled"].includes(status);

const now = () => new Date();

const clearExecutionAndClosureFieldsForStatus = (status: string) => {
  // used when setting terminal/transition states in a consistent way
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

const buildStatusSideEffects = ({
  currentStatus,
  nextStatus,
  userId,
  body,
  row,
}: {
  currentStatus: string;
  nextStatus: string;
  userId: number | null;
  body?: any;
  row?: any;
}) => {
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
};

const buildCalendarWhere = (query: {
  from?: string;
  to?: string;
  staffId?: string | number;
  roomId?: string | number;
}) => {
  const { from, to, staffId, roomId } = query;

  if (!from || !to) {
    throw new AppError(
      "from and to are required",
      400,
      "appointment.range_required",
    );
  }

  const fromDate = new Date(from);
  const toDate2 = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate2.getTime())) {
    throw new AppError(
      "Invalid from/to dates",
      400,
      "appointment.range_invalid",
    );
  }

  const where: any = {
    startAt: { [Op.lt]: toDate2 },
    endAt: { [Op.gt]: fromDate },
  };
  if (staffId) where.staffId = Number(staffId);
  if (roomId) where.roomId = Number(roomId);

  return where;
};

const loadAppointmentsCalendarRows = async (query: {
  from?: string;
  to?: string;
  staffId?: string | number;
  roomId?: string | number;
}) =>
  Appointment.findAll({
    where: buildCalendarWhere(query),
    attributes: [
      "id",
      "customerId",
      "serviceId",
      "staffId",
      "roomId",
      "actualStaffId",
      "actualRoomId",
      "customerPackageId",
      "sourceType",
      "sourceId",
      "startAt",
      "endAt",
      "checkedInAt",
      "startedAt",
      "completedAt",
      "status",
      "notes",
      "internalNotes",
      "cancelReason",
      "cancelledAt",
      "noShowMarkedAt",
      "rescheduledFromAppointmentId",
      "createdAt",
      "updatedAt",
    ],
    include: [
      {
        model: Customer,
        as: "customer",
        attributes: ["id", "firstName", "lastName", "phone"],
      },
      {
        model: Service,
        as: "service",
        attributes: ["id", "name", "durationMinutes", "priceFils"],
      },
      { model: Staff, as: "staff", attributes: ["id", "displayName"] },
      {
        model: Staff,
        as: "actualStaff",
        attributes: ["id", "displayName"],
        required: false,
      },
      { model: Room, as: "room", attributes: ["id", "name"] },
      {
        model: Room,
        as: "actualRoom",
        attributes: ["id", "name"],
        required: false,
      },
      {
        model: CustomerPackage,
        as: "customerPackage",
        attributes: ["id", "planId", "status", "totalSessions", "usedSessions"],
        required: false,
      },
    ],
    order: [
      ["startAt", "ASC"],
      ["id", "ASC"],
    ],
  });

const filterAppointmentsBySearch = (rows: any[], rawSearch?: string) => {
  const search = String(rawSearch || "")
    .trim()
    .toLowerCase();
  if (!search) return rows;

  return rows.filter((appointment) => {
    const customerName = `${appointment.customer?.firstName ?? ""} ${
      appointment.customer?.lastName ?? ""
    }`.toLowerCase();
    const serviceName = String(appointment.service?.name ?? "").toLowerCase();
    const staffName = String(
      appointment.staff?.displayName ?? "",
    ).toLowerCase();
    const actualStaffName = String(
      appointment.actualStaff?.displayName ?? "",
    ).toLowerCase();
    const roomName = String(appointment.room?.name ?? "").toLowerCase();
    const actualRoomName = String(
      appointment.actualRoom?.name ?? "",
    ).toLowerCase();
    const status = String(appointment.status ?? "").toLowerCase();
    const phone = String(appointment.customer?.phone ?? "").toLowerCase();
    const sourceType = String(appointment.sourceType ?? "").toLowerCase();

    return (
      customerName.includes(search) ||
      serviceName.includes(search) ||
      staffName.includes(search) ||
      actualStaffName.includes(search) ||
      roomName.includes(search) ||
      actualRoomName.includes(search) ||
      status.includes(search) ||
      sourceType.includes(search) ||
      phone.includes(search)
    );
  });
};

const getUserId = (req: Request) => Number((req as any).user?.id || 0) || null;

const loadAppointmentForStatusChange = async (
  id: number,
  t: Transaction,
): Promise<any> => {
  const row = await Appointment.findByPk(id, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (!row) {
    throw new AppError("Appointment not found", 404, "appointment.not_found");
  }

  const checkedOutOrder = await Order.findOne({
    where: { externalRef: `appt:${id}` },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });

  if (checkedOutOrder) {
    throw new AppError(
      "Appointment cannot be modified after checkout",
      400,
      "appointment.locked_after_checkout",
      { orderId: (checkedOutOrder as any).id },
    );
  }

  return row;
};

const transitionAppointmentStatus = async ({
  req,
  row,
  nextStatus,
  transaction,
  body,
}: {
  req: Request;
  row: any;
  nextStatus: string;
  transaction: Transaction;
  body?: any;
}) => {
  const currentStatus = String(row.status || "booked");

  if (!canTransitionAppointmentStatus(currentStatus, nextStatus)) {
    throw new AppError(
      req.t?.(
        "appointment.invalid_status_transition",
        "Invalid appointment status transition",
      ) ?? "Invalid appointment status transition",
      400,
      "appointment.invalid_status_transition",
      {
        from: currentStatus,
        to: nextStatus,
      },
    );
  }

  if (
    nextStatus === "cancelled" &&
    !body?.cancelReason &&
    ["checked_in", "in_service"].includes(currentStatus)
  ) {
    throw new AppError(
      req.t?.(
        "appointment.cancel_reason_required",
        "cancelReason is required when cancelling an active appointment",
      ) ?? "cancelReason is required when cancelling an active appointment",
      400,
      "appointment.cancel_reason_required",
    );
  }

  const userId = getUserId(req);

  const patch = buildStatusSideEffects({
    currentStatus,
    nextStatus,
    userId,
    body,
    row,
  });

  await row.update(patch, { transaction });

  return row;
};

export const getAppointmentsCalendar = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to, staffId, roomId } = req.query as any;
    const rows = await loadAppointmentsCalendarRows({
      from,
      to,
      staffId,
      roomId,
    });

    res.json({ data: rows });
  },
);

export const exportAppointmentsPdf = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to, staffId, roomId, search } = req.query as any;
    const rows = filterAppointmentsBySearch(
      await loadAppointmentsCalendarRows({ from, to, staffId, roomId }),
      search,
    );

    return sendReportResponse(
      res,
      "appointments",
      {
        filters: {
          from: from ?? null,
          to: to ?? null,
          staffId: staffId ? Number(staffId) : null,
          roomId: roomId ? Number(roomId) : null,
          search: search ? String(search) : null,
        },
        summary: {
          appointmentsCount: rows.length,
        },
        appointments: rows.map((row: any) => ({
          id: Number(row.id),
          customerName:
            `${row.customer?.firstName ?? ""} ${
              row.customer?.lastName ?? ""
            }`.trim() || "-",
          customerPhone: row.customer?.phone ?? "-",
          serviceName: row.service?.name ?? "-",
          staffName: row.staff?.displayName ?? "-",
          actualStaffName: row.actualStaff?.displayName ?? "-",
          roomName: row.room?.name ?? "-",
          actualRoomName: row.actualRoom?.name ?? "-",
          sourceType: row.sourceType ?? "-",
          customerPackageId: row.customerPackageId ?? null,
          startAt: row.startAt,
          endAt: row.endAt,
          checkedInAt: row.checkedInAt ?? null,
          startedAt: row.startedAt ?? null,
          completedAt: row.completedAt ?? null,
          cancelledAt: row.cancelledAt ?? null,
          noShowMarkedAt: row.noShowMarkedAt ?? null,
          status: row.status ?? "-",
          notes: row.notes ?? "-",
          internalNotes: row.internalNotes ?? "-",
          cancelReason: row.cancelReason ?? "-",
        })),
      },
      "pdf",
    );
  },
);

export const createAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }

    const data = parsed.data as any;

    const customer = await Customer.findByPk(data.customerId);
    if (!customer)
      throw new AppError(
        req.t?.("appointment.customer_invalid", "customerId is invalid") ??
          "customerId is invalid",
        400,
        "appointment.customer_invalid",
      );

    const t = await sequelize.transaction();
    try {
      const service = await Service.findByPk(Number(data.serviceId), {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!service)
        throw new AppError(
          req.t?.("appointment.service_invalid", "serviceId is invalid") ??
            "serviceId is invalid",
          400,
          "appointment.service_invalid",
        );

      const startAt = toDate(data.startAt, "appointment.invalid_date");

      let endAt: Date;
      if (data.endAt) {
        endAt = toDate(data.endAt, "appointment.invalid_date");
      } else {
        const mins = Number((service as any).durationMinutes ?? 0);
        if (!mins || mins <= 0)
          throw new AppError(
            "Service duration invalid",
            400,
            "service.duration_invalid",
          );
        endAt = new Date(startAt.getTime() + mins * 60_000);
      }

      await ensureAppointmentConstraints({
        startAt,
        endAt,
        serviceId: Number((service as any).id),
        roomId: data.roomId ?? null,
        staffId: data.staffId ?? null,
        t,
      });

      const initialStatus = data.status ?? "booked";

      if (!["booked", "confirmed"].includes(initialStatus)) {
        throw new AppError(
          req.t?.(
            "appointment.invalid_initial_status",
            "Only booked or confirmed are allowed as initial appointment status",
          ) ??
            "Only booked or confirmed are allowed as initial appointment status",
          400,
          "appointment.invalid_initial_status",
        );
      }

      if (data.sourceType === "package" && data.customerPackageId) {
        const cp = await CustomerPackage.findByPk(
          Number(data.customerPackageId),
          {
            transaction: t,
            lock: t.LOCK.UPDATE,
          },
        );

        if (!cp) {
          throw new AppError(
            "customerPackageId is invalid",
            400,
            "appointment.customer_package_invalid",
          );
        }

        if (Number((cp as any).customerId) !== Number(data.customerId)) {
          throw new AppError(
            "Selected package does not belong to the appointment customer",
            400,
            "appointment.customer_package_customer_mismatch",
          );
        }
      }

      const row = await Appointment.create(
        {
          ...data,
          status: initialStatus,
          startAt,
          endAt,
        },
        { transaction: t },
      );

      await t.commit();
      res.status(201).json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);

export const updateAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const parsed = updateAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }

    const existing = await Appointment.findByPk(id);
    if (!existing)
      throw new AppError(
        req.t?.("appointment.not_found", "Appointment not found") ??
          "Appointment not found",
        404,
        "appointment.not_found",
      );

    const statusNow = String((existing as any).status || "");
    const LOCKED_STATUSES = [
      "checked_in",
      "in_service",
      "completed",
      "cancelled",
      "no_show",
      "rescheduled",
    ];

    const triedToChangeCore =
      (parsed.data as any).startAt !== undefined ||
      (parsed.data as any).endAt !== undefined ||
      (parsed.data as any).serviceId !== undefined ||
      (parsed.data as any).roomId !== undefined ||
      (parsed.data as any).staffId !== undefined;

    if (
      isTerminalAppointmentStatus(statusNow) &&
      Object.keys(parsed.data as any).length > 0
    ) {
      throw new AppError(
        req.t?.(
          "appointment.locked_terminal_status",
          "Appointment cannot be modified after reaching terminal status",
        ) ?? "Appointment cannot be modified after reaching terminal status",
        400,
        "appointment.locked_terminal_status",
        { status: statusNow },
      );
    }

    if (LOCKED_STATUSES.includes(statusNow) && triedToChangeCore) {
      throw new AppError(
        req.t?.(
          "appointment.locked_after_checkin",
          "Appointment time/assignment cannot be modified after check-in",
        ) ?? "Appointment time/assignment cannot be modified after check-in",
        400,
        "appointment.locked_after_checkin",
        { status: statusNow },
      );
    }

    const next: any = { ...(parsed.data as any) };

    if (next.status !== undefined) {
      throw new AppError(
        req.t?.(
          "appointment.status_update_via_status_endpoint_only",
          "Use status endpoint to update appointment status",
        ) ?? "Use status endpoint to update appointment status",
        400,
        "appointment.status_update_via_status_endpoint_only",
      );
    }

    const startAt = next.startAt
      ? toDate(next.startAt, "appointment.invalid_date")
      : new Date((existing as any).startAt);

    const endAtFromBody =
      next.endAt !== undefined &&
      next.endAt !== null &&
      String(next.endAt).length
        ? toDate(next.endAt, "appointment.invalid_date")
        : null;

    const nextServiceId = next.serviceId ?? (existing as any).serviceId;
    const nextRoomId =
      next.roomId !== undefined ? next.roomId : (existing as any).roomId;
    const nextStaffId =
      next.staffId !== undefined ? next.staffId : (existing as any).staffId;
    const nextCustomerId =
      next.customerId !== undefined
        ? next.customerId
        : (existing as any).customerId;

    const t = await sequelize.transaction();
    try {
      const checkedOutOrder = await Order.findOne({
        where: { externalRef: `appt:${id}` },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (checkedOutOrder) {
        throw new AppError(
          req.t?.(
            "appointment.locked_after_checkout",
            "Appointment cannot be modified after checkout",
          ) ?? "Appointment cannot be modified after checkout",
          400,
          "appointment.locked_after_checkout",
          { orderId: (checkedOutOrder as any).id },
        );
      }

      const service = await Service.findByPk(Number(nextServiceId), {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!service)
        throw new AppError(
          req.t?.("appointment.service_invalid", "serviceId is invalid") ??
            "serviceId is invalid",
          400,
          "appointment.service_invalid",
        );

      const durationMinutes = Number((service as any).durationMinutes ?? 0);
      if (!durationMinutes || durationMinutes <= 0) {
        throw new AppError(
          "Service duration invalid",
          400,
          "service.duration_invalid",
        );
      }

      const startOrServiceChanged =
        next.startAt !== undefined || next.serviceId !== undefined;

      const endAt: Date =
        endAtFromBody ??
        (startOrServiceChanged
          ? new Date(startAt.getTime() + durationMinutes * 60_000)
          : new Date((existing as any).endAt));

      await ensureAppointmentConstraints({
        startAt,
        endAt,
        serviceId: Number((service as any).id),
        roomId: nextRoomId ?? null,
        staffId: nextStaffId ?? null,
        excludeAppointmentId: id,
        t,
      });

      if (next.sourceType === "package" && next.customerPackageId) {
        const cp = await CustomerPackage.findByPk(
          Number(next.customerPackageId),
          {
            transaction: t,
            lock: t.LOCK.UPDATE,
          },
        );

        if (!cp) {
          throw new AppError(
            "customerPackageId is invalid",
            400,
            "appointment.customer_package_invalid",
          );
        }

        if (Number((cp as any).customerId) !== Number(nextCustomerId)) {
          throw new AppError(
            "Selected package does not belong to the appointment customer",
            400,
            "appointment.customer_package_customer_mismatch",
          );
        }
      }

      await existing.update({ ...next, startAt, endAt }, { transaction: t });

      await t.commit();
      res.json({ data: existing });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);

export const updateAppointmentStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = updateAppointmentStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }

    const t = await sequelize.transaction();

    try {
      const row = await loadAppointmentForStatusChange(id, t);

      await transitionAppointmentStatus({
        req,
        row,
        nextStatus: parsed.data.status,
        transaction: t,
        body: parsed.data,
      });

      await t.commit();
      return res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);

/**
 * Domain helpers / explicit workflow endpoints
 * These are cleaner for frontend than sending raw statuses everywhere.
 */

export const confirmAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = confirmAppointmentSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }

    const t = await sequelize.transaction();

    try {
      const row = await loadAppointmentForStatusChange(id, t);

      await transitionAppointmentStatus({
        req,
        row,
        nextStatus: "confirmed",
        transaction: t,
        body: parsed.data,
      });

      await t.commit();
      return res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);

export const checkInAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = checkInAppointmentSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }

    const t = await sequelize.transaction();

    try {
      const row = await loadAppointmentForStatusChange(id, t);

      await transitionAppointmentStatus({
        req,
        row,
        nextStatus: "checked_in",
        transaction: t,
        body: parsed.data,
      });

      await t.commit();
      return res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);

export const startAppointmentService = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = startAppointmentServiceSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }

    const t = await sequelize.transaction();

    try {
      const row = await loadAppointmentForStatusChange(id, t);

      await transitionAppointmentStatus({
        req,
        row,
        nextStatus: "in_service",
        transaction: t,
        body: parsed.data,
      });

      await t.commit();
      return res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);

export const completeAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = completeAppointmentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }

    const t = await sequelize.transaction();

    try {
      const row = await loadAppointmentForStatusChange(id, t);

      await transitionAppointmentStatus({
        req,
        row,
        nextStatus: "completed",
        transaction: t,
        body: parsed.data,
      });

      await t.commit();
      return res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);
export const cancelAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = cancelAppointmentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }
    const t = await sequelize.transaction();

    try {
      const row = await loadAppointmentForStatusChange(id, t);

      await transitionAppointmentStatus({
        req,
        row,
        nextStatus: "cancelled",
        transaction: t,
        body: parsed.data,
      });

      await t.commit();
      return res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);

export const markAppointmentNoShow = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = markAppointmentNoShowSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return invalidAppointmentInput(req, res, parsed.error.flatten());
    }

    const t = await sequelize.transaction();

    try {
      const row = await loadAppointmentForStatusChange(id, t);

      await transitionAppointmentStatus({
        req,
        row,
        nextStatus: "no_show",
        transaction: t,
        body: parsed.data,
      });

      await t.commit();
      return res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);
export const rescheduleAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const parsed = rescheduleAppointmentSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("appointment.invalid_input", "Invalid input") ??
            "Invalid input",
          details: flat,
        },
      });
    }

    const t = await sequelize.transaction();

    try {
      const row = await loadAppointmentForStatusChange(id, t);

      await transitionAppointmentStatus({
        req,
        row,
        nextStatus: "rescheduled",
        transaction: t,
        body: parsed.data,
      });

      await t.commit();
      return res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);
