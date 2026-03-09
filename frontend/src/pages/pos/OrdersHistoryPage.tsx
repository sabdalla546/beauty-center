/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ClipLoader } from "react-spinners";
import { ReceiptText, Filter, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";

import { useCustomers } from "@/hooks/customers/useCustomers";
import { usePaymentMethods } from "@/hooks/paymentMethods/usePaymentMethods";
import { usePosOrdersHistory } from "@/hooks/pos/usePosOrders";
import {
  useCancelPosOrder,
  getApiErrorInfo,
  type PosPayErrorDetails,
  usePayPosOrder,
  useRefundPosOrder,
} from "@/hooks/pos/usePosMutations";
import { usePosOrder } from "@/hooks/pos/usePosOrders";
import { usePosOrdersColumns } from "@/pages/pos/_components/posOrdersColumns";
import type { PosOrder, PosPayment, PosOrderItem } from "@/pages/pos/types";

const toIso = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const formatDateTime = (value?: string | null, locale = enUS) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM d, yyyy h:mm a", { locale });
};

const sum = (values: number[]) => values.reduce((acc, val) => acc + val, 0);

const OrdersHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;
  const [searchParams] = useSearchParams();
  const presetOrderId = Number(searchParams.get("orderId") || 0) || undefined;

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [status, setStatus] = useState("");
  const [refundedOnly, setRefundedOnly] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState<number | undefined>();

  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null);
  const [payMethod, setPayMethod] = useState("");

  const customersQuery = useCustomers({
    currentPage: 1,
    itemsPerPage: 20,
    searchQuery: customerSearch,
  });

  const paymentMethodsQuery = usePaymentMethods({ activeOnly: true });
  const paymentMethods = paymentMethodsQuery.data ?? [];

  const statusQuery = refundedOnly ? "refunded" : status || undefined;

  const ordersQuery = usePosOrdersHistory({
    currentPage,
    itemsPerPage,
    status: statusQuery,
    customerId,
    from: toIso(from),
    to: toIso(to),
    q: searchQuery || undefined,
  });

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;
  const payOrderMutation = usePayPosOrder();
  const cancelOrderMutation = useCancelPosOrder();
  const refundOrderMutation = useRefundPosOrder();
  const selectedOrderQuery = usePosOrder(selectedOrder?.id ?? presetOrderId);

  const filteredOrders = useMemo(() => {
    if (paymentMethod === "all") return orders;
    const methodId = Number(paymentMethod);
    if (!methodId) return orders;
    return orders.filter((order) =>
      order.payments?.some((payment) => Number(payment.methodId) === methodId),
    );
  }, [orders, paymentMethod]);

  useEffect(() => {
    if (!selectedOrder) return;
    const match = orders.find((order) => order.id === selectedOrder.id);
    if (match) setSelectedOrder(match);
  }, [orders, selectedOrder]);

  useEffect(() => {
    const latest = selectedOrderQuery.data?.data;
    if (!latest) return;
    if (selectedOrder && Number(latest.id) !== Number(selectedOrder.id)) return;
    setSelectedOrder(latest);
  }, [selectedOrderQuery.data, selectedOrder]);

  useEffect(() => {
    if (!payMethod && paymentMethods.length) {
      setPayMethod(String(paymentMethods[0].id));
    }
  }, [payMethod, paymentMethods]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusQuery, customerId, from, to, searchQuery]);

  const columns = usePosOrdersColumns({
    onView: setSelectedOrder,
  });

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm.trim());
    setCurrentPage(1);
  };

  const handlePayOrder = () => {
    if (!detailOrder || detailOrder.status === "paid") return;
    const remainingKwdRaw = Number(
      detailOrder.remainingKwd ??
        (Number(
          detailOrder.remainingFils ??
            Math.max(
              0,
              Number(detailOrder.totalFils ?? 0) -
                Number(detailOrder.netPaidFils ?? 0),
            ),
        ) / 1000 ||
          0),
    );
    const remainingKwd = Math.max(0, Math.round(remainingKwdRaw * 1000) / 1000);
    if (!remainingKwd) return;
    const methodId = Number(payMethod);
    if (!methodId) return;
    const mutatePay = (amountKwd: number) =>
      payOrderMutation.mutateAsync({
        orderId: detailOrder.id,
        payments: [
          {
            amountKwd,
            methodId,
            providerReference: null,
          },
        ],
      });

    const applyResult = (result: any) => {
      if (!result) return;
      setSelectedOrder((prev) => {
        if (!prev) return prev;
        const paidFils = Number(result.paidFils ?? prev.paidFils ?? 0);
        const remainingFils = Number(result.remainingFils ?? prev.remainingFils ?? 0);
        return {
          ...prev,
          status: result.status ?? prev.status,
          paidFils: Number.isFinite(paidFils) ? paidFils : prev.paidFils,
          remainingFils: Number.isFinite(remainingFils)
            ? remainingFils
            : prev.remainingFils,
          netPaidFils: Number.isFinite(paidFils) ? paidFils : prev.netPaidFils,
          paidKwd: Number.isFinite(paidFils) ? paidFils / 1000 : prev.paidKwd,
          remainingKwd: Number.isFinite(remainingFils)
            ? remainingFils / 1000
            : prev.remainingKwd,
          netPaidKwd: Number.isFinite(paidFils) ? paidFils / 1000 : prev.netPaidKwd,
        };
      });
    };

    const applyOverpayDetails = (details: PosPayErrorDetails) => {
      const remainingFils = Number(details.remainingFils);
      const orderTotalFils = Number(details.orderTotalFils);
      const paidFilsBefore = Number(details.paidFilsBefore);

      setSelectedOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalFils: Number.isFinite(orderTotalFils)
            ? orderTotalFils
            : prev.totalFils,
          totalKwd: Number.isFinite(orderTotalFils)
            ? orderTotalFils / 1000
            : prev.totalKwd,
          paidFils: Number.isFinite(paidFilsBefore)
            ? paidFilsBefore
            : prev.paidFils,
          paidKwd: Number.isFinite(paidFilsBefore)
            ? paidFilsBefore / 1000
            : prev.paidKwd,
          netPaidFils: Number.isFinite(paidFilsBefore)
            ? paidFilsBefore
            : prev.netPaidFils,
          netPaidKwd: Number.isFinite(paidFilsBefore)
            ? paidFilsBefore / 1000
            : prev.netPaidKwd,
          remainingFils: Number.isFinite(remainingFils)
            ? remainingFils
            : prev.remainingFils,
          remainingKwd: Number.isFinite(remainingFils)
            ? remainingFils / 1000
            : prev.remainingKwd,
        };
      });
    };

    mutatePay(remainingKwd)
      .then((response: any) => {
        applyResult(response?.data?.data);
        ordersQuery.refetch();
        selectedOrderQuery.refetch();
      })
      .catch((error: any) => {
        const info = getApiErrorInfo(error);
        if (info.code !== "pos.overpay_not_allowed") return;

        const details = (info.details || {}) as PosPayErrorDetails;
        applyOverpayDetails(details);

        const serverRemainingFils = Number(details.remainingFils);
        const serverRemainingKwd = Number.isFinite(serverRemainingFils)
          ? Math.max(0, Math.round((serverRemainingFils / 1000) * 1000) / 1000)
          : 0;
        if (serverRemainingKwd <= 0) return;
        if (Math.abs(serverRemainingKwd - remainingKwd) < 0.001) return;

        mutatePay(serverRemainingKwd)
          .then((response: any) => {
            applyResult(response?.data?.data);
            ordersQuery.refetch();
            selectedOrderQuery.refetch();
          })
          .catch(() => {});
      });
  };

  const handleCancelOrder = () => {
    if (!detailOrder) return;
    if (!window.confirm(t("pos.cancel_confirm") || "Cancel this order?"))
      return;
    cancelOrderMutation.mutate(
      { orderId: detailOrder.id },
      {
        onSuccess: () => {
          ordersQuery.refetch();
          selectedOrderQuery.refetch();
        },
      },
    );
  };

  const handleRefundOrder = () => {
    if (!detailOrder) return;
    if (!window.confirm(t("pos.refund_confirm") || "Refund this order?"))
      return;
    refundOrderMutation.mutate(
      { orderId: detailOrder.id },
      {
        onSuccess: () => {
          ordersQuery.refetch();
          selectedOrderQuery.refetch();
        },
      },
    );
  };

  const formatKwd = (value: number) => {
    try {
      return new Intl.NumberFormat(i18n.language, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(value);
    } catch {
      return String(value);
    }
  };

  const paymentMethodMap = useMemo(
    () => new Map(paymentMethods.map((method) => [method.id, method])),
    [paymentMethods],
  );

  const getPaymentMethodLabel = (methodId?: number | null) => {
    if (!methodId) return "-";
    const method = paymentMethodMap.get(Number(methodId));
    if (!method) return `#${methodId}`;
    return i18n.language === "ar" ? method.nameAr : method.nameEn;
  };

  const getOrderStatusLabel = (value?: string | null) => {
    const status = String(value || "").trim();
    if (!status) return "-";
    const map: Record<string, string> = {
      open: "pos_history.status_open",
      partially_paid: "pos_history.status_partially_paid",
      paid: "pos_history.status_paid",
      cancelled: "pos_history.status_cancelled",
      refunded: "pos_history.status_refunded",
    };
    return t(map[status] || "status") || status;
  };

  const detailOrder = selectedOrderQuery.data?.data ?? selectedOrder;
  const orderItems: PosOrderItem[] = detailOrder?.items ?? [];
  const payments: PosPayment[] = detailOrder?.payments ?? [];
  const completedPayments = payments.filter(
    (payment) => !payment.status || payment.status === "completed",
  );
  const positivePayments = completedPayments.filter(
    (payment) => Number(payment.amountKwd ?? 0) > 0,
  );
  const refundPayments = completedPayments.filter(
    (payment) => Number(payment.amountKwd ?? 0) < 0,
  );
  const totalPaid =
    Number(detailOrder?.paidKwd ?? 0) ||
    sum(positivePayments.map((p) => Number(p.amountKwd || 0)));
  const totalRefunded =
    Number(detailOrder?.refundedKwd ?? 0) ||
    Math.abs(sum(refundPayments.map((p) => Number(p.amountKwd || 0))));
  const netPaidKwd =
    Number(detailOrder?.netPaidKwd ?? 0) ||
    Math.max(0, totalPaid - totalRefunded);
  const remainingKwd =
    Number(detailOrder?.remainingKwd ?? 0) ||
    Math.max(0, Number(detailOrder?.totalKwd ?? 0) - netPaidKwd);

  const totalItems =
    paymentMethod === "all"
      ? (meta?.total ?? filteredOrders.length)
      : filteredOrders.length;

  const totalPages = meta?.pages ?? 1;
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  return (
    <ProtectedComponent permission="pos.orders.read">
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<ReceiptText className="w-5 h-5 text-primary" />}
          title={t("pos_history.title") || "Orders history"}
          subtitle={
            t("pos_history.subtitle") ||
            "Review orders, payments, and refund activity."
          }
          search={{
            placeholder:
              t("pos_history.search") || "Search order id or reference...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => ordersQuery.refetch()}>
                <RefreshCcw className="w-4 h-4 mr-2" />
                {t("pos_history.refresh") || "Refresh"}
              </Button>
            </div>
          }
        />

        <Card className="bg-card border-border rounded-xl shadow-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("pos_history.filters") || "Filters"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("pos_history.from") || "From"}
                </label>
                <Input
                  type="datetime-local"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("pos_history.to") || "To"}
                </label>
                <Input
                  type="datetime-local"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("pos_history.status") || "Status"}
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={refundedOnly}
                >
                  <option value="">
                    {t("pos_history.all_statuses") || "All"}
                  </option>
                  <option value="open">
                    {t("pos_history.status_open") || "Open"}
                  </option>
                  <option value="partially_paid">
                    {t("pos_history.status_partially_paid") || "Partially paid"}
                  </option>
                  <option value="paid">
                    {t("pos_history.status_paid") || "Paid"}
                  </option>
                  <option value="cancelled">
                    {t("pos_history.status_cancelled") || "Cancelled"}
                  </option>
                  <option value="refunded">
                    {t("pos_history.status_refunded") || "Refunded"}
                  </option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("pos_history.customer") || "Customer"}
                </label>
                <SearchableSelect
                  value={customerId ? String(customerId) : ""}
                  onValueChange={(value) =>
                    setCustomerId(value ? Number(value) : undefined)
                  }
                  placeholder={
                    t("pos_history.select_customer") || "Select customer"
                  }
                  searchPlaceholder={
                    t("pos_history.search_customer") || "Search customers..."
                  }
                  onSearch={setCustomerSearch}
                  isLoading={customersQuery.isLoading}
                  emptyMessage={
                    t("pos_history.no_customers") || "No customers found"
                  }
                  allowClear={!!customerId}
                  onClear={() => setCustomerId(undefined)}
                >
                  {(customersQuery.data?.data ?? []).length ? (
                    (customersQuery.data?.data ?? []).map((customer) => (
                      <SearchableSelectItem
                        key={customer.id}
                        value={String(customer.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {`${customer.firstName ?? ""} ${
                              customer.lastName ?? ""
                            }`.trim() || `#${customer.id}`}
                          </span>
                          {customer.phone ? (
                            <span className="text-xs text-muted-foreground">
                              {customer.phone}
                            </span>
                          ) : null}
                        </div>
                      </SearchableSelectItem>
                    ))
                  ) : (
                    <SearchableSelectEmpty
                      message={
                        t("pos_history.no_customers") || "No customers found"
                      }
                    />
                  )}
                </SearchableSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("pos_history.payment_method") || "Payment method"}
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="all">
                    {t("pos_history.all_methods") || "All methods"}
                  </option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={String(method.id)}>
                      {i18n.language === "ar" ? method.nameAr : method.nameEn}
                    </option>
                  ))}
                </select>
                {!paymentMethodsQuery.isLoading && !paymentMethods.length ? (
                  <p className="text-xs text-amber-600 mt-1">
                    {t("pos.no_payment_methods") ||
                      "No active payment methods configured."}
                  </p>
                ) : null}
                {paymentMethod !== "all" ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("pos_history.payment_filter_note") ||
                      "Payment method filter applies to the current page."}
                  </p>
                ) : null}
              </div>
              <div className="flex items-end gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border"
                    checked={refundedOnly}
                    onChange={(e) => setRefundedOnly(e.target.checked)}
                  />
                  {t("pos_history.refunded_only") || "Refunded only"}
                </label>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <TableHeader
                title={t("pos_history.list") || "Orders list"}
                totalItems={totalItems}
                currentCount={filteredOrders.length}
                entityName={t("pos_history.orders") || "orders"}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                setCurrentPage={setCurrentPage}
              />

              {ordersQuery.isLoading ? (
                <div className="flex justify-center items-center h-80">
                  <div className="text-center">
                    <ClipLoader size={50} color="hsl(var(--primary))" />
                    <p className="text-muted-foreground mt-4">
                      {t("pos_history.loading") || "Loading orders..."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <DataTable<PosOrder, any>
                    columns={columns}
                    data={filteredOrders}
                    rowNumberStart={rowNumberStart}
                    enableRowNumbers
                    showExportCSV
                    showExportExcel
                    showPrint
                    fileName="orders-history"
                  />
                </div>
              )}

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-border bg-muted/50">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(size) => {
                      setItemsPerPage(size);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-card border-border rounded-xl shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {t("pos_history.details") || "Order details"}
                  </h2>
                  {detailOrder ? (
                    <Badge className="bg-primary/10 text-primary border border-primary/20">
                      #{detailOrder.id}
                    </Badge>
                  ) : null}
                </div>

                {!detailOrder ? (
                  <p className="text-sm text-muted-foreground">
                    {t("pos_history.select_order") ||
                      "Select an order to view details."}
                  </p>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t("pos_history.status") || "Status"}
                      </p>
                      <p className="font-medium">
                        {getOrderStatusLabel(detailOrder.status)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("pos_history.created_at") || "Created at"}:{" "}
                        {formatDateTime(detailOrder.createdAt, dateLocale)}
                      </p>
                      {detailOrder.externalRef ? (
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.external_ref") || "External ref"}:{" "}
                          {detailOrder.externalRef}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.subtotal_kwd") || "Subtotal (KWD)"}
                        </p>
                        <p className="font-semibold">
                          {formatKwd(Number(detailOrder.subtotalKwd ?? 0))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.total_kwd") || "Total (KWD)"}
                        </p>
                        <p className="font-semibold">
                          {formatKwd(Number(detailOrder.totalKwd ?? 0))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.paid_kwd") || "Paid (KWD)"}
                        </p>
                        <p className="font-semibold">{formatKwd(netPaidKwd)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.remaining_kwd") || "Remaining (KWD)"}
                        </p>
                        <p className="font-semibold">
                          {formatKwd(remainingKwd)}
                        </p>
                      </div>
                    </div>

                    {detailOrder.status !== "cancelled" &&
                    detailOrder.status !== "refunded" ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.pay_order") || "Pay order"}
                        </p>

                        {detailOrder.status !== "paid" ? (
                          <>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={payMethod}
                              onChange={(e) => setPayMethod(e.target.value)}
                              disabled={
                                payOrderMutation.isPending ||
                                cancelOrderMutation.isPending ||
                                refundOrderMutation.isPending ||
                                paymentMethodsQuery.isLoading ||
                                !paymentMethods.length
                              }
                            >
                              {paymentMethods.map((method) => (
                                <option
                                  key={method.id}
                                  value={String(method.id)}
                                >
                                  {i18n.language === "ar"
                                    ? method.nameAr
                                    : method.nameEn}
                                </option>
                              ))}
                            </select>
                            {!paymentMethodsQuery.isLoading &&
                            !paymentMethods.length ? (
                              <p className="text-xs text-amber-600">
                                {t("pos.no_payment_methods") ||
                                  "No active payment methods configured."}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              {t("pos_history.remaining_kwd") ||
                                "Remaining (KWD)"}
                              :{" "}
                              <span className="text-foreground font-medium">
                                {formatKwd(remainingKwd)}
                              </span>
                            </p>
                            <ProtectedComponent permission="pos.orders.pay">
                              <Button
                                onClick={handlePayOrder}
                                disabled={
                                  payOrderMutation.isPending ||
                                  cancelOrderMutation.isPending ||
                                  refundOrderMutation.isPending ||
                                  remainingKwd <= 0 ||
                                  !Number(payMethod)
                                }
                              >
                                {payOrderMutation.isPending ? (
                                  <span className="flex items-center gap-2">
                                    <ClipLoader
                                      size={16}
                                      color="hsl(var(--primary-foreground))"
                                    />
                                    {t("pos.processing") || "Processing"}
                                  </span>
                                ) : (
                                  t("pos.pay_order") || "Pay order"
                                )}
                              </Button>
                            </ProtectedComponent>
                          </>
                        ) : null}

                        {detailOrder.status === "paid" ? (
                          <ProtectedComponent permission="pos.orders.refund">
                            <Button
                              variant="outline"
                              onClick={handleRefundOrder}
                              disabled={
                                refundOrderMutation.isPending ||
                                payOrderMutation.isPending ||
                                cancelOrderMutation.isPending
                              }
                            >
                              {refundOrderMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                  <ClipLoader
                                    size={16}
                                    color="hsl(var(--foreground))"
                                  />
                                  {t("pos.processing") || "Processing"}
                                </span>
                              ) : (
                                t("pos.refund_order") || "Refund order"
                              )}
                            </Button>
                          </ProtectedComponent>
                        ) : null}

                        {detailOrder.status === "open" ||
                        detailOrder.status === "partially_paid" ? (
                          <ProtectedComponent permission="pos.orders.canceled">
                            <Button
                              variant="outline"
                              onClick={handleCancelOrder}
                              disabled={
                                cancelOrderMutation.isPending ||
                                payOrderMutation.isPending ||
                                refundOrderMutation.isPending
                              }
                            >
                              {cancelOrderMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                  <ClipLoader
                                    size={16}
                                    color="hsl(var(--foreground))"
                                  />
                                  {t("pos.processing") || "Processing"}
                                </span>
                              ) : (
                                t("pos.cancel_order") || "Cancel order"
                              )}
                            </Button>
                          </ProtectedComponent>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("pos_history.items") || "Items"}
                      </p>
                      {orderItems.length ? (
                        <div className="space-y-2">
                          {orderItems.map((item) => (
                            <div
                              key={
                                item.id ??
                                `${item.lineType}-${item.referenceId}`
                              }
                              className="rounded-md border border-border bg-background/60 p-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium">
                                    {item.description || item.lineType}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {(item.lineType === "product"
                                      ? t("pos.type_product")
                                      : item.lineType === "service"
                                        ? t("pos.type_service")
                                        : t("pos.type_package")) ||
                                      item.lineType}{" "}
                                    - {t("pos_history.qty") || "Qty"}{" "}
                                    {item.quantity}
                                  </p>
                                  {item.lineType === "service" &&
                                  Number(item.coveredQty ?? 0) > 0 ? (
                                    <p className="text-xs text-emerald-600">
                                      {t("pos_history.covered_qty") ||
                                        "Covered"}
                                      : {item.coveredQty ?? 0}
                                      {Number(item.uncoveredQty ?? 0) > 0
                                        ? ` - ${
                                            t("pos_history.uncovered_qty") ||
                                            "Uncovered"
                                          }: ${item.uncoveredQty ?? 0}`
                                        : ""}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="text-right text-xs">
                                  <p className="text-muted-foreground">
                                    {t("pos_history.unit_price_kwd") ||
                                      "Unit (KWD)"}
                                  </p>
                                  <p className="font-medium">
                                    {formatKwd(Number(item.unitPriceKwd ?? 0))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                <span>
                                  {t("pos_history.total_kwd") || "Total"}:{" "}
                                  <span className="text-foreground">
                                    {formatKwd(Number(item.totalPriceKwd ?? 0))}
                                  </span>
                                </span>
                                {item.appointmentId ? (
                                  <span>
                                    {t("pos_history.appointment") ||
                                      "Appointment"}{" "}
                                    #{item.appointmentId}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.no_items") ||
                            "No items for this order."}
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("pos_history.payments") || "Payments"}
                      </p>
                      {payments.length ? (
                        <div className="space-y-2">
                          {payments.map((payment) => {
                            const amount = Number(payment.amountKwd ?? 0);
                            const isRefund = amount < 0;
                            return (
                              <div
                                key={
                                  payment.id ??
                                  `${payment.methodId ?? "method"}-${amount}`
                                }
                                className="rounded-md border border-border bg-background/60 p-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {getPaymentMethodLabel(payment.methodId)}
                                      {isRefund ? (
                                        <Badge className="ml-2 bg-rose-500/15 text-rose-600 border-rose-500/30">
                                          {t("pos_history.refund") || "Refund"}
                                        </Badge>
                                      ) : null}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {payment.providerReference || "-"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={
                                        isRefund
                                          ? "text-rose-600 font-semibold"
                                          : "text-foreground font-semibold"
                                      }
                                    >
                                      {formatKwd(amount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateTime(
                                        payment.createdAt,
                                        dateLocale,
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.no_payments") || "No payments yet."}
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("pos_history.refund_trail") || "Refund trail"}
                      </p>
                      {refundPayments.length ? (
                        <div className="space-y-2">
                          {refundPayments.map((payment) => (
                            <div
                              key={
                                payment.id ??
                                `refund-${payment.methodId ?? "method"}`
                              }
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground">
                                {getPaymentMethodLabel(payment.methodId)}
                              </span>
                              <span className="text-rose-600 font-semibold">
                                {formatKwd(Number(payment.amountKwd ?? 0))}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span>
                              {t("pos_history.refunded_total") ||
                                "Refunded total"}
                            </span>
                            <span className="text-rose-600">
                              {formatKwd(-totalRefunded)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t("pos_history.no_refunds") ||
                            "No refunds recorded."}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                        <span>
                          {t("pos_history.total_paid") || "Total paid"}
                        </span>
                        <span className="text-foreground">
                          {formatKwd(totalPaid)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedComponent>
  );
};

export default OrdersHistoryPage;
