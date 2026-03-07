// src/models/RolePermission.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db/db";

export class RolePermission extends Model {}
RolePermission.init(
  {
    roleId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
    permissionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
  },
  { sequelize, tableName: "role_permissions", timestamps: false },
);
