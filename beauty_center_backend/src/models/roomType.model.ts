// src/models/RoomType.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class RoomType extends Model {
  declare id: number;
  declare name: string;
  declare requiresPrivate: boolean;
}
RoomType.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: { type: DataTypes.STRING(128), allowNull: false },
    requiresPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { sequelize, tableName: "room_types", timestamps: false },
);
