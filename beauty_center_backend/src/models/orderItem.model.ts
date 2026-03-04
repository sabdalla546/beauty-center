// src/models/OrderItem.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class OrderItem extends Model {
  declare id: number;
  declare orderId: number;

  // ⬇️ add "package" (even if you won’t use it الآن، مفيد للبيع لاحقًا)
  declare lineType: "service" | "product" | "package";

  declare referenceId?: number | null;
  declare description?: string | null;
  declare quantity: number;
  declare unitPriceFils: number;
  declare totalPriceFils: number;

  declare staffId?: number | null;
  declare roomId?: number | null;
  declare appointmentId?: number | null;

  // ✅ NEW: package coverage fields
  declare coveredByCustomerPackageId?: number | null;
  declare coveredQty?: number | null;
  declare uncoveredQty?: number | null;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    // keep string but we will enforce values in app
    lineType: { type: DataTypes.STRING(16), allowNull: false },

    referenceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    description: { type: DataTypes.STRING(256), allowNull: true },

    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    unitPriceFils: { type: DataTypes.INTEGER, allowNull: false },
    totalPriceFils: { type: DataTypes.INTEGER, allowNull: false },

    staffId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    roomId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    appointmentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

    // ✅ NEW columns (will be added via sync alter in dev)
    coveredByCustomerPackageId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    coveredQty: { type: DataTypes.INTEGER, allowNull: true },
    uncoveredQty: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: "order_items", timestamps: false },
);
