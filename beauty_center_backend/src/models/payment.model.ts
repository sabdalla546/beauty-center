// src/models/payment.model.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
import { PAYMENT_STATUSES } from "../constants/domain";

export class Payment extends Model {
  declare id: number;
  declare orderId: number;

  // FILS (internal unit)
  declare amountFils: number;
  declare shiftSessionId?: number | null;
  declare methodId: number;
  declare status: "pending" | "completed" | "failed" | "refunded";

  declare providerReference?: string | null;
}

Payment.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    orderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    shiftSessionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    amountFils: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    methodId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(...PAYMENT_STATUSES),
      allowNull: false,
      defaultValue: "completed",
    },

    providerReference: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "payments",
    timestamps: true,
  },
);
