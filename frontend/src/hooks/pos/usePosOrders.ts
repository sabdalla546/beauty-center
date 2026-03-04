/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { PosOrdersResponse, PosOrderResponse } from "@/pages/pos/types";

interface UsePosOrdersParams {
  currentPage: number;
  itemsPerPage: number;
  status?: string;
  customerId?: number | null;
  from?: string;
  to?: string;
  q?: string;
}

const toNum = (value: any) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizePayments = (payments: any[]) =>
  payments.map((payment: any) => {
    const amountFilsRaw = payment.amountFils ?? payment.amountCents ?? 0;
    const amountFils = toNum(amountFilsRaw);
    const amountKwd = Number(
      payment.amountKwd ??
        (Number.isFinite(amountFils) ? amountFils / 1000 : 0),
    );

    return {
      ...payment,
      amountKwd,
      amountFils: Number.isFinite(amountFils) ? amountFils : undefined,
      amountCents: Number.isFinite(amountFils)
        ? amountFils
        : payment.amountCents,
    };
  });

const normalizeItems = (items: any[]) =>
  items.map((item: any) => {
    const unitFilsRaw = item.unitPriceFils ?? item.unitPriceCents ?? 0;
    const totalFilsRaw = item.totalPriceFils ?? item.totalPriceCents ?? 0;
    const unitFils = toNum(unitFilsRaw);
    const totalFils = toNum(totalFilsRaw);

    const unitKwd = Number(
      item.unitPriceKwd ?? (Number.isFinite(unitFils) ? unitFils / 1000 : 0),
    );
    const totalKwd = Number(
      item.totalPriceKwd ?? (Number.isFinite(totalFils) ? totalFils / 1000 : 0),
    );

    return {
      ...item,
      unitPriceKwd: unitKwd,
      totalPriceKwd: totalKwd,
      unitPriceFils: Number.isFinite(unitFils) ? unitFils : undefined,
      totalPriceFils: Number.isFinite(totalFils) ? totalFils : undefined,
      unitPriceCents: Number.isFinite(unitFils)
        ? unitFils
        : item.unitPriceCents,
      totalPriceCents: Number.isFinite(totalFils)
        ? totalFils
        : item.totalPriceCents,
    };
  });

