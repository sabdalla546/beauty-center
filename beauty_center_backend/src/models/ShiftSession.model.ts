// src/models/ShiftSession.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";
import { SHIFT_STATUSES } from "../constants/domain";

export class ShiftSession extends Model {
  declare id: number;
  declare userId: number;

  declare status: "open" | "closed";

  // shift times
  declare openedAt: Date;
  declare closedAt?: Date | null;

  // cash control (FILS)
  declare openingCashFils: number;
  declare closingCashFils?: number | null;
  declare expectedCashFils?: number | null;

  declare notes?: string | null;

  declare createdAt: Date;
  declare updatedAt: Date;
}

ShiftSession.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(...SHIFT_STATUSES),
      allowNull: false,
      defaultValue: "open",
    },

    openedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    openingCashFils: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    closingCashFils: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    expectedCashFils: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "shift_sessions",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["opened_at"] },
      { fields: ["closed_at"] },
    ],
  },
);

export default ShiftSession;
