// src/models/Order.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
import { ORDER_STATUSES } from "../constants/domain";
export class Order extends Model {
  declare id: number;
  declare externalRef?: string | null;
  declare customerId?: number | null;
  declare createdBy: number;
  declare shiftSessionId?: number | null;

  declare status: "open" | "partially_paid" | "paid" | "cancelled" | "refunded";

  declare subtotalFils: number;
  declare discountFils: number;
  declare taxFils: number;
  declare totalFils: number;
}
Order.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    externalRef: { type: DataTypes.STRING(128), unique: true },
    customerId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    shiftSessionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },

    status: { type: DataTypes.ENUM(...ORDER_STATUSES), defaultValue: "open" },

    subtotalFils: { type: DataTypes.INTEGER, defaultValue: 0 },
    discountFils: { type: DataTypes.INTEGER, defaultValue: 0 },
    taxFils: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalFils: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, tableName: "orders", timestamps: true },
);
