import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AppError } from "../errors/AppError";
import { sequelize } from "../db";
import { Op, WhereOptions, fn, literal } from "sequelize";
import { filsToKwd, kwdToFils } from "../utils/money";
import { createPosOrderSchema, payPosOrderSchema } from "../validators/pos";
import { listPosOrdersSchema } from "../validators/posOrders";
// ✅ Packages: auto-deduction + usage ledger
import { applyPackageToOrderTx } from "../services/packages.service";

import {
  Customer,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
  Product,
  ShiftSession,
  StockMovement,
  // ✅ Packages purchase activation (when order becomes paid)
  PackagePlan,
  CustomerPackage,
} from "../models";

type PaymentAggRow = {
  orderId: number;
  paidFils: string | number;
  refundedFils: string | number;
};

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

async function attachPaidRemaining(rows: any[]) {
  const ids = rows.map((r) => Number(r.id)).filter(Boolean);
  if (!ids.length) return rows;

  const agg = (await Payment.findAll({
    attributes: [
      "orderId",
      [
        fn(
          "SUM",
          literal(
            "CASE WHEN status='completed' AND amountFils > 0 THEN amountFils ELSE 0 END",
          ),
        ),
        "paidFils",
      ],
      [
        fn(
          "SUM",
          literal(
            "CASE WHEN status='completed' AND amountFils < 0 THEN -amountFils ELSE 0 END",
          ),
        ),
        "refundedFils",
      ],
    ],
    where: { orderId: { [Op.in]: ids } },
    group: ["orderId"],
    raw: true,
  })) as unknown as PaymentAggRow[];

  const map = new Map<number, { paidFils: number; refundedFils: number }>();
  for (const r of agg) {
    map.set(Number(r.orderId), {
      paidFils: toNum(r.paidFils),
      refundedFils: toNum(r.refundedFils),
    });
  }

  return rows.map((order) => {
    const { paidFils = 0, refundedFils = 0 } = map.get(Number(order.id)) ?? {};
    const totalFils = toNum(order.totalFils);
    const netPaidFils = Math.max(0, paidFils - refundedFils);
    const remainingFils = Math.max(0, totalFils - netPaidFils);

    return {
      ...order,
      paidFils,
      refundedFils,
      netPaidFils,
      remainingFils,
    };
  });
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

const parseDate = (v: any) => {
  if (!v) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d;
};

const escapeHtml = (value: unknown) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const lineTypeLabel = (lineType?: string | null) => {
  if (lineType === "service") return "Service";
  if (lineType === "product") return "Product";
  if (lineType === "package") return "Package";
  return "-";
};

const buildInvoice80Html = (payload: {
  order: any;
  customerName: string;
  items: Array<{
    lineType: string;
    description: string;
    quantity: number;
    unitPriceFils: number;
    totalPriceFils: number;
  }>;
  payments: Array<{
    methodName: string;
    amountFils: number;
    createdAt?: string;
  }>;
  subtotalFils: number;
  discountFils: number;
  taxFils: number;
  totalFils: number;
  paidFils: number;
  refundedFils: number;
  netPaidFils: number;
  remainingFils: number;
}) => {
  const {
    order,
    customerName,
    items,
    payments,
    subtotalFils,
    discountFils,
    taxFils,
    totalFils,
    paidFils,
    refundedFils,
    netPaidFils,
    remainingFils,
  } = payload;

  const itemRows = items
    .map((item) => {
      return `
        <tr>
          <td>${escapeHtml(item.description || "-")}</td>
          <td class="center">${escapeHtml(lineTypeLabel(item.lineType))}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${filsToKwd(item.totalPriceFils)}</td>
        </tr>
      `;
    })
    .join("");

  const paymentRows = payments.length
    ? payments
        .map((payment) => {
          return `
            <tr>
              <td>${escapeHtml(payment.methodName)}</td>
              <td class="right">${filsToKwd(payment.amountFils)}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="2" class="center">No payments</td>
      </tr>
    `;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${escapeHtml(order.id)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      width: 72mm;
      font-family: Arial, "Cairo", sans-serif;
      color: #000;
      font-size: 11px;
      line-height: 1.35;
    }
    h1,h2,h3,p { margin: 0; }
    .head { text-align: center; margin-bottom: 6px; }
    .title { font-size: 15px; font-weight: 700; }
    .muted { color: #444; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 3px 0; vertical-align: top; }
    th { border-bottom: 1px dashed #000; font-weight: 700; }
    .right { text-align: right; }
    .center { text-align: center; }
    .summary .row { margin: 2px 0; }
    .strong { font-weight: 700; }
    .footer { text-align: center; margin-top: 8px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="head">
    <div class="title">Beauty Center</div>
    <div class="muted">POS Invoice (80mm)</div>
  </div>

  <div class="row"><span>Order #</span><span class="strong">${escapeHtml(order.id)}</span></div>
  <div class="row"><span>Date</span><span>${escapeHtml(formatDateTime(order.createdAt))}</span></div>
  <div class="row"><span>Status</span><span>${escapeHtml(order.status || "-")}</span></div>
  <div class="row"><span>Customer</span><span>${escapeHtml(customerName)}</span></div>
  ${
    order.externalRef
      ? `<div class="row"><span>Ref</span><span>${escapeHtml(order.externalRef)}</span></div>`
      : ""
  }

  <div class="sep"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="center">Type</th>
        <th class="center">Qty</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="sep"></div>

  <div class="summary">
    <div class="row"><span>Subtotal</span><span>${filsToKwd(subtotalFils)}</span></div>
    <div class="row"><span>Discount</span><span>${filsToKwd(discountFils)}</span></div>
    <div class="row"><span>Tax</span><span>${filsToKwd(taxFils)}</span></div>
    <div class="row strong"><span>Total</span><span>${filsToKwd(totalFils)}</span></div>
    <div class="row"><span>Paid</span><span>${filsToKwd(paidFils)}</span></div>
    <div class="row"><span>Refunded</span><span>${filsToKwd(refundedFils)}</span></div>
    <div class="row"><span>Net paid</span><span>${filsToKwd(netPaidFils)}</span></div>
    <div class="row strong"><span>Remaining</span><span>${filsToKwd(remainingFils)}</span></div>
  </div>

  <div class="sep"></div>

  <table>
    <thead>
      <tr>
        <th>Payments</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows}
    </tbody>
  </table>

  <div class="footer">
    <div>Thank you</div>
    <div>${escapeHtml(formatDateTime(new Date()))}</div>
  </div>
</body>
</html>`;
};

const buildPosInvoice80 = async (orderId: number) => {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: OrderItem, as: "items" },
      {
        model: Payment,
        as: "payments",
        include: [{ model: PaymentMethod, as: "method" }],
      },
      { model: Customer, as: "customer" },
    ],
    order: [[{ model: Payment, as: "payments" }, "id", "ASC"]],
  });

  if (!order) return null;

  const orderJson = (order as any).toJSON?.() ?? order;

  const items = Array.isArray(orderJson.items)
    ? orderJson.items.map((item: any) => ({
        lineType: String(item.lineType || ""),
        description: String(item.description || item.lineType || `#${item.id}`),
        quantity: Number(item.quantity || 0),
        unitPriceFils: Number(item.unitPriceFils || 0),
        totalPriceFils: Number(item.totalPriceFils || 0),
      }))
    : [];

  const completedPayments = Array.isArray(orderJson.payments)
    ? orderJson.payments.filter(
        (payment: any) => payment.status === "completed",
      )
    : [];

  const paymentLines = completedPayments.map((payment: any) => ({
    methodName: String(
      payment?.method?.nameEn ||
        payment?.method?.code ||
        `Method #${Number(payment.methodId || 0)}`,
    ),
    amountFils: Number(payment.amountFils || 0),
    createdAt: payment.createdAt,
  }));

  const paidFils = completedPayments
    .filter((payment: any) => Number(payment.amountFils || 0) > 0)
    .reduce(
      (sum: number, payment: any) => sum + Number(payment.amountFils || 0),
      0,
    );

  const refundedFils = completedPayments
    .filter((payment: any) => Number(payment.amountFils || 0) < 0)
    .reduce(
      (sum: number, payment: any) =>
        sum + Math.abs(Number(payment.amountFils || 0)),
      0,
    );

  const totalFils = Number(orderJson.totalFils || 0);
  const netPaidFils = Math.max(0, paidFils - refundedFils);
  const remainingFils = Math.max(0, totalFils - netPaidFils);

  const customerName = [
    orderJson?.customer?.firstName,
    orderJson?.customer?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const invoicePayload = {
    orderId: Number(orderJson.id),
    orderNumber: `#${Number(orderJson.id)}`,
    status: String(orderJson.status || "-"),
    createdAt: orderJson.createdAt,
    externalRef: orderJson.externalRef ?? null,
    customer: customerName || orderJson?.customer?.phone || "Walk-in",
    subtotalFils: Number(orderJson.subtotalFils || 0),
    discountFils: Number(orderJson.discountFils || 0),
    taxFils: Number(orderJson.taxFils || 0),
    totalFils,
    paidFils,
    refundedFils,
    netPaidFils,
    remainingFils,
    subtotalKwd: filsToKwd(Number(orderJson.subtotalFils || 0)),
    discountKwd: filsToKwd(Number(orderJson.discountFils || 0)),
    taxKwd: filsToKwd(Number(orderJson.taxFils || 0)),
    totalKwd: filsToKwd(totalFils),
    paidKwd: filsToKwd(paidFils),
    refundedKwd: filsToKwd(refundedFils),
    netPaidKwd: filsToKwd(netPaidFils),
    remainingKwd: filsToKwd(remainingFils),
    items: items.map((item: any) => ({
      ...item,
      unitPriceKwd: filsToKwd(item.unitPriceFils),
      totalPriceKwd: filsToKwd(item.totalPriceFils),
    })),
    payments: paymentLines.map((payment: any) => ({
      ...payment,
      amountKwd: filsToKwd(payment.amountFils),
    })),
  };

  const html = buildInvoice80Html({
    order: orderJson,
    customerName: invoicePayload.customer,
    items,
    payments: paymentLines,
    subtotalFils: invoicePayload.subtotalFils,
    discountFils: invoicePayload.discountFils,
    taxFils: invoicePayload.taxFils,
    totalFils: invoicePayload.totalFils,
    paidFils: invoicePayload.paidFils,
    refundedFils: invoicePayload.refundedFils,
    netPaidFils: invoicePayload.netPaidFils,
    remainingFils: invoicePayload.remainingFils,
  });

  return {
    ...invoicePayload,
    html,
  };
};

const finalizeOrderAsPaid = async (params: {
  order: any;
  userId: number;
  now: Date;
  transaction: any;
}) => {
  const { order, userId, now, transaction } = params;

  const items = await OrderItem.findAll({
    where: { orderId: Number(order.id) },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  for (const it of items) {
    // Product: deduct stock when order is fully paid
    if (it.lineType === "product") {
      const product = await Product.findByPk(it.referenceId!, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!product) throw new AppError("Product not found", 404);

      const qty = Math.max(1, Number(it.quantity || 1));
      if (Number(product.currentQty) < qty) {
        throw new AppError("Insufficient stock", 400, "pos.insufficient_stock");
      }

      const after = Number(product.currentQty) - qty;
      await product.update({ currentQty: after } as any, { transaction });

      await StockMovement.create(
        {
          productId: product.id,
          change: -qty,
          reason: "sale",
          referenceId: String(order.id),
          resultingQty: after,
          createdBy: userId,
        } as any,
        { transaction },
      );

      continue;
    }

    // Package purchase: activate customer package only when order is paid
    if (it.lineType === "package") {
      const customerId = Number(order.customerId || 0);
      if (!customerId) {
        throw new AppError(
          "Package purchase requires customerId",
          400,
          "packages.customer_required",
        );
      }

      const planId = Number(it.referenceId || 0);
      if (!planId) {
        throw new AppError(
          "Package item requires referenceId=planId",
          400,
          "packages.plan_required",
        );
      }

      const plan = await PackagePlan.findByPk(planId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!plan || !(plan as any).isActive) {
        throw new AppError(
          "Package plan not found or inactive",
          400,
          "packages.plan_inactive",
        );
      }

      const qty = Math.max(1, Number(it.quantity || 1));
      const startAt = now;
      const expiresAt = new Date(startAt);
      expiresAt.setDate(
        expiresAt.getDate() + Number((plan as any).validDays || 0),
      );

      await CustomerPackage.create(
        {
          customerId,
          planId,
          startAt,
          expiresAt,
          status: "active",
          totalSessions: Number((plan as any).sessionsCount) * qty,
          usedSessions: 0,
          totalValueFils: Number((plan as any).priceCents) * qty, // ✅ fils
          usedValueFils: 0,
          createdBy: userId,
        } as any,
        { transaction },
      );

      continue;
    }
  }

  await order.update({ status: "paid" }, { transaction });
};

export const createPosOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = createPosOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: req.t?.("pos.invalid_input", "Invalid input"),
          code: "pos.invalid_input",
          details: parsed.error.flatten(),
        },
      });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError(
        req.t?.("auth.unauthorized", "Unauthorized") ?? "Unauthorized",
        401,
        "auth.unauthorized",
      );
    }

    const trx = await sequelize.transaction();
    try {
      const openShift = await ShiftSession.findOne({
        where: { userId, status: "open" },
        transaction: trx,
        lock: trx.LOCK.UPDATE,
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

      const data = parsed.data;

      if (data.customerId) {
        const c = await Customer.findByPk(data.customerId, {
          transaction: trx,
        });
        if (!c) {
          throw new AppError(
            req.t?.("customer.not_found", "Customer not found") ??
              "Customer not found",
            404,
            "customer.not_found",
          );
        }
      }

      const now = new Date();

      // ✅ build items in FILS server-side (do NOT trust client totals)
      const itemsFils: any[] = [];

      for (const i of data.items) {
        const qty = Math.max(1, Number(i.quantity ?? 1));

        // default: from client (will be overridden for package)
        let unitPriceFils = kwdToFils(i.unitPriceKwd);
        let totalPriceFils = unitPriceFils * qty;

        // ✅ PACKAGE: validate price from DB (ignore client price)
        if (i.lineType === "package") {
          if (!data.customerId) {
            throw new AppError(
              "Package purchase requires customerId",
              400,
              "packages.customer_required",
            );
          }
          if (!i.referenceId) {
            throw new AppError(
              "Package item requires referenceId=planId",
              400,
              "packages.plan_required",
            );
          }

          const planId = Number(i.referenceId);
          const plan = await PackagePlan.findByPk(planId, {
            transaction: trx,
            lock: trx.LOCK.UPDATE,
          });

          if (!plan || !(plan as any).isActive) {
            throw new AppError(
              "Package plan not found or inactive",
              400,
              "packages.plan_inactive",
            );
          }

          const dbPlanPriceFils = Number(
            (plan as any).priceFils ??
              (plan as any).priceCents ??
              kwdToFils(Number((plan as any).priceKwd ?? 0)),
          );

          unitPriceFils = Number.isFinite(dbPlanPriceFils)
            ? Math.trunc(dbPlanPriceFils)
            : 0;

          if (unitPriceFils <= 0) {
            throw new AppError(
              "Invalid package plan price",
              400,
              "packages.invalid_price",
            );
          }

          totalPriceFils = unitPriceFils * qty;
        }

        const normalizedStaffId = i.lineType === "service" ? (i.staffId ?? null) : null;
        const normalizedRoomId = i.lineType === "service" ? (i.roomId ?? null) : null;
        const normalizedAppointmentId =
          i.lineType === "package" ? null : (i.appointmentId ?? null);

        itemsFils.push({
          ...i,
          staffId: normalizedStaffId,
          roomId: normalizedRoomId,
          appointmentId: normalizedAppointmentId,
          quantity: qty,
          unitPriceFils,
          totalPriceFils,
        });
      }

      const subtotalFils = sum(
        itemsFils.map((i) => Number(i.totalPriceFils || 0)),
      );
      const discountFils = kwdToFils(data.discountKwd ?? 0);
      const taxFils = kwdToFils(data.taxKwd ?? 0);
      const totalFilsBeforePkg = Math.max(
        0,
        subtotalFils - discountFils + taxFils,
      );

      const order = await Order.create(
        {
          externalRef: data.externalRef ?? null,
          customerId: data.customerId ?? null,
          createdBy: userId,
          shiftSessionId: (openShift as any).id,
          status: "open",
          subtotalFils,
          discountFils,
          taxFils,
          totalFils: totalFilsBeforePkg,
        } as any,
        { transaction: trx },
      );

      // ✅ create items
      for (const it of itemsFils) {
        await OrderItem.create(
          {
            orderId: (order as any).id,
            lineType: it.lineType,
            referenceId: it.referenceId ?? null,
            description: it.description ?? null,
            quantity: it.quantity,
            unitPriceFils: it.unitPriceFils,
            totalPriceFils: it.totalPriceFils,
            staffId: it.staffId ?? null,
            roomId: it.roomId ?? null,
            appointmentId: it.appointmentId ?? null,
          } as any,
          { transaction: trx },
        );
      }

      // ✅ NEW: apply package at order creation (fixes overpay)
      if (
        Number(order.customerId || 0) > 0 &&
        Number(order.totalFils || 0) > 0
      ) {
        const pkgApply = await applyPackageToOrderTx({
          customerId: Number(order.customerId),
          orderId: Number(order.id),
          userId,
          now,
          transaction: trx,
        });

        if (pkgApply.applied && pkgApply.coveredFils > 0) {
          const prevDiscount = Number((order as any).discountFils || 0);
          const prevTotal = Number((order as any).totalFils || 0);
          const covered = Number(pkgApply.coveredFils || 0);

          await order.update(
            {
              discountFils: prevDiscount + covered,
              totalFils: Math.max(0, prevTotal - covered),
            } as any,
            { transaction: trx },
          );

          await (order as any).reload({
            transaction: trx,
            lock: trx.LOCK.UPDATE,
          });
        }
      }

      // ✅ if total is zero, finalize paid now
      if (Number((order as any).totalFils || 0) === 0) {
        await finalizeOrderAsPaid({
          order,
          userId,
          now,
          transaction: trx,
        });
        await (order as any).reload({ transaction: trx });
      }

      await trx.commit();
      return res.status(201).json({ data: order });
    } catch (e) {
      await trx.rollback();
      throw e;
    }
  },
);

export const getPosOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, as: "items" },
        { model: Payment, as: "payments" },
        { model: Customer, as: "customer" },
      ],
      order: [[{ model: Payment, as: "payments" }, "id", "ASC"]],
    });

    if (!order)
      throw new AppError(
        req.t?.("pos.order_not_found", "Order not found") ?? "Order not found",
        404,
        "pos.order_not_found",
      );

    const payments = ((order as any).payments ?? []) as any[];

    // completed payments only
    const completed = payments.filter((p) => p.status === "completed");

    const paidPositiveFils = completed
      .filter((p) => Number(p.amountFils || 0) > 0)
      .reduce((s, p) => s + Number(p.amountFils || 0), 0);

    const refundedFils = completed
      .filter((p) => Number(p.amountFils || 0) < 0)
      .reduce((s, p) => s + Math.abs(Number(p.amountFils || 0)), 0);

    const netPaidFils = paidPositiveFils - refundedFils;

    const totalFils = Number((order as any).totalFils || 0);
    const remainingFils = Math.max(0, totalFils - Math.max(0, netPaidFils));

    res.json({
      data: {
        ...((order as any).toJSON?.() ?? order),
        paidFils: paidPositiveFils,
        refundedFils,
        netPaidFils,
        remainingFils,
      },
    });
  },
);

