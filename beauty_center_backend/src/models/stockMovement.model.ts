// src/models/StockMovement.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class StockMovement extends Model {
  declare id: number;
  declare productId: number;
  declare change: number;
  declare reason: string;
  declare resultingQty: number;
}
StockMovement.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    change: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.STRING(64), allowNull: false },
    referenceId: { type: DataTypes.STRING(128), allowNull: true },
    resultingQty: { type: DataTypes.INTEGER, allowNull: false },
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  },
  { sequelize, tableName: "stock_movements", timestamps: true },
);