const normalizeOrder = (order: any) => {
  const subtotalFilsRaw = order.subtotalFils ?? order.subtotalCents ?? 0;
  const discountFilsRaw = order.discountFils ?? order.discountCents ?? 0;
  const taxFilsRaw = order.taxFils ?? order.taxCents ?? 0;
  const totalFilsRaw = order.totalFils ?? order.totalCents ?? 0;

  const subtotalFils = toNum(subtotalFilsRaw);
  const discountFils = toNum(discountFilsRaw);
  const taxFils = toNum(taxFilsRaw);
  const totalFils = toNum(totalFilsRaw);

  const subtotalKwd = Number(
    order.subtotalKwd ??
      (Number.isFinite(subtotalFils) ? subtotalFils / 1000 : 0),
  );
  const discountKwd = Number(
    order.discountKwd ??
      (Number.isFinite(discountFils) ? discountFils / 1000 : 0),
  );
  const taxKwd = Number(
    order.taxKwd ?? (Number.isFinite(taxFils) ? taxFils / 1000 : 0),
  );
  const totalKwd = Number(
    order.totalKwd ?? (Number.isFinite(totalFils) ? totalFils / 1000 : 0),
  );

  const items = Array.isArray(order.items) ? normalizeItems(order.items) : [];
  const payments = Array.isArray(order.payments)
    ? normalizePayments(order.payments)
    : [];

  const completedPayments = payments.filter(
    (payment) => !payment.status || payment.status === "completed",
  );

  const computedPaidFils = completedPayments.reduce(
    (sum, payment) => sum + Math.max(0, toNum(payment.amountFils || 0)),
    0,
  );
  const computedRefundedFils = completedPayments.reduce((sum, payment) => {
    const amount = toNum(payment.amountFils || 0);
    return sum + (amount < 0 ? Math.abs(amount) : 0);
  }, 0);

  const paidFils = toNum(order.paidFils ?? computedPaidFils);
  const refundedFils = toNum(order.refundedFils ?? computedRefundedFils);
  const netPaidFils = toNum(
    order.netPaidFils ?? Math.max(0, paidFils - refundedFils),
  );
  const remainingFils = toNum(
    order.remainingFils ?? Math.max(0, totalFils - netPaidFils),
  );

  const paidKwd = Number(
    order.paidKwd ?? (Number.isFinite(paidFils) ? paidFils / 1000 : 0),
  );
  const refundedKwd = Number(
    order.refundedKwd ??
      (Number.isFinite(refundedFils) ? refundedFils / 1000 : 0),
  );
  const netPaidKwd = Number(
    order.netPaidKwd ?? (Number.isFinite(netPaidFils) ? netPaidFils / 1000 : 0),
  );
  const remainingKwd = Number(
    order.remainingKwd ??
      (Number.isFinite(remainingFils) ? remainingFils / 1000 : 0),
  );

  return {
    ...order,
    subtotalKwd,
    discountKwd,
    taxKwd,
    totalKwd,
    paidKwd,
    refundedKwd,
    netPaidKwd,
    remainingKwd,
    subtotalFils: Number.isFinite(subtotalFils) ? subtotalFils : undefined,
    discountFils: Number.isFinite(discountFils) ? discountFils : undefined,
    taxFils: Number.isFinite(taxFils) ? taxFils : undefined,
    totalFils: Number.isFinite(totalFils) ? totalFils : undefined,
    paidFils: Number.isFinite(paidFils) ? paidFils : undefined,
    refundedFils: Number.isFinite(refundedFils) ? refundedFils : undefined,
    netPaidFils: Number.isFinite(netPaidFils) ? netPaidFils : undefined,
    remainingFils: Number.isFinite(remainingFils) ? remainingFils : undefined,
    subtotalCents: Number.isFinite(subtotalFils)
      ? subtotalFils
      : order.subtotalCents,
    discountCents: Number.isFinite(discountFils)
      ? discountFils
      : order.discountCents,
    taxCents: Number.isFinite(taxFils) ? taxFils : order.taxCents,
    totalCents: Number.isFinite(totalFils) ? totalFils : order.totalCents,
    items,
    payments,
  };
};

export const usePosOrdersHistory = ({
  currentPage,
  itemsPerPage,
  status,
  customerId,
  from,
  to,
  q,
}: UsePosOrdersParams) => {
  return useQuery<PosOrdersResponse>({
    queryKey: [
      "pos-orders",
      currentPage,
      itemsPerPage,
      status,
      customerId,
      from,
      to,
      q,
    ],
    queryFn: () =>
      api
        .get("/pos/orders", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            status: status || undefined,
            customerId: customerId || undefined,
            from: from || undefined,
            to: to || undefined,
            q: q || undefined,
          },
        })
        .then((res) => {
          const payload = res.data || {};
          const data = Array.isArray(payload.data) ? payload.data : [];
          const meta = payload.meta || {
            total: data.length,
            page: currentPage,
            limit: itemsPerPage,
          };

          const orders = data.map((order: any) => normalizeOrder(order));

          return {
            ...payload,
            data: orders,
            meta: {
              ...meta,
              pages:
                Number(meta.pages) ||
                Math.max(
                  1,
                  Math.ceil((meta.total || orders.length) / meta.limit),
                ),
            },
          };
        }),
  });
};

export const usePosOrder = (id?: number | string) => {
  return useQuery<PosOrderResponse>({
    queryKey: ["pos-order", id],
    queryFn: () =>
      api.get(`/pos/orders/${id}`).then((res) => {
        const payload = res.data || {};
        const order = payload.data;
        if (!order) return payload;

        return {
          ...payload,
          data: normalizeOrder(order),
        };
      }),
    enabled: !!id,
  });
};
