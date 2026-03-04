// src/services/appointmentConflicts.service.ts
import { Op, Transaction } from "sequelize";
import { sequelize } from "../db";
import { Appointment, Room, Service, Staff } from "../models";
import { AppError } from "../errors/AppError";

export const INACTIVE_FOR_CONFLICT = ["cancelled", "no_show", "completed"];

export function toDate(v: any, code = "validation.invalid_date"): Date {
  if (v instanceof Date) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) {
    throw new AppError("Invalid date", 400, code);
  }
  return d;
}

export function assertTimeValid(startAt: Date, endAt: Date) {
  if (!(startAt instanceof Date) || isNaN(startAt.getTime()))
    throw new AppError(
      "startAt is invalid",
      400,
      "appointment.start_at_invalid",
    );
  if (!(endAt instanceof Date) || isNaN(endAt.getTime()))
    throw new AppError("endAt is invalid", 400, "appointment.end_at_invalid");
  if (endAt <= startAt)
    throw new AppError(
      "endAt must be greater than startAt",
      400,
      "appointment.end_before_start",
    );
}

// overlap: existing.startAt < newEndAt AND existing.endAt > newStartAt
export function buildOverlapWhere(startAt: Date, endAt: Date) {
  return {
    startAt: { [Op.lt]: endAt },
    endAt: { [Op.gt]: startAt },
  };
}

/**
 * Validate service -> room requirement (roomType matches requiredRoomTypeId)
 */
export async function validateRoomRequirement(
  serviceId: number,
  roomId: number | null,
  t: Transaction,
) {
  const service = await Service.findByPk(serviceId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!service)
    throw new AppError("Service not found", 404, "service.not_found");

  const requiredRoomTypeId = (service as any).requiredRoomTypeId as
    | number
    | null;
  if (!requiredRoomTypeId) return;

  if (!roomId) {
    throw new AppError(
      "Room is required for this service",
      400,
      "appointment.room_required",
    );
  }

  const room = await Room.findByPk(roomId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!room) throw new AppError("Room not found", 404, "room.not_found");

  if ((room as any).roomTypeId !== requiredRoomTypeId) {
    throw new AppError(
      "Room type does not match service requirement",
      400,
      "appointment.room_type_mismatch",
    );
  }
}

/**
 * Advisory locks (MySQL) to guarantee no race conditions even if no rows exist yet.
 * If your DB is not MySQL, you can disable these easily.
 */
async function getAdvisoryLock(key: string, t: Transaction) {
  const rows = (await sequelize.query("SELECT GET_LOCK(?, 5) AS l", {
    replacements: [key],
    transaction: t,
  })) as any;

  const v = rows?.[0]?.[0]?.l ?? rows?.[0]?.l;
  // v can be 1 / 0 / null
  if (Number(v) !== 1) {
    throw new AppError("Could not acquire lock", 409, "appointment.lock_busy", {
      key,
    });
  }
}

async function releaseAdvisoryLock(key: string, t: Transaction) {
  await sequelize.query("SELECT RELEASE_LOCK(?)", {
    replacements: [key],
    transaction: t,
  });
}

async function withResourceLocks(
  args: { staffId?: number | null; roomId?: number | null },
  t: Transaction,
  fn: () => Promise<void>,
) {
  const keys: string[] = [];
  if (args.staffId) keys.push(`appt:staff:${args.staffId}`);
  if (args.roomId) keys.push(`appt:room:${args.roomId}`);

  // lock in stable order to avoid deadlocks
  keys.sort();

  try {
    for (const k of keys) await getAdvisoryLock(k, t);
    await fn();
  } finally {
    for (const k of keys.reverse()) await releaseAdvisoryLock(k, t);
  }
}

/**
 * Ensure:
 * - room exists (if provided)
 * - staff exists (if provided)
 * - service->room rule is respected
 * - no overlap conflicts for same room or staff
 */
export async function ensureAppointmentConstraints(opts: {
  startAt: Date;
  endAt: Date;
  serviceId: number;
  roomId?: number | null;
  staffId?: number | null;
  excludeAppointmentId?: number;
  t: Transaction;
}) {
  const {
    startAt,
    endAt,
    serviceId,
    roomId,
    staffId,
    excludeAppointmentId,
    t,
  } = opts;

  assertTimeValid(startAt, endAt);

  // Validate existence (inside tx)
  if (roomId) {
    const room = await Room.findByPk(roomId, { transaction: t });
    if (!room)
      throw new AppError("roomId is invalid", 400, "appointment.room_invalid");
  }

  if (staffId) {
    const staff = await Staff.findByPk(staffId, { transaction: t });
    if (!staff)
      throw new AppError(
        "staffId is invalid",
        400,
        "appointment.staff_invalid",
      );
  }

  await validateRoomRequirement(serviceId, roomId ?? null, t);

  // Strongest guarantee: lock resources (staff/room), then check conflicts.
  await withResourceLocks({ staffId, roomId }, t, async () => {
    const baseWhere: any = {
      ...buildOverlapWhere(startAt, endAt),
      status: { [Op.notIn]: INACTIVE_FOR_CONFLICT },
    };
    if (excludeAppointmentId) baseWhere.id = { [Op.ne]: excludeAppointmentId };

    if (roomId) {
      const roomConflict = await Appointment.findOne({
        where: { ...baseWhere, roomId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (roomConflict) {
        throw new AppError(
          "Room is already booked in this time window",
          409,
          "appointment.room_conflict",
          { conflictId: roomConflict.id, roomId },
        );
      }
    }

    if (staffId) {
      const staffConflict = await Appointment.findOne({
        where: { ...baseWhere, staffId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (staffConflict) {
        throw new AppError(
          "Staff already has an appointment in this time window",
          409,
          "appointment.staff_conflict",
          { conflictId: staffConflict.id, staffId },
        );
      }
    }
  });
}
