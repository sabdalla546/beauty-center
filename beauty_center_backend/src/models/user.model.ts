// src/models/User.ts
import { CreationOptional, DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../db";

interface UserAttrs {
  id?: number;
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  isActive?: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class User
  extends Model<
    UserAttrs,
    Optional<UserAttrs, "id" | "createdAt" | "updatedAt">
  >
  implements UserAttrs
{
  public id!: number;
  public email!: string;
  public passwordHash!: string;
  public firstName!: string | null;
  public lastName!: string | null;
  public role!: string;
  public isActive!: boolean;
  declare createdBy?: number | null;
  declare updatedBy?: number | null;
  declare deletedBy?: number | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING(255), allowNull: false },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "password_hash",
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "first_name",
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "last_name",
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "receptionist",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },

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
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    paranoid: true,
    underscored: true, // ✅ لازم
    indexes: [
      { name: "users_email_unique", unique: true, fields: ["email"] },
      { name: "users_created_by", fields: ["created_by"] },
      { name: "users_updated_by", fields: ["updated_by"] },
      { name: "users_deleted_by", fields: ["deleted_by"] },
    ],
  },
);

// Hooks to automatically set createdBy/updatedBy if controller passes options.userId
User.addHook("beforeCreate", (instance: User, options: any): void => {
  try {
    const optionsAny = options as any;
    const userId = optionsAny?.userId ?? null;
    if (userId) {
      (instance as any).createdBy = userId;
      (instance as any).updatedBy = userId;
    }
  } catch (err) {
    // do not fail on hook
  }
});

User.addHook("beforeUpdate", (instance: User, options: any): void => {
  try {
    const optionsAny = options as any;
    const userId = optionsAny?.userId ?? null;
    if (userId) {
      (instance as any).updatedBy = userId;
    }
  } catch (err) {
    // ignore
  }
});

// beforeDestroy still runs on destroy(); set deletedBy from options.userId
User.addHook(
  "beforeDestroy",
  async (instance: User, options: any): Promise<void> => {
    try {
      const optionsAny = options as any;
      const userId = optionsAny?.userId ?? null;
      if (userId) {
        // set deletedBy and save before Sequelize sets deletedAt via paranoid destroy
        (instance as any).deletedBy = userId;
        // Save changes within same transaction if present
        const saveOpts: any = {
          transaction: optionsAny?.transaction,
          userId: optionsAny?.userId,
        };
        await instance.save(saveOpts);
      }
    } catch (err) {
      // swallow
    }
  },
);

export default User;
