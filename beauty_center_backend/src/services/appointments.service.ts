import { Op, Transaction } from "sequelize";
import { Appointment } from "../models/appointment.model";
import { Service } from "../models/service.model";
import { Room } from "../models/room.model";
import { AppError } from "../errors/AppError";

export const INACTIVE_FOR_CONFLICT = ["cancelled", "no_show", "completed"];

type CheckArgs = {
  startAt: Date;
  endAt: Date;
  staffId?: number | null;
  roomId?: number | null;
  excludeAppointmentId?: number;
  t: Transaction;
};
export function toDate(v: any): Date {
  if (v instanceof Date) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) {
    throw new AppError("Invalid date", 400, "validation.invalid_date");
  }
  return d;
}

export async function validateRoomRequirement(
  serviceId: number,
  roomId: number | null,
  t: Transaction,
) {
  const service = await Service.findByPk(serviceId, { transaction: t });
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

  const room = await Room.findByPk(roomId, { transaction: t });
  if (!room) throw new AppError("Room not found", 404, "room.not_found");

  if ((room as any).roomTypeId !== requiredRoomTypeId) {
    throw new AppError(
      "Room type does not match service requirement",
      400,
      "appointment.room_type_mismatch",
    );
  }
}

export async function assertNoOverlap(
  opts: {
    startAt: Date;
    endAt: Date;
    roomId?: number | null;
    staffId?: number | null;
    excludeAppointmentId?: number;
  },
  t: Transaction,
) {
  const { startAt, endAt, roomId, staffId, excludeAppointmentId } = opts;

  if (roomId) {
    const where: any = {
      roomId,
      status: { [Op.notIn]: INACTIVE_FOR_CONFLICT },
      startAt: { [Op.lt]: endAt },
      endAt: { [Op.gt]: startAt },
    };
    if (excludeAppointmentId) where.id = { [Op.ne]: excludeAppointmentId };

    const conflict = await Appointment.findOne({
      where,
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (conflict) {
      throw new AppError(
        "Room is already booked in this time range",
        409,
        "appointment.room_conflict",
      );
    }
  }

  if (staffId) {
    const where: any = {
      staffId,
      status: { [Op.notIn]: INACTIVE_FOR_CONFLICT },
      startAt: { [Op.lt]: endAt },
      endAt: { [Op.gt]: startAt },
    };
    if (excludeAppointmentId) where.id = { [Op.ne]: excludeAppointmentId };

    const conflict = await Appointment.findOne({
      where,
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (conflict) {
      throw new AppError(
        "Staff is already booked in this time range",
        409,
        "appointment.staff_conflict",
      );
    }
  }
}

export async function assertNoStaffRoomConflict(args: CheckArgs) {
  const { startAt, endAt, staffId, roomId, excludeAppointmentId, t } = args;

  if (!(startAt instanceof Date) || isNaN(startAt.getTime()))
    throw new AppError("startAt invalid", 400);

  if (!(endAt instanceof Date) || isNaN(endAt.getTime()))
    throw new AppError("endAt invalid", 400);

  if (endAt <= startAt) throw new AppError("endAt must be after startAt", 400);

  const baseWhere: any = {
    status: { [Op.notIn]: ["cancelled"] }, // adjust if you have more "inactive" statuses
    startAt: { [Op.lt]: endAt },
    endAt: { [Op.gt]: startAt },
  };

  if (excludeAppointmentId) baseWhere.id = { [Op.ne]: excludeAppointmentId };

  // Staff conflict
  if (staffId) {
    const staffConflict = await Appointment.findOne({
      where: { ...baseWhere, staffId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (staffConflict) {
      throw new AppError(
        "Staff is busy in this time range",
        409,
        "appt.staff_busy",
        {
          staffId,
          conflictId: staffConflict.id,
        },
      );
    }
  }

  // Room conflict
  if (roomId) {
    const roomConflict = await Appointment.findOne({
      where: { ...baseWhere, roomId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (roomConflict) {
      throw new AppError(
        "Room is busy in this time range",
        409,
        "appt.room_busy",
        {
          roomId,
          conflictId: roomConflict.id,
        },
      );
    }
  }
}
