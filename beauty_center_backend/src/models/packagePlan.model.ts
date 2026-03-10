import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db";

export class PackagePlan extends Model<
  InferAttributes<PackagePlan>,
  InferCreationAttributes<PackagePlan>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: string | null;

  declare priceCents: number; // (you can keep fils later, but cents is ok now)
  declare sessionsCount: number;
  declare validDays: number;

  // optional restriction
  declare serviceId: number | null;

  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PackagePlan.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: true },

    priceCents: { type: DataTypes.INTEGER, allowNull: false },
    sessionsCount: { type: DataTypes.INTEGER, allowNull: false },
    validDays: { type: DataTypes.INTEGER, allowNull: false },

    serviceId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
  },
  {
    sequelize,
    tableName: "package_plans",
    underscored: true,
    timestamps: true,
  },
);
