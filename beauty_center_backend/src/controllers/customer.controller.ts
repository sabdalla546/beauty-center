// src/controllers/customerController.ts
import { Request, Response } from "express";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../validators/customer";
import { Customer } from "../models/customer.model";
import { withTransaction } from "../utils/transaction";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";
import { Op } from "sequelize";

type AuthRequest = Request & { user?: { id: number; roles?: string[] } };

export const customerController = {
  /**
   * POST /api/v1/customers
   */
  async createCustomer(req: AuthRequest, res: Response) {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("customer.invalid_input", "Invalid input") ??
            "Invalid input",
          details: flat,
        },
      });
    }

    try {
      const created = await withTransaction(async (t) => {
        const opts: any = { transaction: t, userId: req.user?.id ?? null };
        const c = await Customer.create(
          {
            firstName: parsed.data.firstName ?? null,
            lastName: parsed.data.lastName ?? null,
            phone: parsed.data.phone ?? null,
          } as any,
          opts,
        );
        return c;
      });

      return res.status(201).json({
        message:
          req.t?.("customer.created", "Customer created") ?? "Customer created",
        customer: created,
      });
    } catch (err: any) {
      logger.error("Create customer failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("customer.create_failed", "Failed to create customer") ??
          "Failed to create customer",
        500,
        "customer.create_failed",
        err?.message,
      );
    }
  },

  /**
   * GET /api/v1/customers
   * query: ?page=1&limit=20&search=...
   */
  async listCustomers(req: Request, res: Response) {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "firstName",
        "lastName",
        "phone",
        "createdAt",
        "updatedAt",
      ],
    });

    return res.json({
      message:
        req.t?.("customer.list_success", "Customers fetched") ??
        "Customers fetched",
      data: rows,
      meta: { page, limit, total: count },
    });
  },

  /**
   * GET /api/v1/customers/:id
   */
  async getCustomer(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("customer.invalid_id", "Invalid id") ?? "Invalid id",
        400,
        "customer.invalid_id",
      );

    const c = await Customer.findByPk(id, {
      attributes: { exclude: [] },
    });
    if (!c)
      throw new AppError(
        req.t?.("customer.not_found", "Customer not found") ??
          "Customer not found",
        404,
        "customer.not_found",
      );

    return res.json({
      message:
        req.t?.("customer.fetched", "Customer fetched") ?? "Customer fetched",
      customer: c,
    });
  },

  /**
   * PUT /api/v1/customers/:id
   */
  async updateCustomer(req: AuthRequest, res: Response) {
    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("customer.invalid_input", "Invalid input") ??
            "Invalid input",
          details: flat,
        },
      });
    }

    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("customer.invalid_id", "Invalid id") ?? "Invalid id",
        400,
        "customer.invalid_id",
      );

    try {
      const updated = await withTransaction(async (t) => {
        const c = await Customer.findByPk(id, { transaction: t });
        if (!c)
          throw new AppError(
            req.t?.("customer.not_found", "Customer not found") ??
              "Customer not found",
            404,
            "customer.not_found",
          );

        const opts: any = { transaction: t, userId: req.user?.id ?? null };
        await c.update(
          {
            firstName: parsed.data.firstName ?? c.firstName,
            lastName: parsed.data.lastName ?? c.lastName,
            phone: parsed.data.phone ?? c.phone,
          } as any,
          opts,
        );

        return c;
      });

      return res.json({
        message:
          req.t?.("customer.updated", "Customer updated") ?? "Customer updated",
        customer: updated,
      });
    } catch (err: any) {
      logger.error("Update customer failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("customer.update_failed", "Failed to update customer") ??
          "Failed to update customer",
        500,
        "customer.update_failed",
        err?.message,
      );
    }
  },

  /**
   * DELETE /api/v1/customers/:id
   */
  async deleteCustomer(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("customer.invalid_id", "Invalid id") ?? "Invalid id",
        400,
        "customer.invalid_id",
      );

    try {
      await withTransaction(async (t) => {
        const c = await Customer.findByPk(id, { transaction: t });
        if (!c)
          throw new AppError(
            req.t?.("customer.not_found", "Customer not found") ??
              "Customer not found",
            404,
            "customer.not_found",
          );

        // pass userId to hooks for audit
        await c.destroy({
          transaction: t,
          userId: req.user?.id ?? null,
        } as any);
      });

      return res.json({
        message:
          req.t?.("customer.deleted", "Customer deleted") ?? "Customer deleted",
        ok: true,
      });
    } catch (err: any) {
      logger.error("Delete customer failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("customer.delete_failed", "Failed to delete customer") ??
          "Failed to delete customer",
        500,
        "customer.delete_failed",
        err?.message,
      );
    }
  },

  /**
   * POST /api/v1/customers/:id/restore
   * Only works if Customer model is paranoid (supports restore).
   */
  async restoreCustomer(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!id)
      throw new AppError(
        req.t?.("customer.invalid_id", "Invalid id") ?? "Invalid id",
        400,
        "customer.invalid_id",
      );

    if (typeof (Customer as any).restore !== "function") {
      throw new AppError(
        req.t?.("customer.restore_not_supported", "Restore not supported") ??
          "Restore not supported",
        400,
        "customer.restore_not_supported",
      );
    }

    try {
      await withTransaction(async (t) => {
        // restore soft-deleted record (paranoid:false not needed when using restore())
        await (Customer as any).restore({ where: { id }, transaction: t });
        // optional: clear deletedBy or set a restoredBy audit column if you track that
      });

      return res.json({
        message:
          req.t?.("customer.restored", "Customer restored") ??
          "Customer restored",
        ok: true,
      });
    } catch (err: any) {
      logger.error("Restore customer failed", err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        req.t?.("customer.restore_failed", "Failed to restore customer") ??
          "Failed to restore customer",
        500,
        "customer.restore_failed",
        err?.message,
      );
    }
  },
};
