// src/models/paymentMethod.model.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class PaymentMethod extends Model {
  declare id: number;
  declare code: "cash" | "knet" | "visa" | "wallet";
  declare nameEn: string;
  declare nameAr: string;
  declare isActive: boolean;
}

PaymentMethod.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    nameEn: { type: DataTypes.STRING(100), allowNull: false },
    nameAr: { type: DataTypes.STRING(100), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: "payment_methods", timestamps: true },
);
