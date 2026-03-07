// src/models/Customer.ts
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db/db";

export class Customer extends Model<
  InferAttributes<Customer>,
  InferCreationAttributes<Customer>
> {
  declare id: CreationOptional<number>;
  declare firstName: string | null;
  declare lastName: string | null;
  declare phone: string | null;

  // audit fields
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare deletedBy?: number | null;

  // timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}

Customer.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: "first_name",
    },
    lastName: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: "last_name",
    },
    phone: { type: DataTypes.STRING(32), allowNull: true },

    // audit columns
    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by",
    },
    updatedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "updated_by",
    },
    deletedBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "deleted_by",
    },

    // timestamps (explicit to satisfy TS)
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" },
  },
  {
    sequelize,
    tableName: "customers",
    timestamps: true,
    paranoid: true, // enables soft-delete (deleted_at)
    underscored: true,
    indexes: [
      { name: "idx_customers_phone", fields: ["phone"] },
      { name: "idx_customers_created_by", fields: ["created_by"] },
      { name: "idx_customers_updated_by", fields: ["updated_by"] },
      { name: "idx_customers_deleted_by", fields: ["deleted_by"] },
    ],
  },
);

/**
 * Hooks: read userId from options.userId and set audit fields.
 * Controllers should pass `{ transaction: t, userId: req.user?.id }` when calling create/update/destroy.
 */
Customer.addHook("beforeCreate", (instance: Customer, options: any) => {
  try {
    const userId = options?.userId ?? null;
    if (userId) {
      (instance as any).createdBy = userId;
      (instance as any).updatedBy = userId;
    }
  } catch (err) {
    // do not fail the operation because of hook issues
  }
});

Customer.addHook("beforeUpdate", (instance: Customer, options: any) => {
  try {
    const userId = options?.userId ?? null;
    if (userId) {
      (instance as any).updatedBy = userId;
    }
  } catch (err) {
    // ignore
  }
});

Customer.addHook("beforeDestroy", async (instance: Customer, options: any) => {
  try {
    const userId = options?.userId ?? null;
    if (userId) {
      (instance as any).deletedBy = userId;
      // persist deletedBy so it exists alongside deletedAt (paranoid destroy)
      await instance.save({ transaction: options?.transaction });
    }
  } catch (err) {
    // swallow hook errors
  }
});

export default Customer;
