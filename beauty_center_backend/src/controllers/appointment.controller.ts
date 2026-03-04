// src/controllers/appointment.controller.ts
import { Request, Response } from "express";
import { Op } from "sequelize";
import { AppError } from "../errors/AppError";
import { asyncHandler } from "../middlewares/asyncHandler";
import { sequelize } from "../db";

import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from "../validators/appointment";

import { Appointment, Customer, Order, Room, Service, Staff } from "../models";

import {
  ensureAppointmentConstraints,
  toDate,
} from "../services/appointmentConflicts.service";

export const getAppointmentsCalendar = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to, staffId, roomId } = req.query as any;

    if (!from || !to)
      throw new AppError(
        req.t?.("appointment.range_required", "from and to are required") ??
          "from and to are required",
        400,
        "appointment.range_required",
      );

    const fromDate = new Date(from);
    const toDate2 = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate2.getTime()))
      throw new AppError(
        req.t?.("appointment.range_invalid", "Invalid from/to dates") ??
          "Invalid from/to dates",
        400,
        "appointment.range_invalid",
      );

    const where: any = {
      startAt: { [Op.lt]: toDate2 },
      endAt: { [Op.gt]: fromDate },
    };
    if (staffId) where.staffId = Number(staffId);
    if (roomId) where.roomId = Number(roomId);

    const rows = await Appointment.findAll({
      where,
      attributes: [
        "id",
        "customerId",
        "serviceId",
        "staffId",
        "roomId",
        "startAt",
        "endAt",
        "status",
        "notes",
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
        { model: Room, as: "room", attributes: ["id", "name"] },
      ],
      order: [
        ["startAt", "ASC"],
        ["id", "ASC"],
      ],
    });

    res.json({ data: rows });
  },
);

export const createAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = createAppointmentSchema.safeParse(req.body);
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

    const data = parsed.data as any;

    // validate FK basics fast (customer)
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
      // Load service (tx) for duration calc if endAt is missing
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

      // ✅ endAt optional: if missing, auto-calc from service.durationMinutes
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

      // ✅ Step 4: service-room rule + staff/room existence + overlap checks + advisory locks
      await ensureAppointmentConstraints({
        startAt,
        endAt,
        serviceId: Number((service as any).id),
        roomId: data.roomId ?? null,
        staffId: data.staffId ?? null,
        t,
      });

      const row = await Appointment.create(
        { ...data, startAt, endAt },
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

    const existing = await Appointment.findByPk(id);
    if (!existing)
      throw new AppError(
        req.t?.("appointment.not_found", "Appointment not found") ??
          "Appointment not found",
        404,
        "appointment.not_found",
      );

    // ✅ Prevent editing time/assignment after check-in
    const statusNow = String((existing as any).status || "");
    const LOCKED_STATUSES = ["checked_in", "in_service"];
    const triedToChangeCore =
      (parsed.data as any).startAt !== undefined ||
      (parsed.data as any).endAt !== undefined ||
      (parsed.data as any).serviceId !== undefined ||
      (parsed.data as any).roomId !== undefined ||
      (parsed.data as any).staffId !== undefined;

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

    const startAt = next.startAt
      ? toDate(next.startAt, "appointment.invalid_date")
      : new Date((existing as any).startAt);

    // endAt raw from body (optional)
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

    const t = await sequelize.transaction();
    try {
      // 🔒 If appointment already checked out -> disallow editing core fields
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

      // Load service (tx)
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

      // ✅ Smart endAt:
      // - if endAt provided -> use it
      // - else if startAt OR serviceId changed -> recalc endAt from duration
      // - else keep existing endAt
      const startOrServiceChanged =
        next.startAt !== undefined || next.serviceId !== undefined;

      const endAt: Date =
        endAtFromBody ??
        (startOrServiceChanged
          ? new Date(startAt.getTime() + durationMinutes * 60_000)
          : new Date((existing as any).endAt));

      // ✅ Step 4: constraints + locks + overlap checks (excluding current appointment)
      await ensureAppointmentConstraints({
        startAt,
        endAt,
        serviceId: Number((service as any).id),
        roomId: nextRoomId ?? null,
        staffId: nextStaffId ?? null,
        excludeAppointmentId: id,
        t,
      });

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
      const row = await Appointment.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!row) {
        throw new AppError(
          req.t?.("appointment.not_found", "Appointment not found") ??
            "Appointment not found",
          404,
          "appointment.not_found",
        );
      }

      // 🔒 If appointment already checked out -> disallow status changes
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

      await row.update({ status: parsed.data.status } as any, {
        transaction: t,
      });

      await t.commit();
      res.json({ data: row });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);
