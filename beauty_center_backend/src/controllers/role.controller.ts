// src/controllers/roleController.ts
import { Request, Response } from "express";
import { Op } from "sequelize";
import { Role } from "../models/role.model";
import { Permission } from "../models/permission.model";
import { User } from "../models/user.model";
import { sequelize } from "../db";
import {
  invalidateAllCaches,
  invalidateUserCache,
} from "../services/permission.service";
import { AppError } from "../errors/AppError";

export const roleController = {
  /** -----------------------------------------
   * GET /roles
   * List all roles with permissions
   ------------------------------------------*/
  async listRoles(req: Request, res: Response) {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: "permissions",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
      order: [["id", "ASC"]],
    });

    return res.json({
      message: req.t("roles.list_success", "Roles fetched successfully"),
      roles,
    });
  },

  /** -----------------------------------------
   * POST /roles
   * Create new role
   ------------------------------------------*/
  async createRole(req: Request, res: Response) {
    const { name, description } = req.body;

    if (!name || String(name).trim() === "") {
      throw new AppError(
        req.t("role.name_required", "Role name is required"),
        400,
        "role.name_required",
      );
    }

    try {
      const role = await Role.create({
        name: String(name).trim(),
        description: description ?? null,
      } as any);

      invalidateAllCaches();

      return res.status(201).json({
        message: req.t("role.created", "Role created successfully"),
        role,
      });
    } catch (err: any) {
      throw new AppError(
        req.t("role.create_failed", "Failed to create role"),
        500,
        "role.create_failed",
        err?.message,
      );
    }
  },

  /** -----------------------------------------
   * PUT /roles/:roleId
   * Update role (name/description)
   ------------------------------------------*/
  async updateRole(req: Request, res: Response) {
    const roleId = Number(req.params.roleId);
    const { name, description } = req.body;

    if (!roleId) {
      throw new AppError(
        req.t("role.invalid_id", "Invalid role ID"),
        400,
        "role.invalid_id",
      );
    }

    const role = await Role.findByPk(roleId);
    if (!role) {
      throw new AppError(
        req.t("role.not_found", "Role not found"),
        404,
        "role.not_found",
      );
    }

    if (name !== undefined && name !== null) {
      const n = String(name).trim();
      if (!n) {
        throw new AppError(
          req.t("role.name_required", "Role name is required"),
          400,
          "role.name_required",
        );
      }
      (role as any).name = n;
    }

    if (description !== undefined) {
      (role as any).description = description ?? null;
    }

    try {
      await role.save();
      invalidateAllCaches();

      return res.json({
        message: req.t("role.updated", "Role updated successfully"),
        role,
      });
    } catch (err: any) {
      throw new AppError(
        req.t("role.update_failed", "Failed to update role"),
        500,
        "role.update_failed",
        err?.message,
      );
    }
  },

  /** -----------------------------------------
   * DELETE /roles/:roleId
   ------------------------------------------*/
  async deleteRole(req: Request, res: Response) {
    const roleId = Number(req.params.roleId);

    if (!roleId) {
      throw new AppError(
        req.t("role.invalid_id", "Invalid role ID"),
        400,
        "role.invalid_id",
      );
    }

    const role = await Role.findByPk(roleId);
    if (!role) {
      throw new AppError(
        req.t("role.not_found", "Role not found"),
        404,
        "role.not_found",
      );
    }

    try {
      await role.destroy();
      invalidateAllCaches();

      return res.json({
        message: req.t("role.deleted", "Role deleted successfully"),
        ok: true,
      });
    } catch (err: any) {
      throw new AppError(
        req.t("role.delete_failed", "Failed to delete role"),
        500,
        "role.delete_failed",
        err?.message,
      );
    }
  },

  /** -----------------------------------------
   * GET /roles/permissions
   ------------------------------------------*/
  async listPermissions(req: Request, res: Response) {
    const perms = await Permission.findAll({
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    return res.json({
      message: req.t(
        "permissions.list_success",
        "Permissions fetched successfully",
      ),
      permissions: perms,
    });
  },

  /** -----------------------------------------
   * POST /roles/permissions
   ------------------------------------------*/
  async createPermission(req: Request, res: Response) {
    const { name } = req.body;

    if (!name || String(name).trim() === "") {
      throw new AppError(
        req.t("permission.name_required", "Permission name is required"),
        400,
        "permission.name_required",
      );
    }

    try {
      const p = await Permission.create({
        name: String(name).trim(),
      } as any);

      invalidateAllCaches();

      return res.status(201).json({
        message: req.t("permission.created", "Permission created successfully"),
        permission: p,
      });
    } catch (err: any) {
      throw new AppError(
        req.t("permission.create_failed", "Failed to create permission"),
        500,
        "permission.create_failed",
        err?.message,
      );
    }
  },

  /** -----------------------------------------
   * PUT /roles/permissions/:permissionId
   ------------------------------------------*/
  async updatePermission(req: Request, res: Response) {
    const permissionId = Number(req.params.permissionId);
    const { name } = req.body;

    if (!permissionId) {
      throw new AppError(
        req.t("permission.invalid_id", "Invalid permission ID"),
        400,
        "permission.invalid_id",
      );
    }

    const perm = await Permission.findByPk(permissionId);
    if (!perm) {
      throw new AppError(
        req.t("permission.not_found", "Permission not found"),
        404,
        "permission.not_found",
      );
    }

    const n = String(name ?? "").trim();
    if (!n) {
      throw new AppError(
        req.t("permission.name_required", "Permission name is required"),
        400,
        "permission.name_required",
      );
    }

    try {
      await perm.update({ name: n } as any);
      invalidateAllCaches();

      return res.json({
        message: req.t("permission.updated", "Permission updated successfully"),
        permission: perm,
      });
    } catch (err: any) {
      throw new AppError(
        req.t("permission.update_failed", "Failed to update permission"),
        500,
        "permission.update_failed",
        err?.message,
      );
    }
  },

  /** -----------------------------------------
   * POST /roles/:roleId/permissions
   * body: { permissionIds?: number[], permissionNames?: string[], mode?: "add"|"replace" }
   ------------------------------------------*/
  async assignPermissionsToRole(req: Request, res: Response) {
    const roleId = Number(req.params.roleId);
    const { permissionIds, permissionNames, mode } = req.body;

    if (!roleId) {
      throw new AppError(
        req.t("role.invalid_id", "Invalid role ID"),
        400,
        "role.invalid_id",
      );
    }

    const t = await sequelize.transaction();
    try {
      const role = await Role.findByPk(roleId, { transaction: t });
      if (!role) {
        throw new AppError(
          req.t("role.not_found", "Role not found"),
          404,
          "role.not_found",
        );
      }

      let permissions: Permission[] = [];

      if (Array.isArray(permissionIds) && permissionIds.length > 0) {
        permissions = await Permission.findAll({
          where: { id: { [Op.in]: permissionIds } },
          transaction: t,
        });

        if (permissions.length !== permissionIds.length) {
          throw new AppError(
            req.t("permission.not_found", "One or more permissions not found"),
            400,
            "permission.not_found",
          );
        }
      } else if (Array.isArray(permissionNames) && permissionNames.length > 0) {
        permissions = await Permission.findAll({
          where: { name: { [Op.in]: permissionNames } },
          transaction: t,
        });

        if (permissions.length !== permissionNames.length) {
          throw new AppError(
            req.t("permission.not_found", "One or more permissions not found"),
            400,
            "permission.not_found",
          );
        }
      } else {
        throw new AppError(
          req.t(
            "permission.ids_or_names_required",
            "permissionIds or permissionNames is required",
          ),
          400,
          "permission.ids_or_names_required",
        );
      }

      const actionMode: "add" | "replace" =
        mode === "replace" ? "replace" : "add";

      if (actionMode === "replace") {
        await (role as any).setPermissions(permissions, { transaction: t });
      } else {
        await (role as any).addPermissions(permissions, { transaction: t });
      }

      await t.commit();
      invalidateAllCaches();

      return res.json({
        message: req.t(
          "role.permissions_assigned",
          actionMode === "replace"
            ? "Permissions replaced successfully"
            : "Permissions assigned successfully",
        ),
        ok: true,
        mode: actionMode,
      });
    } catch (err: any) {
      await t.rollback();
      throw err instanceof AppError
        ? err
        : new AppError(
            req.t("role.assign_failed", "Failed to assign permissions"),
            500,
            "role.assign_failed",
            err?.message,
          );
    }
  },

  /** -----------------------------------------
   * POST /roles/users/:userId/roles
   ------------------------------------------*/
  async assignRoleToUser(req: Request, res: Response) {
    const userId = Number(req.params.userId);
    const { roleId } = req.body;

    if (!userId || !roleId) {
      throw new AppError(
        req.t("role.assign_missing", "userId and roleId are required"),
        400,
        "role.assign_missing",
      );
    }

    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction: t });
      const role = await Role.findByPk(roleId, { transaction: t });

      if (!user || !role) {
        throw new AppError(
          req.t("role.assign_not_found", "User or Role not found"),
          404,
          "role.assign_not_found",
        );
      }

      await (user as any).addRole(role, { transaction: t });
      await t.commit();

      invalidateUserCache(userId);

      return res.json({
        message: req.t("role.assigned_to_user", "Role assigned to user"),
        ok: true,
      });
    } catch (err: any) {
      await t.rollback();
      throw err instanceof AppError
        ? err
        : new AppError(
            req.t("role.assign_failed", "Failed to assign role"),
            500,
            "role.assign_failed",
            err?.message,
          );
    }
  },

  /** -----------------------------------------
   * GET /roles/users/:userId/roles
   ------------------------------------------*/
  async listUserRoles(req: Request, res: Response) {
    const userId = Number(req.params.userId);

    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: "roles", attributes: ["id", "name"] }],
    });

    if (!user) {
      throw new AppError(
        req.t("user.not_found", "User not found"),
        404,
        "user.not_found",
      );
    }

    return res.json({
      message: req.t("role.user_roles_fetched", "User roles fetched"),
      roles: (user as any).roles || [],
    });
  },

  /** -----------------------------------------
   * DELETE /roles/users/:userId/roles/:roleId
   ------------------------------------------*/
  async removeRoleFromUser(req: Request, res: Response) {
    const userId = Number(req.params.userId);
    const roleId = Number(req.params.roleId);

    if (!userId || !roleId) {
      throw new AppError(
        req.t("role.remove_missing", "userId and roleId are required"),
        400,
        "role.remove_missing",
      );
    }

    const t = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, { transaction: t });
      const role = await Role.findByPk(roleId, { transaction: t });

      if (!user || !role) {
        throw new AppError(
          req.t("role.remove_not_found", "User or Role not found"),
          404,
          "role.remove_not_found",
        );
      }

      await (user as any).removeRole(role, { transaction: t });
      await t.commit();

      invalidateUserCache(userId);

      return res.json({
        message: req.t("role.removed_from_user", "Role removed from user"),
        ok: true,
      });
    } catch (err: any) {
      await t.rollback();
      throw err instanceof AppError
        ? err
        : new AppError(
            req.t("role.remove_failed", "Failed to remove role"),
            500,
            "role.remove_failed",
            err?.message,
          );
    }
  },
};