export const getPosOrderInvoice80 = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new AppError(
        req.t?.("pos.invalid_input", "Invalid input") ?? "Invalid input",
        400,
        "pos.invalid_input",
      );
    }

    const invoice = await buildPosInvoice80(id);
    if (!invoice) {
      throw new AppError(
        req.t?.("pos.order_not_found", "Order not found") ?? "Order not found",
        404,
        "pos.order_not_found",
      );
    }

    if (String(req.query.raw ?? "") === "1") {
      return res.type("text/html").send(invoice.html);
    }

    return res.json({
      data: {
        ...invoice,
        html: undefined,
      },
      html: invoice.html,
    });
  },
);

export const payPosOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const parsed = payPosOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        message: req.t?.("pos.invalid_input", "Invalid input"),
        code: "pos.invalid_input",
        details: parsed.error.flatten(),
      },
    });
  }

  const userId = (req as any).user?.id;
  if (!userId) throw new AppError("Unauthorized", 401, "auth.unauthorized");

  const result = await sequelize.transaction(async (trx) => {
    const now = new Date();

    const openShift = await ShiftSession.findOne({
      where: { userId, status: "open" },
      transaction: trx,
      lock: trx.LOCK.UPDATE,
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

    const order = await Order.findByPk(id, {
      transaction: trx,
      lock: trx.LOCK.UPDATE,
    });
    if (!order)
      throw new AppError("Order not found", 404, "pos.order_not_found");

    // ensure payment goes to same shift
    if (
      order.shiftSessionId &&
      order.shiftSessionId !== (openShift as any).id
    ) {
      throw new AppError(
        "Order belongs to a different shift",
        400,
        "pos.order_shift_mismatch",
        {
          orderShiftSessionId: order.shiftSessionId,
          openShiftId: (openShift as any).id,
        },
      );
    }

    if (!order.shiftSessionId) {
      await order.update({ shiftSessionId: (openShift as any).id } as any, {
        transaction: trx,
      });
    }

    if (order.status === "paid") {
      return {
        orderId: order.id,
        status: "paid",
        alreadyPaid: true,
        paidFils: Number(order.totalFils || 0),
        remainingFils: 0,
        packageCoveredFils: 0,
      };
    }

    if (!["open", "partially_paid"].includes(String(order.status))) {
      throw new AppError("Order is not payable", 400, "pos.not_payable", {
        status: order.status,
      });
    }

    const orderTotalNow = Number((order as any).totalFils || 0);
    if (orderTotalNow <= 0) {
      throw new AppError("Invalid order total", 400, "pos.invalid_total");
    }

    // paid so far (completed only)
    const paidPayments = await Payment.findAll({
      where: { orderId: id, status: "completed" },
      transaction: trx,
      lock: trx.LOCK.UPDATE,
    });

    const paidFilsBefore = paidPayments.reduce(
      (s, p) => s + Number(p.amountFils || 0),
      0,
    );
    const remainingFilsBefore = Math.max(0, orderTotalNow - paidFilsBefore);

    if (remainingFilsBefore <= 0) {
      await finalizeOrderAsPaid({ order, userId, now, transaction: trx });
      return {
        orderId: order.id,
        status: "paid",
        alreadyPaid: true,
        paidFils: orderTotalNow,
        remainingFils: 0,
        packageCoveredFils: 0,
      };
    }

    // incoming payments
    const incoming = parsed.data.payments.map((p) => ({
      methodId: p.methodId,
      amountFils: kwdToFils(p.amountKwd),
      providerReference: p.providerReference ?? null,
    }));

    const incomingSum = incoming.reduce(
      (s, p) => s + Number(p.amountFils || 0),
      0,
    );

    if (incomingSum <= 0) {
      throw new AppError(
        "Payment amount must be greater than 0",
        400,
        "pos.payment_amount_invalid",
      );
    }

    if (incomingSum > remainingFilsBefore) {
      const details = {
        remainingFils: remainingFilsBefore,
        incomingSum,
        orderTotalFils: orderTotalNow,
        paidFilsBefore,
        packageCoveredFils: 0,
      };

      throw new AppError(
        "Payments total cannot exceed remaining amount",
        400,
        "pos.overpay_not_allowed",
        details,
      );
    }

    // validate methods active
    const methodIds = [...new Set(incoming.map((p) => p.methodId))];
    const methods = await PaymentMethod.findAll({
      where: { id: methodIds, isActive: true },
      transaction: trx,
    });
    if (methods.length !== methodIds.length) {
      throw new AppError("Invalid payment method", 400, "pos.invalid_method");
    }

    await Payment.bulkCreate(
      incoming.map((p) => ({
        orderId: id,
        methodId: p.methodId,
        amountFils: p.amountFils,
        status: "completed",
        providerReference: p.providerReference,
        shiftSessionId: (openShift as any).id,
      })) as any,
      { transaction: trx },
    );

    const paidFilsAfter = paidFilsBefore + incomingSum;
    const remainingFilsAfter = Math.max(0, orderTotalNow - paidFilsAfter);

    if (remainingFilsAfter === 0) {
      await finalizeOrderAsPaid({ order, userId, now, transaction: trx });
      return {
        orderId: order.id,
        status: "paid",
        alreadyPaid: false,
        paidFils: paidFilsAfter,
        remainingFils: 0,
        packageCoveredFils: 0,
      };
    }

    await order.update({ status: "partially_paid" } as any, {
      transaction: trx,
    });

    return {
      orderId: order.id,
      status: "partially_paid",
      alreadyPaid: false,
      paidFils: paidFilsAfter,
      remainingFils: remainingFilsAfter,
      packageCoveredFils: 0,
    };
  });

  const invoice = await buildPosInvoice80(id);

  res.json({
    status: "success",
    data: {
      ...result,
      invoice80: invoice ? { ...invoice, html: undefined } : null,
      invoice80Html: invoice?.html ?? null,
    },
  });
});
export const listPosOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = listPosOrdersSchema.safeParse(req.query ?? {});
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

    const { page, limit, status, customerId, from, to, q } = parsed.data;

    const where: any = {};

    if (status) where.status = String(status);
    if (customerId) where.customerId = Number(customerId);

    // date range on createdAt
    if (from || to) {
      const createdAt: any = {};
      if (from) createdAt[Op.gte] = new Date(from);
      if (to) createdAt[Op.lte] = new Date(to);
      where.createdAt = createdAt;
    }

    // search
    if (q) {
      const qq = String(q).trim();
      if (qq.length) {
        const maybeId = Number(qq);
        where[Op.or] = [
          { externalRef: { [Op.like]: `%${qq}%` } },
          ...(Number.isFinite(maybeId) ? [{ id: maybeId }] : []),
        ];
      }
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [{ model: Customer, as: "customer", required: false }],
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
      distinct: true,
    });

    const rowsJson = rows.map((r) => (r as any).toJSON?.() ?? r);
    const withPaid = await attachPaidRemaining(rowsJson);

    return res.json({
      data: withPaid,
      meta: {
        total: count,
        page,
        limit,
        pages: Math.max(1, Math.ceil(count / limit)),
      },
    });
  },
);

