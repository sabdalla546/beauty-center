import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db";

export type CustomerPackageStatus =
  | "active"
  | "expired"
  | "used_up"
  | "cancelled";

export class CustomerPackage extends Model<
  InferAttributes<CustomerPackage>,
  InferCreationAttributes<CustomerPackage>
> {
  declare id: CreationOptional<number>;
  declare customerId: number;
  declare planId: number;

  declare startAt: Date;
  declare expiresAt: Date;
  declare status: CreationOptional<CustomerPackageStatus>;

  declare totalSessions: number;
  declare usedSessions: CreationOptional<number>;

  declare createdBy: number | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CustomerPackage.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    planId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    startAt: { type: DataTypes.DATE, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },

    status: {
      type: DataTypes.ENUM("active", "expired", "used_up", "cancelled"),
      allowNull: false,
      defaultValue: "active",
    },

    totalSessions: { type: DataTypes.INTEGER, allowNull: false },
    usedSessions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
  },
  { sequelize, tableName: "customer_packages", underscored: true },
);
