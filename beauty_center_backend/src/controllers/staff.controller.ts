// src/controllers/staffController.ts
import { Request, Response } from "express";
import { Staff } from "../models/staff.model";
import { User } from "../models/user.model";
import { Order } from "../models/order.model";
import { Appointment } from "../models/appointment.model";
import { withTransaction } from "../utils/transaction";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";
import { Op } from "sequelize";
import {
  createStaffSchema,
  updateStaffSchema,
  listStaffQuerySchema,
} from "../validators/staff";
import { asyncHandler } from "../middlewares/asyncHandler";
import { ShiftSession } from "../models";

type AuthRequest = Request & { user?: { id: number; roles?: string[] } };

export const staffController = {
  /**
   * POST /api/v1/staff
   * Body: { userId, displayName?, commissionPercent?, skills? }
   * Creates a staff profile linked to an existing user (Staff.id == users.id)
   */
  async createStaff(req: AuthRequest, res: Response) {
    const parsed = createStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("staff.invalid_input", "Invalid input") ?? "Invalid input",
          details: flat,
        },
      });
    }

    const { userId, displayName, commissionPercent, skills } = parsed.data;

    try {
      const created = await withTransaction(async (t) => {
        // ensure user exists
        const user = await User.findByPk(userId, { transaction: t });
        if (!user) {
          throw new AppError(
            req.t?.("staff.user_not_found", "User not found") ??
              "User not found",
            404,
            "staff.user_not_found",
          );
        }

        // ensure staff profile not already exists
        const existing = await Staff.findByPk(userId, { transaction: t });
        if (existing) {
          throw new AppError(
            req.t?.("staff.already_exists", "Staff profile already exists") ??
              "Staff profile already exists",
            409,
            "staff.already_exists",
          );
        }

        const s = await Staff.create(
          {
            id: userId,
            displayName: displayName ?? null,
            commissionPercent: commissionPercent ?? 0,
            skills: skills ?? null,
          } as any,
          { transaction: t, userId: req.user?.id ?? null } as any,
        );

        return s;
      });

      return res.status(201).json({
        message: req.t?.("staff.created", "Staff created") ?? "Staff created",
        staff: created,
      });
    } catch (err: any) {
      logger.error("Create staff failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("staff.create_failed", "Failed to create staff") ??
          "Failed to create staff",
        500,
        "staff.create_failed",
        err?.message,
      );
    }
  },

  /**
   * GET /api/v1/staff
   * Query: ?page=1&limit=20&search=
   */
  async listStaff(req: Request, res: Response) {
    // validate and coerce query
    const parsed = listStaffQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("staff.invalid_query", "Invalid query") ?? "Invalid query",
          details: flat,
        },
      });
    }

    const page = Math.max(parsed.data.page ?? 1, 1);
    const limit = Math.min(parsed.data.limit ?? 20, 200);
    const offset = (page - 1) * limit;
    const search = parsed.data.search ?? "";

    const where: any = {};
    if (search) {
      // search by displayName or linked user's first/last/email
      where[Op.or] = [
        { displayName: { [Op.like]: `%${search}%` } },
        // will filter via include where for user fields below if needed
      ];
    }

    // include the User to show basic user info
    const { rows, count } = await Staff.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
      attributes: ["id", "displayName", "commissionPercent", "skills"],
    });

    return res.json({
      message:
        req.t?.("staff.list_success", "Staff fetched") ?? "Staff fetched",
      data: rows,
      meta: { page, limit, total: count },
    });
  },

  /**
   * GET /api/v1/staff/:id
   */
  async getStaff(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("staff.invalid_id", "Invalid staff id") ?? "Invalid staff id",
        400,
        "staff.invalid_id",
      );

    const s = await Staff.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
    });

    if (!s)
      throw new AppError(
        req.t?.("staff.not_found", "Staff not found") ?? "Staff not found",
        404,
        "staff.not_found",
      );

    return res.json({
      message: req.t?.("staff.fetched", "Staff fetched") ?? "Staff fetched",
      staff: s,
    });
  },

  /**
   * PUT /api/v1/staff/:id
   */
  async updateStaff(req: AuthRequest, res: Response) {
    const parsed = updateStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("staff.invalid_input", "Invalid input") ?? "Invalid input",
          details: flat,
        },
      });
    }

    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("staff.invalid_id", "Invalid staff id") ?? "Invalid staff id",
        400,
        "staff.invalid_id",
      );

    try {
      const updated = await withTransaction(async (t) => {
        const s = await Staff.findByPk(id, { transaction: t });
        if (!s) {
          throw new AppError(
            req.t?.("staff.not_found", "Staff not found") ?? "Staff not found",
            404,
            "staff.not_found",
          );
        }

        await s.update(
          {
            displayName: parsed.data.displayName ?? s.displayName,
            commissionPercent:
              parsed.data.commissionPercent ?? s.commissionPercent,
            skills: parsed.data.skills ?? s.skills,
          } as any,
          { transaction: t, userId: req.user?.id ?? null } as any,
        );

        return s;
      });

      return res.json({
        message: req.t?.("staff.updated", "Staff updated") ?? "Staff updated",
        staff: updated,
      });
    } catch (err: any) {
      logger.error("Update staff failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("staff.update_failed", "Failed to update staff") ??
          "Failed to update staff",
        500,
        "staff.update_failed",
        err?.message,
      );
    }
  },

  /**
   * DELETE /api/v1/staff/:id
   * Hard-deletes staff row (you may choose to soft-delete with paranoid:true in model)
   */
  async deleteStaff(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("staff.invalid_id", "Invalid staff id") ?? "Invalid staff id",
        400,
        "staff.invalid_id",
      );

    try {
      await withTransaction(async (t) => {
        const s = await Staff.findByPk(id, { transaction: t });
        if (!s) {
          throw new AppError(
            req.t?.("staff.not_found", "Staff not found") ?? "Staff not found",
            404,
            "staff.not_found",
          );
        }

        // === Safety checks: prevent deletion if linked domain data exists ===
        const blockers: string[] = [];

        // Appointment check (only query if model has staffId attribute)
        try {
          if ((Appointment as any)?.rawAttributes?.staffId) {
            const apptCount = await Appointment.count({
              where: { staffId: id },
              transaction: t,
            });
            if (apptCount > 0) {
              blockers.push(`appointments (${apptCount})`);
            }
          }
        } catch (err) {
          // Log and continue — we intentionally don't let a missing column crash deletion flow
          logger.warn("Appointment existence check failed, skipping check", {
            err,
          });
        }

        // Order check (only if Order has staffId attribute)
        try {
          if ((Order as any)?.rawAttributes?.staffId) {
            const orderCount = await Order.count({
              where: { staffId: id },
              transaction: t,
            });
            if (orderCount > 0) {
              blockers.push(`orders (${orderCount})`);
            }
          }
        } catch (err) {
          logger.warn("Order existence check failed, skipping check", { err });
        }

        // Add other dependency checks here when you introduce other relations:
        // e.g. if you later add Inventory or Shift tables referencing staffId.

        if (blockers.length > 0) {
          // localized message with details
          const msg =
            req.t?.(
              "staff.delete_blocked",
              "Staff cannot be deleted because of linked: {{list}}",
            ) ??
            `Staff cannot be deleted because of linked: ${blockers.join(", ")}`;

          // include blockers in details for API clients
          throw new AppError(msg, 400, "staff.delete_blocked", { blockers });
        }

        // No blockers — safe to delete (paranoid or hard delete depending on model)
        await s.destroy({
          transaction: t,
          userId: req.user?.id ?? null,
        } as any);
      });

      return res.json({
        message: req.t?.("staff.deleted", "Staff deleted") ?? "Staff deleted",
        ok: true,
      });
    } catch (err: any) {
      logger.error("Delete staff failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("staff.delete_failed", "Failed to delete staff") ??
          "Failed to delete staff",
        500,
        "staff.delete_failed",
        err?.message,
      );
    }
  },
  /**
   * POST /api/v1/staff/:id/restore
   */
  async restoreStaff(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("staff.invalid_id", "Invalid staff id") ?? "Invalid staff id",
        400,
        "staff.invalid_id",
      );

    // ensure model supports restore (paranoid)
    if (typeof (Staff as any).restore !== "function") {
      throw new AppError(
        req.t?.("staff.restore_not_supported", "Restore not supported") ??
          "Restore not supported",
        400,
        "staff.restore_not_supported",
      );
    }

    try {
      await withTransaction(async (t) => {
        // We can restore via static restore or instance restore.
        // Using static restore ensures we don't need to fetch the instance first.
        await (Staff as any).restore({ where: { id }, transaction: t });
        // Optionally clear deletedBy if you store that
        // and set updatedBy/updatedAt via hooks if needed
      });

      return res.json({
        message:
          req.t?.("staff.restored", "Staff restored") ?? "Staff restored",
        ok: true,
      });
    } catch (err: any) {
      logger.error("Restore staff failed", err);
      throw new AppError(
        req.t?.("staff.restore_failed", "Failed to restore staff") ??
          "Failed to restore staff",
        500,
        "staff.restore_failed",
        err?.message,
      );
    }
  },
};
