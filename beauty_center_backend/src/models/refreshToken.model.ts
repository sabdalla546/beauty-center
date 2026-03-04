// src/models/RefreshToken.ts
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class RefreshToken extends Model {
  declare id: number;
  declare userId: number;
  declare tokenHash: string;
  declare deviceId?: string | null;
  declare deviceInfo?: object | null; // json: ip, userAgent, name, etc
  declare revoked: boolean;
  declare revokedAt?: Date | null;
  declare expiresAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}
RefreshToken.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    tokenHash: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    deviceId: { type: DataTypes.STRING(128), allowNull: true },
    deviceInfo: { type: DataTypes.JSON, allowNull: true },
    revoked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: "refresh_tokens", timestamps: true }
);

// indexes for quick lookup
// Note: Use proper migrations to create indexes in production
