import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AppError } from "../errors/AppError";
import { sequelize } from "../db";
import { kwdToFils } from "../utils/money";
import {
  findActivePackageForService,
  consumePackage,
} from "../services/packages.service";

import { appointmentCheckoutSchema } from "../validators/appointmentCheckout";
import {
  Appointment,
  Customer,
  Service,
  ShiftSession,
  Order,
  OrderItem,
  Product,
} from "../models";

const ALLOWED_APPOINTMENT_STATUSES_FOR_CHECKOUT = ["completed"];

export const checkoutAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const appointmentId = Number(req.params.id);

    const parsed = appointmentCheckoutSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("pos.invalid_input", "Invalid input") ?? "Invalid input",
          details: flat,
        },
      });
    }

    const userId = Number((req as any).user?.id);
    if (!userId) {
      throw new AppError(
        req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized",
        401,
        "auth.unauthorized",
      );
    }

    const t = await sequelize.transaction();

    try {
      // 0) Require an OPEN shift for financial ops
      const openShift = await ShiftSession.findOne({
        where: { userId, status: "open" },
        transaction: t,
        lock: t.LOCK.UPDATE,
        order: [["id", "DESC"]],
      });

      if (!openShift) {
        throw new AppError(
          req.t?.("shift.not_open", "You must open a shift first") ??
            "You must open a shift first",
          400,
          "shift.not_open",
        );
      }

      // 1) Load appointment (lock)
      const appt = await Appointment.findByPk(appointmentId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!appt) {
        throw new AppError(
          req.t?.("appointment.not_found", "Appointment not found") ??
            "Appointment not found",
          404,
          "appointment.not_found",
        );
      }

      // direct appointment-level anti-double-checkout
      if ((appt as any).checkoutOrderId || (appt as any).checkedOutAt) {
        throw new AppError(
          req.t?.(
            "pos.appointment_already_checked_out",
            "Appointment already checked out",
          ) ?? "Appointment already checked out",
          400,
          "pos.appointment_already_checked_out",
          {
            appointmentId,
            checkoutOrderId: (appt as any).checkoutOrderId ?? null,
          },
        );
      }

      const apptStatus = String((appt as any).status ?? "");
      if (!ALLOWED_APPOINTMENT_STATUSES_FOR_CHECKOUT.includes(apptStatus)) {
        throw new AppError(
          req.t?.(
            "pos.appointment_not_ready_for_checkout",
            "Only completed appointments can be checked out",
          ) ?? "Only completed appointments can be checked out",
          400,
          "pos.appointment_not_ready_for_checkout",
          { status: apptStatus },
        );
      }

      // 2) Strong anti-double-checkout fallback using externalRef
      const appointmentExternalRef = `appt:${appointmentId}`;

      const existingOrderForAppt = await Order.findOne({
        where: { externalRef: appointmentExternalRef },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existingOrderForAppt) {
        throw new AppError(
          req.t?.(
            "pos.appointment_already_checked_out",
            "Appointment already checked out",
          ) ?? "Appointment already checked out",
          400,
          "pos.appointment_already_checked_out",
          { orderId: (existingOrderForAppt as any).id },
        );
      }

      // 3) Load service
      const serviceId = Number((appt as any).serviceId);
      const service = await Service.findByPk(serviceId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!service) {
        throw new AppError(
          req.t?.("service.not_found", "Service not found") ??
            "Service not found",
          404,
          "service.not_found",
          { serviceId },
        );
      }

      // 4) Validate customer exists
      const customerId = Number((appt as any).customerId);
      const customer = await Customer.findByPk(customerId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!customer) {
        throw new AppError(
          req.t?.("customer.not_found", "Customer not found") ??
            "Customer not found",
          404,
          "customer.not_found",
          { customerId },
        );
      }

      // 5) Prepare items (service + optional products)
      const itemsToCreate: any[] = [];

      const servicePriceFils = Number((service as any).priceFils ?? 0);
      if (!Number.isFinite(servicePriceFils) || servicePriceFils < 0) {
        throw new AppError(
          req.t?.("pos.service_price_invalid", "Service price is invalid") ??
            "Service price is invalid",
          400,
          "pos.service_price_invalid",
          { serviceId, servicePriceFils },
        );
      }

      const now = new Date();

      // package lookup (qty=1)
      const activePkg = await findActivePackageForService({
        customerId,
        serviceId: Number((service as any).id),
        now,
        transaction: t,
      });

      const shouldCover = !!activePkg;
      const coveredQty = shouldCover ? 1 : 0;
      const uncoveredQty = 1 - coveredQty;

      itemsToCreate.push({
        lineType: "service",
        referenceId: Number((service as any).id),
        description: String((service as any).name ?? "Service"),
        quantity: 1,
        unitPriceFils: servicePriceFils,
        totalPriceFils: servicePriceFils * uncoveredQty,

        staffId: (appt as any).actualStaffId ?? (appt as any).staffId ?? null,
        roomId: (appt as any).actualRoomId ?? (appt as any).roomId ?? null,
        appointmentId: Number((appt as any).id),

        coveredByCustomerPackageId: activePkg
          ? Number((activePkg as any).id)
          : null,
        coveredQty: coveredQty || null,
        uncoveredQty: uncoveredQty || null,
      });

      const products = parsed.data.products ?? [];
      if (Array.isArray(products) && products.length > 0) {
        const ids = products.map((p) => Number(p.productId)).filter(Boolean);

        const dbProducts = await Product.findAll({
          where: { id: ids as any },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        const map = new Map<number, any>();
        for (const p of dbProducts as any[]) {
          map.set(Number(p.id), p);
        }

        for (const p of products) {
          const productId = Number(p.productId);
          const prod = map.get(productId);

          if (!prod) {
            throw new AppError(
              req.t?.("product.not_found", "Product not found") ??
                "Product not found",
              404,
              "product.not_found",
              { productId },
            );
          }

          const qty = Math.max(1, Number(p.qty ?? 1));
          const unitFils = Number((prod as any).priceFils ?? 0);

          if (!Number.isFinite(unitFils) || unitFils < 0) {
            throw new AppError(
              req.t?.(
                "pos.product_price_invalid",
                "Product price is invalid",
              ) ?? "Product price is invalid",
              400,
              "pos.product_price_invalid",
              { productId, unitFils },
            );
          }

          const lineTotalFils = unitFils * qty;

          itemsToCreate.push({
            lineType: "product",
            referenceId: productId,
            description: String((prod as any).name ?? "Product"),
            quantity: qty,
            unitPriceFils: unitFils,
            totalPriceFils: lineTotalFils,
            staffId: null,
            roomId: null,
            appointmentId: Number((appt as any).id),
          });
        }
      }

      // 6) Totals
      const subtotalFils = itemsToCreate.reduce(
        (sum, it) => sum + Number(it.totalPriceFils || 0),
        0,
      );

      const discountFilsRaw =
        parsed.data.discountKwd != null
          ? kwdToFils(parsed.data.discountKwd)
          : parsed.data.discountFils != null
            ? Number(parsed.data.discountFils)
            : parsed.data.discountCents != null
              ? Number(parsed.data.discountCents)
              : 0;

      const taxFilsRaw =
        parsed.data.taxKwd != null
          ? kwdToFils(parsed.data.taxKwd)
          : parsed.data.taxFils != null
            ? Number(parsed.data.taxFils)
            : parsed.data.taxCents != null
              ? Number(parsed.data.taxCents)
              : 0;

      const discountFils = Math.min(Math.max(0, discountFilsRaw), subtotalFils);
      const taxFils = Math.max(0, taxFilsRaw);
      const totalFils = Math.max(0, subtotalFils - discountFils + taxFils);

      // 7) Create order + items (NO stock changes here)
      const initialOrderStatus = totalFils <= 0 ? "completed" : "open";

      const order = await Order.create(
        {
          externalRef: appointmentExternalRef,
          customerId,
          createdBy: userId,
          shiftSessionId: (openShift as any).id,
          status: initialOrderStatus,
          subtotalFils,
          discountFils,
          taxFils,
          totalFils,
        } as any,
        { transaction: t },
      );
      for (const it of itemsToCreate) {
        it.orderId = Number((order as any).id);
      }

      // Create service item first (so we can link usage to orderItemId)
      const [serviceItem, ...restItems] = itemsToCreate;

      const createdServiceItem = await OrderItem.create(serviceItem as any, {
        transaction: t,
      });

      // Consume package if covered
      const pkgId = Number(
        (serviceItem as any).coveredByCustomerPackageId || 0,
      );
      const cover = Number((serviceItem as any).coveredQty || 0);

      if (pkgId && cover > 0) {
        await consumePackage({
          customerPackageId: pkgId,
          appointmentId: Number((appt as any).id),
          orderItemId: Number((createdServiceItem as any).id),
          serviceId: Number((service as any).id),
          qty: cover,
          userId,
          now,
          transaction: t,
        });
      }

      // Create the rest (products)
      if (restItems.length) {
        await OrderItem.bulkCreate(restItems as any[], { transaction: t });
      }

      // link checkout directly to appointment
      await appt.update(
        {
          checkoutOrderId: Number((order as any).id),
          checkedOutAt: now,
        } as any,
        { transaction: t },
      );

      const orderWithItems = await Order.findByPk((order as any).id, {
        include: [{ model: OrderItem, as: "items" }],
        transaction: t,
      });

      await t.commit();

      return res.status(201).json({
        data: {
          order: orderWithItems,
          appointmentId: Number((appt as any).id),
          checkoutOrderId: Number((order as any).id),
          checkedOutAt: now,
        },
      });
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },
);