export const listPosOrdersHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = listPosOrdersSchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return res.status(400).json({
        error: {
          message:
            req.t?.("pos.invalid_filters", "Invalid filters") ??
            "Invalid filters",
          details: flat,
        },
      });
    }

    const { status, customerId, from, to, q, page, limit } = parsed.data;

    const where: WhereOptions = {};

    if (status) (where as any).status = status;
    if (customerId) (where as any).customerId = customerId;

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (from && !fromDate)
      throw new AppError(
        req.t?.("pos.from_invalid", "from is invalid") ?? "from is invalid",
        400,
        "pos.from_invalid",
      );

    if (to && !toDate)
      throw new AppError(
        req.t?.("pos.to_invalid", "to is invalid") ?? "to is invalid",
        400,
        "pos.to_invalid",
      );

    if (fromDate || toDate) {
      (where as any).createdAt = {};
      if (fromDate) (where as any).createdAt[Op.gte] = fromDate;
      if (toDate) (where as any).createdAt[Op.lte] = toDate;
    }

    // q search: externalRef OR id
    if (q) {
      const qStr = String(q).trim();
      const qNum = Number(qStr);
      (where as any)[Op.or] = [
        { externalRef: { [Op.like]: `%${qStr}%` } },
        ...(Number.isFinite(qNum) && qNum > 0 ? [{ id: qNum }] : []),
      ];
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
        { model: Customer, as: "customer", required: false },
        { model: OrderItem, as: "items", required: false },
        { model: Payment, as: "payments", required: false },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      data: rows,
      meta: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  },
);

