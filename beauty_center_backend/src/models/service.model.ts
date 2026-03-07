// src/models/Service.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db/db";

export class Service extends Model {
  declare id: number;
  declare code: string | null;
  declare name: string;
  declare durationMinutes: number;
  declare image: string | null;
  // ✅ store FILS
  declare priceFils: number;

  declare requiredRoomTypeId: number | null;
}

Service.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    code: { type: DataTypes.STRING(32), allowNull: true, unique: true },
    name: { type: DataTypes.STRING(128), allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priceFils: { type: DataTypes.INTEGER, allowNull: false },

    requiredRoomTypeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  },
  { sequelize, tableName: "services", timestamps: true, underscored: true },
);
