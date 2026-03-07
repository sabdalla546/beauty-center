// src/models/Staff.ts
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db/db";

export class Staff extends Model<
  InferAttributes<Staff>,
  InferCreationAttributes<Staff>
> {
  declare id: CreationOptional<number>; // FK -> users.id
  declare displayName: string | null;
  declare commissionPercent: number;
  declare skills: object | null;

  // audit timestamps + paranoid
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  // audit user ids
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare deletedBy?: number | null;
}

Staff.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
    displayName: { type: DataTypes.STRING(128), allowNull: true },
    commissionPercent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    skills: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" },
    // audit columns
    createdBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    updatedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    deletedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    tableName: "staff",
    timestamps: true,
    paranoid: true, // enable soft deletes via deletedAt
    underscored: true,
    indexes: [{ fields: ["id"] }],
  },
);

/**
 * Hooks to automatically set createdBy/updatedBy/deletedBy when controllers
 * pass `userId` inside the options object (e.g. { transaction: t, userId: req.user?.id }).
 *
 * These hooks are defensive: they won't throw if options are missing.
 */

Staff.addHook("beforeCreate", (instance: Staff, options: any): void => {
  try {
    const opts = options as any;
    const userId = opts?.userId ?? null;
    if (userId) {
      (instance as any).createdBy = userId;
      (instance as any).updatedBy = userId;
    }
  } catch (err) {
    // don't fail creation because of hook issues
  }
});

Staff.addHook("beforeUpdate", (instance: Staff, options: any): void => {
  try {
    const opts = options as any;
    const userId = opts?.userId ?? null;
    if (userId) {
      (instance as any).updatedBy = userId;
    }
  } catch (err) {
    // ignore
  }
});

/**
 * beforeDestroy: when using paranoid: true, Sequelize will set deletedAt; here
 * we set deletedBy and save within the same transaction (if provided) so the
 * audit is stored together.
 */
Staff.addHook(
  "beforeDestroy",
  async (instance: Staff, options: any): Promise<void> => {
    try {
      const opts = options as any;
      const userId = opts?.userId ?? null;
      if (userId) {
        (instance as any).deletedBy = userId;

        // Persist deletedBy within the caller transaction when possible
        const saveOpts: any = {};
        if (opts?.transaction) saveOpts.transaction = opts.transaction;
        // also pass userId to save so other hooks might use it (if any)
        saveOpts.userId = userId;

        // use await so value is persisted before Sequelize marks deletedAt
        await instance.save(saveOpts);
      }
    } catch (err) {
      // swallow hook errors to not block destroy
    }
  },
);

export default Staff;
