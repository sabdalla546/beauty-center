// src/models/UserRole.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class UserRole extends Model {}
UserRole.init(
  {
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
    roleId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
  },
  { sequelize, tableName: "user_roles", timestamps: false }
);
