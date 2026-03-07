// src/models/Role.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db/db";

export class Role extends Model {
  declare id: number;
  declare name: string;
  declare description?: string | null;
}
Role.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
  },
  { sequelize, tableName: "roles", timestamps: true },
);
