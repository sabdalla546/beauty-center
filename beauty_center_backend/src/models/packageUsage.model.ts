import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db";

export class PackageUsage extends Model<
  InferAttributes<PackageUsage>,
  InferCreationAttributes<PackageUsage>
> {
  declare id: CreationOptional<number>;
  declare customerPackageId: number;
  declare amountFils: number;
  declare appointmentId: number | null;
  declare orderItemId: number | null;

  declare serviceId: number;
  declare qty: number;

  declare usedAt: Date;
  declare createdBy: number | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PackageUsage.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    customerPackageId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amountFils: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    appointmentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    orderItemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

    serviceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    qty: { type: DataTypes.INTEGER, allowNull: false },

    usedAt: { type: DataTypes.DATE, allowNull: false },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
  },
  { sequelize, tableName: "package_usages", underscored: true },
);
