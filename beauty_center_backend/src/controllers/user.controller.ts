// src/controllers/userController.ts
import { Request, Response } from "express";
import { User } from "../models/user.model";
import { Role } from "../models/role.model";
import {
  createUserSchema,
  updateUserSchema,
  profileUpdateSchema,
} from "../validators/user";
import { withTransaction } from "../utils/transaction";
import { AppError } from "../errors/AppError";
import { hashPassword } from "../utils/password";
import { logger } from "../utils/logger";
import { Op } from "sequelize";

type AuthRequest = Request & { user?: { id: number; roles?: string[] } };

export const userController = {
  // POST /api/v1/users
  async createUser(req: Request, res: Response) {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("auth.invalid_input", "Invalid input") ?? "Invalid input",
          details: flat,
        },
      });
    }

    const { email, password, firstName, lastName, roles, isActive } =
      parsed.data;

    try {
      const user = (await withTransaction(async (t) => {
        // check duplicates
        const existing = await User.findOne({
          where: { email },
          transaction: t,
        });
        if (existing) {
          throw new AppError(
            req.t?.("user.email_in_use", "Email already in use") ??
              "Email already in use",
            409,
            "user.email_in_use",
          );
        }
        const pwHash = password ? await hashPassword(password) : null;
        const created = await User.create(
          {
            email,
            passwordHash: pwHash,
            firstName: firstName || null,
            lastName: lastName || null,
            isActive: isActive ?? true,
          } as any,
          { transaction: t, userId: (req as any).user?.id ?? null } as any,
        );

        if (
          Array.isArray(roles) &&
          roles.length > 0 &&
          (created as any).addRole
        ) {
          const roleRows = await Role.findAll({
            where: { id: roles },
            transaction: t,
          });
          await (created as any).addRole(roleRows, { transaction: t });
        }

        return created;
      })) as User;

      return res.status(201).json({
        message:
          req.t?.("user.created", "User created successfully") ??
          "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (err: any) {
      logger.error("Create user failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("user.create_failed", "Failed to create user") ??
          "Failed to create user",
        500,
        "user.create_failed",
        err?.message,
      );
    }
  },

  // GET /api/v1/users?search=&page=1&limit=20
  async listUsers(req: Request, res: Response) {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      limit,
      offset,
      include: [{ model: Role, as: "roles", attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
      attributes: ["id", "email", "firstName", "lastName", "createdAt"],
    });

    return res.json({
      message: req.t?.("user.list_success", "Users fetched") ?? "Users fetched",
      data: users,
      meta: { page, limit, total: count },
    });
  },

  // GET /api/v1/users/:id
  async getUser(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("user.invalid_id", "Invalid user ID") ?? "Invalid user ID",
        400,
        "user.invalid_id",
      );

    const user = await User.findByPk(id, {
      include: [{ model: Role, as: "roles", attributes: ["id", "name"] }],
      attributes: { exclude: ["passwordHash"] },
    });
    if (!user)
      throw new AppError(
        req.t?.("user.not_found", "User not found") ?? "User not found",
        404,
        "user.not_found",
      );

    return res.json({
      message: req.t?.("user.fetched", "User fetched") ?? "User fetched",
      user,
    });
  },

  // PUT /api/v1/users/:id
  async updateUser(req: Request, res: Response) {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("auth.invalid_input", "Invalid input") ?? "Invalid input",
          details: flat,
        },
      });
    }

    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("user.invalid_id", "Invalid user ID") ?? "Invalid user ID",
        400,
        "user.invalid_id",
      );

    try {
      const updated = await withTransaction(async (t) => {
        const user = await User.findByPk(id, { transaction: t });
        if (!user)
          throw new AppError(
            req.t?.("user.not_found", "User not found") ?? "User not found",
            404,
            "user.not_found",
          );

        if (parsed.data.email && parsed.data.email !== user.email) {
          const other = await User.findOne({
            where: { email: parsed.data.email },
            transaction: t,
          });
          if (other)
            throw new AppError(
              req.t?.("user.email_in_use", "Email already in use") ??
                "Email already in use",
              409,
              "user.email_in_use",
            );
        }

        await user.update(
          parsed.data as any,
          { transaction: t, userId: (req as any).user?.id ?? null } as any,
        );

        if (Array.isArray(parsed.data.roles)) {
          const roleRows = await Role.findAll({
            where: { id: parsed.data.roles },
            transaction: t,
          });
          await (user as any).setRoles(roleRows, { transaction: t }); // replace roles
        }

        return user;
      });

      return res.json({
        message: req.t?.("user.updated", "User updated") ?? "User updated",
        user: {
          id: updated.id,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
        },
      });
    } catch (err: any) {
      logger.error("Update user failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("user.update_failed", "Failed to update user") ??
          "Failed to update user",
        500,
        "user.update_failed",
        err?.message,
      );
    }
  },

  // DELETE /api/v1/users/:id
  async deleteUser(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("user.invalid_id", "Invalid user ID") ?? "Invalid user ID",
        400,
        "user.invalid_id",
      );

    try {
      await withTransaction(async (t) => {
        const user = await User.findByPk(id, {
          transaction: t,
          include: [{ model: Role, as: "roles", attributes: ["id", "name"] }],
        });
        if (!user)
          throw new AppError(
            req.t?.("user.not_found", "User not found") ?? "User not found",
            404,
            "user.not_found",
          );

        // BUSINESS CHECK: Prevent deleting the last admin
        const ADMIN_ROLE = process.env.ADMIN_ROLE || "admin";

        // If this user has the admin role, ensure at least one other active admin remains
        const hasAdminRole =
          ((user as any).roles || []).some(
            (r: any) => r.name === ADMIN_ROLE,
          ) === true;

        if (hasAdminRole) {
          // Count other users with admin role (excluding this user), only non-deleted rows (paranoid true)
          const otherAdmins = await User.findAll({
            include: [
              {
                model: Role,
                as: "roles",
                where: { name: ADMIN_ROLE },
                attributes: ["id"],
                through: { attributes: [] },
              },
            ],
            where: { id: { [Op.ne]: id } },
            transaction: t,
            attributes: ["id"],
          });

          if (!otherAdmins || otherAdmins.length === 0) {
            // Don't allow deleting last admin
            throw new AppError(
              req.t?.(
                "user.cannot_delete_last_admin",
                "Cannot delete the last administrator",
              ) ?? "Cannot delete the last administrator",
              400,
              "CANNOT_DELETE_LAST_ADMIN",
            );
          }
        }

        // Proceed with soft-delete (paranoid:true) — pass userId so hooks populate deletedBy
        await user.destroy({
          transaction: t,
          userId: (req as any).user?.id ?? null,
        } as any);
      });

      return res.json({
        message: req.t?.("user.deleted", "User deleted") ?? "User deleted",
        ok: true,
      });
    } catch (err: any) {
      logger.error("Delete user failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("user.delete_failed", "Failed to delete user") ??
          "Failed to delete user",
        500,
        "user.delete_failed",
        err?.message,
      );
    }
  },
  async restoreUser(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("user.invalid_id", "Invalid user ID") ?? "Invalid user ID",
        400,
        "user.invalid_id",
      );

    try {
      await withTransaction(async (t) => {
        // Find including soft-deleted rows
        const user = await User.findByPk(id, {
          paranoid: false,
          transaction: t,
        });
        if (!user)
          throw new AppError(
            req.t?.("user.not_found", "User not found") ?? "User not found",
            404,
            "user.not_found",
          );

        if (!user.deletedAt)
          throw new AppError(
            req.t?.("user.not_deleted", "User is not deleted") ??
              "User is not deleted",
            400,
            "user.not_deleted",
          );

        // Optionally clear deletedBy or keep it for audit — here we keep it but set restoredBy in updatedBy
        // Save updatedBy to show who performed the restore
        (user as any).updatedBy = (req as any).user?.id ?? null;
        await user.save({
          transaction: t,
          userId: (req as any).user?.id ?? null,
        } as any);

        // restore clears deletedAt (paranoid)
        await (user as any).restore({ transaction: t });
      });

      return res.json({
        message: req.t?.("user.restored", "User restored") ?? "User restored",
        ok: true,
      });
    } catch (err: any) {
      logger.error("Restore user failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("user.restore_failed", "Failed to restore user") ??
          "Failed to restore user",
        500,
        "user.restore_failed",
        err?.message,
      );
    }
  },
  // GET /api/v1/users/me/profile
  async getProfile(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["passwordHash"] },
      include: [{ model: Role, as: "roles", attributes: ["id", "name"] }],
    });
    if (!user)
      throw new AppError(
        req.t?.("user.not_found", "User not found") ?? "User not found",
        404,
        "user.not_found",
      );
    return res.json({
      message:
        req.t?.("user.profile_fetched", "Profile fetched") ?? "Profile fetched",
      profile: user,
    });
  },

  // PUT /api/v1/users/me/profile
  async updateProfile(req: AuthRequest, res: Response) {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("auth.invalid_input", "Invalid input") ?? "Invalid input",
          details: flat,
        },
      });
    }

    const userId = req.user!.id;
    try {
      const updated = await withTransaction(async (t) => {
        const user = await User.findByPk(userId, { transaction: t });
        if (!user)
          throw new AppError(
            req.t?.("user.not_found", "User not found") ?? "User not_found",
            404,
            "user.not_found",
          );

        await user.update(
          parsed.data as any,
          { transaction: t, userId: (req as any).user?.id ?? null } as any,
        );
        return user;
      });

      return res.json({
        message:
          req.t?.("user.profile_updated", "Profile updated") ??
          "Profile updated",
        profile: updated,
      });
    } catch (err: any) {
      logger.error("Update profile failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("user.profile_update_failed", "Failed to update profile") ??
          "Failed to update profile",
        500,
        "user.profile_update_failed",
        err?.message,
      );
    }
  },
};
