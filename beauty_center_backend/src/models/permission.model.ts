// src/models/Permission.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class Permission extends Model {
  declare id: number;
  declare name: string;
}
Permission.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  },
  { sequelize, tableName: "permissions", timestamps: true }
);
