// src/models/Product.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class Product extends Model {
  declare id: number;
  declare sku: string | null;
  declare name: string;
  declare barcode: string | null;
  declare image: string | null;
  // ✅ store FILS
  declare costFils: number;
  declare priceFils: number;

  declare currentQty: number;
}

Product.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    sku: { type: DataTypes.STRING(64), allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    barcode: { type: DataTypes.STRING(128), allowNull: true },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    costFils: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    priceFils: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    currentQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: "products", timestamps: true, underscored: true },
);
