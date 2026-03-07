// src/models/Room.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db/db";

export class Room extends Model {
  declare id: number;
  declare name: string;
  declare roomTypeId: number | null;
  declare capacity: number;
  declare status: string;
}
Room.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: { type: DataTypes.STRING(64), allowNull: false },
    roomTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    capacity: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.STRING(32), defaultValue: "available" },
  },
  { sequelize, tableName: "rooms", timestamps: true },
);
