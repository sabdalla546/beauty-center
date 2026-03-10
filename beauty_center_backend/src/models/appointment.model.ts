import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db";
import { APPOINTMENT_STATUSES } from "../constants/domain";

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "checked_in"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled";

export type AppointmentSourceType =
  | "single_service"
  | "package"
  | "complimentary"
  | "adjustment";

export class Appointment extends Model<
  InferAttributes<Appointment>,
  InferCreationAttributes<Appointment>
> {
  declare id: CreationOptional<number>;

  declare customerId: number;
  declare serviceId: number;
  declare staffId: number | null;
  declare roomId: number | null;

  declare startAt: Date;
  declare endAt: Date;

  declare sourceType: CreationOptional<AppointmentSourceType>;
  declare sourceId: number | null;
  declare customerPackageId: number | null;
  declare checkoutOrderId: number | null;
  declare checkedOutAt: Date | null;

  declare checkedInAt: Date | null;
  declare startedAt: Date | null;
  declare completedAt: Date | null;
  declare actualStaffId: number | null;
  declare actualRoomId: number | null;
  declare completedBy: number | null;

  declare status: CreationOptional<AppointmentStatus>;
  declare notes: string | null;
  declare internalNotes: string | null;

  declare cancelledAt: Date | null;
  declare cancelledBy: number | null;
  declare cancelReason: string | null;
  declare noShowMarkedAt: Date | null;
  declare noShowMarkedBy: number | null;

  declare rescheduledFromAppointmentId: number | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Appointment.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      field: "id",
    },

    customerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "customer_id",
    },

    serviceId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "service_id",
    },

    staffId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "staff_id",
    },

    roomId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "room_id",
    },

    startAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "start_at",
    },

    endAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "end_at",
    },

    sourceType: {
      type: DataTypes.ENUM(
        "single_service",
        "package",
        "complimentary",
        "adjustment",
      ),
      allowNull: false,
      defaultValue: "single_service",
      field: "source_type",
    },

    sourceId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "source_id",
    },

    customerPackageId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "customer_package_id",
    },

    checkoutOrderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "checkout_order_id",
    },

    checkedOutAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "checked_out_at",
    },

    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "checked_in_at",
    },

    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "started_at",
    },

    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },

    actualStaffId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "actual_staff_id",
    },

    actualRoomId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "actual_room_id",
    },

    completedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "completed_by",
    },

    status: {
      type: DataTypes.ENUM(...APPOINTMENT_STATUSES),
      allowNull: false,
      defaultValue: "booked",
      field: "status",
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "notes",
    },

    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "internal_notes",
    },

    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "cancelled_at",
    },

    cancelledBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "cancelled_by",
    },

    cancelReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "cancel_reason",
    },

    noShowMarkedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "no_show_marked_at",
    },

    noShowMarkedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "no_show_marked_by",
    },

    rescheduledFromAppointmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "rescheduled_from_appointment_id",
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "appointments",
    timestamps: true,
    indexes: [
      { name: "appointments_status_idx", fields: ["status"] },
      { name: "appointments_start_at_idx", fields: ["start_at"] },
      { name: "appointments_staff_start_idx", fields: ["staff_id", "start_at"] },
      { name: "appointments_room_start_idx", fields: ["room_id", "start_at"] },
      {
        name: "appointments_status_start_end_idx",
        fields: ["status", "start_at", "end_at"],
      },
    ],
  },
);

export default Appointment;