export const cancelOrderAndRefundPaidAmount = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const userId = (req as any).user?.id;
    if (!userId) throw new AppError("Unauthorized", 401, "auth.unauthorized");

    const result = await sequelize.transaction(async (t) => {
      // ✅ Require open shift for financial ops (cancel+refund is financial)
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

      // 1) Lock order
      const order = await Order.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order)
        throw new AppError(
          req.t?.("pos.order_not_found", "Order not found") ??
            "Order not found",
          404,
          "pos.order_not_found",
        );

      // ✅ Only allow cancel while NOT paid (open / partially_paid)
      if (!["open", "partially_paid"].includes(String(order.status))) {
        throw new AppError(
          req.t?.("pos.order_not_cancelable", "Order is not cancelable") ??
            "Order is not cancelable",
          400,
          "pos.order_not_cancelable",
          { status: order.status },
        );
      }

      // 2) Get completed payments (lock)
      const payments = await Payment.findAll({
        where: { orderId: id, status: "completed" },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      // Sum paid per method (positive only)
      const byMethod = new Map<number, number>();
      let totalPaid = 0;

      for (const p of payments as any[]) {
        const amt = Number(p.amountFils || 0);
        if (amt <= 0) continue; // ignore negatives
        const methodId = Number(p.methodId);
        byMethod.set(methodId, (byMethod.get(methodId) ?? 0) + amt);
        totalPaid += amt;
      }

      // 3) If nothing paid -> just cancel
      if (totalPaid <= 0) {
        await order.update({ status: "cancelled" } as any, { transaction: t });
        return {
          orderId: order.id,
          status: "cancelled",
          refundedFils: 0,
        };
      }

      // 4) Create negative payments to refund paid amount (per method)
      // Validate methods exist (avoid FK issues)
      const methodIds = [...byMethod.keys()];
      const methods = await PaymentMethod.findAll({
        where: { id: methodIds },
        transaction: t,
      });
      if (methods.length !== methodIds.length) {
        throw new AppError(
          req.t?.("pos.invalid_method", "Invalid payment method") ??
            "Invalid payment method",
          400,
          "pos.invalid_method",
        );
      }

      const refundRows = methodIds.map((methodId) => ({
        orderId: id,
        methodId,
        amountFils: -Math.abs(byMethod.get(methodId) || 0),
        status: "completed",
        providerReference: null,
        shiftSessionId: (openShift as any).id, // ✅ add this
      }));
      await Payment.bulkCreate(refundRows as any, { transaction: t });

      // 5) Cancel the order
      await order.update({ status: "cancelled" } as any, { transaction: t });

      // ✅ IMPORTANT: no stock reversal here
      // because stock is deducted ONLY when order becomes "paid"
      return {
        orderId: order.id,
        status: "cancelled",
        refundedFils: totalPaid,
      };
    });

    res.json({ status: "success", data: result });
  },
);
