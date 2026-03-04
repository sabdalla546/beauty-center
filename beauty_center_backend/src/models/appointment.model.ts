// src/models/Appointment.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class Appointment extends Model {
  declare id: number;
  declare customerId: number;
  declare serviceId: number;
  declare staffId?: number | null;
  declare roomId?: number | null;
  declare startAt: Date;
  declare endAt: Date;
  declare status: string;
}
Appointment.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    customerId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    serviceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    staffId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    roomId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    startAt: { type: DataTypes.DATE, allowNull: false },
    endAt: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "booked",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: "appointments", timestamps: true },
);
