/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { CreditCard, CalendarClock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import CompactHeader from "@/components/common/CompactHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useAppointmentCheckout } from "@/hooks/appointments/useAppointmentCheckout";
import { useProducts } from "@/hooks/products/useProducts";
import { usePaymentMethods } from "@/hooks/paymentMethods/usePaymentMethods";
import { usePayPosOrder } from "@/hooks/pos/usePosMutations";
import { usePosOrder } from "@/hooks/pos/usePosOrders";
import {
  canCheckoutAppointment,
  isAppointmentCheckedOut,
} from "@/pages/appointments/appointmentWorkflow";
import AppointmentStatusBadge from "@/pages/appointments/_components/AppointmentStatusBadge";
import type {
  Appointment,
  AppointmentCalendarResponse,
} from "@/pages/appointments/types";
import type { Product } from "@/pages/products/types";
import type { PosOrder } from "@/pages/pos/types";

type CheckoutProduct = {
  key: string;
  productId: number;
  name: string;
  quantity: number;
  unitPriceFils: number;
  totalPriceFils: number;
};

const toFilsFromKwd = (value?: number | null) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 1000);
};

const getServicePriceFils = (appointment?: Appointment | null) => {
  const service = appointment?.service;
  if (!service) return 0;
  const direct = service.priceFils ?? service.priceCents;
  if (direct !== undefined && direct !== null) return Number(direct) || 0;
  if (service.priceKwd !== undefined && service.priceKwd !== null)
    return toFilsFromKwd(service.priceKwd);
  return 0;
};

const getProductPriceFils = (product: Product) => {
  const direct = product.priceFils ?? product.priceCents;
  if (direct !== undefined && direct !== null) return Number(direct) || 0;
  if (product.priceKwd !== undefined && product.priceKwd !== null)
    return toFilsFromKwd(product.priceKwd);
  return 0;
};

const formatDateTime = (value?: string | null, locale = enUS) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM d, yyyy h:mm a", { locale });
};

const AppointmentCheckoutPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { id } = useParams();
  const appointmentId = Number(id);
  const location = useLocation();
  const queryClient = useQueryClient();

  const [productSearch, setProductSearch] = useState("");
  const [cartItems, setCartItems] = useState<CheckoutProduct[]>([]);
  const [discountFils, setDiscountFils] = useState(0);
  const [taxFils, setTaxFils] = useState(0);
  const [notes, setNotes] = useState("");
  const [createdOrder, setCreatedOrder] = useState<PosOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");

  const appointmentFromLocation = (
    location.state as { appointment?: Appointment } | null
  )?.appointment;

  const cachedAppointment = useMemo(() => {
    if (!appointmentId) return undefined;
    const cached = queryClient.getQueriesData<AppointmentCalendarResponse>({
      queryKey: ["appointments-calendar"],
    });
    for (const [, data] of cached) {
      const match = data?.data?.find(
        (appt) => Number(appt.id) === Number(appointmentId),
      );
      if (match) return match;
    }
    return undefined;
  }, [appointmentId, queryClient]);

  const appointment = appointmentFromLocation || cachedAppointment;
  const existingOrderQuery = usePosOrder(
    appointment?.checkoutOrderId ?? undefined,
  );

  const productsQuery = useProducts({
    currentPage: 1,
    itemsPerPage: 12,
    searchQuery: productSearch,
  });
  const paymentMethodsQuery = usePaymentMethods({ activeOnly: true });

  const checkoutMutation = useAppointmentCheckout();
  const payOrderMutation = usePayPosOrder();
  const products = productsQuery.data?.data ?? [];
  const paymentMethods = paymentMethodsQuery.data ?? [];
  const existingOrder = existingOrderQuery.data?.data ?? null;

  const isLocked = !!createdOrder;
  const isProcessing = checkoutMutation.isPending || payOrderMutation.isPending;
  const hasPaymentMethod = Number(paymentMethod) > 0;
  const canCheckout = canCheckoutAppointment(appointment);
  const alreadyCheckedOut = isAppointmentCheckedOut(appointment);

  useEffect(() => {
    if (!paymentMethod && paymentMethods.length) {
      setPaymentMethod(String(paymentMethods[0].id));
    }
  }, [paymentMethod, paymentMethods]);

  const servicePriceFils = getServicePriceFils(appointment);
  const serviceName = appointment?.service?.name || "Service";

  const subtotalFils = useMemo(() => {
    const productsTotal = cartItems.reduce(
      (sum, item) => sum + item.totalPriceFils,
      0,
    );
    return Math.max(0, servicePriceFils + productsTotal);
  }, [cartItems, servicePriceFils]);

  const totalFils = useMemo(() => {
    const discount = Math.max(0, Number(discountFils || 0));
    const tax = Math.max(0, Number(taxFils || 0));
    return Math.max(0, subtotalFils - discount + tax);
  }, [subtotalFils, discountFils, taxFils]);

  const formatFils = (value: number) => {
    try {
      return new Intl.NumberFormat(i18n.language).format(value);
    } catch {
      return String(value);
    }
  };

  const getOrderTotalKwd = (order?: PosOrder | null) => {
    if (!order) return 0;
    const totalFils = Number(
      (order as any).totalFils ?? (order as any).totalCents ?? 0,
    );
    return Number(
      (order as any).totalKwd ??
        (Number.isFinite(totalFils) ? totalFils / 1000 : 0),
    );
  };

  const addProduct = (product: Product) => {
    if (isLocked || alreadyCheckedOut) return;
    const productId = Number(product.id);
    const key = `product-${productId}`;
    const unitPriceFils = getProductPriceFils(product);

    setCartItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        const nextQty = existing.quantity + 1;
        return prev.map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: nextQty,
                totalPriceFils: nextQty * item.unitPriceFils,
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          key,
          productId,
          name: product.name,
          quantity: 1,
          unitPriceFils,
          totalPriceFils: unitPriceFils,
        },
      ];
    });
  };

  const updateProduct = (
    key: string,
    fields: Partial<Pick<CheckoutProduct, "quantity">>,
  ) => {
    if (isLocked || alreadyCheckedOut) return;
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const quantity = Math.max(1, Number(fields.quantity ?? item.quantity));
        return {
          ...item,
          quantity,
          totalPriceFils: quantity * item.unitPriceFils,
        };
      }),
    );
  };

  const removeProduct = (key: string) => {
    if (isLocked || alreadyCheckedOut) return;
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleCheckout = () => {
    if (!appointmentId || !appointment) return;
    if (!canCheckout) return;
    if (createdOrder) {
      if (createdOrder.status === "paid") return;
      const orderTotal = getOrderTotalKwd(createdOrder);
      if (orderTotal <= 0) return;
      const methodId = Number(paymentMethod);
      if (!methodId) return;
      payOrderMutation.mutate(
        {
          orderId: createdOrder.id,
          payments: [
            {
              amountKwd: orderTotal,
              methodId,
              providerReference: null,
            },
          ],
        },
        {
          onSuccess: (payResponse: any) => {
            const status = payResponse?.data?.data?.status;
            if (status) {
              setCreatedOrder((prev) => (prev ? { ...prev, status } : prev));
            }
          },
        },
      );
      return;
    }

    checkoutMutation.mutate(
      {
        appointmentId,
        products: cartItems.map((item) => ({
          productId: item.productId,
          qty: item.quantity,
        })),
        discountFils: Math.max(0, Number(discountFils || 0)),
        taxFils: Math.max(0, Number(taxFils || 0)),
        notes: notes.trim() || null,
      },
      {
        onSuccess: (response: any) => {
          const order = response?.data?.data?.order as PosOrder | undefined;
          if (order) {
            setCreatedOrder(order);
            const orderTotal = getOrderTotalKwd(order);
            if (orderTotal > 0) {
              const methodId = Number(paymentMethod);
              if (!methodId) return;
              payOrderMutation.mutate(
                {
                  orderId: order.id,
                  payments: [
                    {
                      amountKwd: orderTotal,
                      methodId,
                      providerReference: null,
                    },
                  ],
                },
                {
                  onSuccess: (payResponse: any) => {
                    const status = payResponse?.data?.data?.status;
                    if (status) {
                      setCreatedOrder((prev) =>
                        prev ? { ...prev, status } : prev,
                      );
                    }
                  },
                },
              );
            }
          }
        },
      },
    );
  };

  const dateLocale = i18n.language === "ar" ? ar : enUS;

  if (!appointment) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-background text-foreground">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="text-lg font-semibold">
            {t("appointments.not_loaded") || "Appointment not loaded"}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("appointments.checkout_missing") ||
              "Return to the appointments list and open checkout from there."}
          </p>
          <Button onClick={() => navigate("/appointments")}>
            {t("appointments.back_to_list") || "Back to Appointments"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedComponent permission="pos.orders.create">
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<CreditCard className="w-5 h-5 text-primary" />}
          title={t("appointments.checkout") || "Appointment checkout"}
          subtitle={
            t("appointments.checkout_subtitle") ||
            "Create an order for the appointment service and optional products."
          }
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <Card className="bg-card border-border rounded-xl shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {t("appointments.details") || "Appointment details"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("appointments.details_hint") ||
                        "Review the appointment before checkout."}
                    </p>
                  </div>
                  <AppointmentStatusBadge status={appointment.status} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {t("appointments.customer") || "Customer"}
                    </p>
                    <p className="font-medium">
                      {`${appointment.customer?.firstName ?? ""} ${
                        appointment.customer?.lastName ?? ""
                      }`.trim() || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.customer?.phone || "-"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {t("appointments.service") || "Service"}
                    </p>
                    <p className="font-medium">{serviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("appointments.price_cents") || "Price (fils)"}:{" "}
                      {formatFils(servicePriceFils)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {t("appointments.staff") || "Staff"}
                    </p>
                    <p className="font-medium">
                      {appointment.staff?.displayName ||
                        `${appointment.staff?.user?.firstName ?? ""} ${
                          appointment.staff?.user?.lastName ?? ""
                        }`.trim() ||
                        appointment.staff?.user?.email ||
                        "-"}
                    </p>
                    {appointment.actualStaff?.displayName ? (
                      <p className="text-xs text-muted-foreground">
                        {t("appointments.actual_staff") || "Actual staff"}:{" "}
                        {appointment.actualStaff.displayName}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {t("appointments.room") || "Room"}
                    </p>
                    <p className="font-medium">
                      {appointment.room?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.room?.roomType?.name || "-"}
                    </p>
                    {appointment.actualRoom?.name ? (
                      <p className="text-xs text-muted-foreground">
                        {t("appointments.actual_room") || "Actual room"}:{" "}
                        {appointment.actualRoom.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="md:col-span-2 rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarClock className="w-4 h-4" />
                      {t("appointments.schedule") || "Schedule"}
                    </div>
                    <p className="font-medium">
                      {formatDateTime(appointment.startAt, dateLocale)} -{" "}
                      {formatDateTime(appointment.endAt, dateLocale)}
                    </p>
                  </div>
                  {appointment.rescheduledFromAppointmentId ? (
                    <div className="md:col-span-2 rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t("appointments.rescheduled_from") ||
                          "Rescheduled from"}
                      </p>
                      <p className="font-medium">
                        #{appointment.rescheduledFromAppointmentId}
                      </p>
                    </div>
                  ) : null}
                  {appointment.cancelReason ? (
                    <div className="md:col-span-2 rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t("appointments.cancel_reason") || "Cancel reason"}
                      </p>
                      <p className="font-medium">{appointment.cancelReason}</p>
                    </div>
                  ) : null}
                </div>

                {alreadyCheckedOut ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                    <div className="font-medium">
                      {t("appointments.already_checked_out") ||
                        "This appointment has already been checked out."}
                    </div>
                    <div className="mt-1">
                      {t("appointments.checkout_order") || "Checkout order"}: #
                      {appointment.checkoutOrderId || "-"}
                    </div>
                    <div className="mt-1">
                      {t("appointments.checked_out_at") || "Checked out at"}:{" "}
                      {formatDateTime(appointment.checkedOutAt, dateLocale)}
                    </div>
                  </div>
                ) : null}

                {!canCheckout && !alreadyCheckedOut ? (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600">
                    {t("appointments.not_eligible") ||
                      "This appointment is not eligible for checkout."}
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="bg-card border-border rounded-xl shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {t("appointments.add_products") || "Add products"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("appointments.add_products_hint") ||
                        "Optional products to add to this appointment order."}
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border border-primary/20">
                    {cartItems.length}
                  </Badge>
                </div>

                <Input
                  placeholder={
                    t("appointments.search_products") || "Search products..."
                  }
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  disabled={isLocked || alreadyCheckedOut}
                />

                {productsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClipLoader size={16} color="hsl(var(--primary))" />
                    {t("appointments.loading_products") ||
                      "Loading products..."}
                  </div>
                ) : products.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("appointments.price_cents") || "Price (fils)"}:{" "}
                            {formatFils(getProductPriceFils(product))}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addProduct(product)}
                          disabled={isLocked || alreadyCheckedOut}
                        >
                          {t("appointments.add") || "Add"}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("appointments.no_products") || "No products found."}
                  </p>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-card border-border rounded-xl shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {t("appointments.checkout_summary") || "Checkout summary"}
                  </h2>
                  {createdOrder ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      {t("appointments.order_created") || "Order created"}
                    </Badge>
                  ) : null}
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("appointments.service") || "Service"}
                    </span>
                    <span className="font-medium">
                      {formatFils(servicePriceFils)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("appointments.products_total") || "Products total"}
                    </span>
                    <span className="font-medium">
                      {formatFils(
                        cartItems.reduce(
                          (sum, item) => sum + item.totalPriceFils,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                </div>

                {cartItems.length ? (
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <Badge className="bg-primary/10 text-primary border border-primary/20">
                              {t("appointments.product") || "Product"}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeProduct(item.key)}
                            disabled={isLocked || alreadyCheckedOut}
                          >
                            {t("appointments.remove") || "Remove"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("appointments.quantity") || "Qty"}
                            </p>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateProduct(item.key, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              disabled={isLocked || isProcessing || alreadyCheckedOut}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("appointments.unit_price_cents") ||
                                "Unit price (fils)"}
                            </p>
                            <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/40">
                              {formatFils(item.unitPriceFils)}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("appointments.total_cents") || "Total (fils)"}
                            </p>
                            <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/40">
                              {formatFils(item.totalPriceFils)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("appointments.no_products_added") ||
                      "No products added yet."}
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("appointments.subtotal_cents") || "Subtotal (fils)"}
                    </span>
                    <span className="font-medium">
                      {formatFils(subtotalFils)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("appointments.discount_cents") || "Discount (fils)"}
                      </p>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={discountFils}
                        onChange={(e) =>
                          setDiscountFils(Number(e.target.value))
                        }
                        disabled={isLocked || alreadyCheckedOut}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("appointments.tax_cents") || "Tax (fils)"}
                      </p>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={taxFils}
                        onChange={(e) => setTaxFils(Number(e.target.value))}
                        disabled={isLocked || alreadyCheckedOut}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("appointments.total_cents") || "Total (fils)"}
                    </span>
                    <span className="font-semibold">
                      {formatFils(totalFils)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("appointments.notes") || "Notes"}
                  </p>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder={
                      t("appointments.notes_placeholder") || "Optional notes"
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isLocked || isProcessing || alreadyCheckedOut}
                  />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("pos.payment_method") || "Payment method"}
                  </p>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={
                      isProcessing ||
                      alreadyCheckedOut ||
                      createdOrder?.status === "paid" ||
                      paymentMethodsQuery.isLoading ||
                      !paymentMethods.length
                    }
                  >
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
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleCheckout}
                    disabled={
                      isProcessing ||
                      alreadyCheckedOut ||
                      createdOrder?.status === "paid" ||
                      !canCheckout ||
                      Boolean(createdOrder && !hasPaymentMethod)
                    }
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <ClipLoader
                          size={16}
                          color="hsl(var(--primary-foreground))"
                        />
                        {t("appointments.processing") || "Processing"}
                      </span>
                    ) : createdOrder?.status === "paid" ? (
                      t("pos.paid") || "Paid"
                    ) : createdOrder ? (
                      t("pos.pay_order") || "Pay order"
                    ) : alreadyCheckedOut ? (
                      t("appointments.checked_out") || "Checked out"
                    ) : (
                      t("appointments.checkout_now") || "Checkout"
                    )}
                  </Button>
                  {appointment.checkoutOrderId ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(`/pos/history?orderId=${appointment.checkoutOrderId}`)
                      }
                    >
                      {t("appointments.open_order_history") ||
                        "Open order history"}
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => navigate("/appointments")}
                  >
                    {t("appointments.back_to_list") || "Back to Appointments"}
                  </Button>
                </div>
              </div>
            </Card>

            {createdOrder || existingOrder ? (
              <Card className="bg-card border-border rounded-xl shadow-sm">
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {t("appointments.order_summary") || "Order summary"}
                    </h3>
                    <Badge className="bg-primary/10 text-primary border border-primary/20">
                      #{(createdOrder || existingOrder)?.id}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>
                        {t("appointments.subtotal_cents") || "Subtotal"}
                      </span>
                      <span className="text-foreground">
                        {formatFils(
                          Number(
                            ((createdOrder || existingOrder) as any)?.subtotalFils ??
                              ((createdOrder || existingOrder) as any)?.subtotalCents ??
                              subtotalFils,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>
                        {t("appointments.discount_cents") || "Discount"}
                      </span>
                      <span className="text-foreground">
                        {formatFils(
                          Number(
                            ((createdOrder || existingOrder) as any)?.discountFils ??
                              ((createdOrder || existingOrder) as any)?.discountCents ??
                              0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("appointments.tax_cents") || "Tax"}</span>
                      <span className="text-foreground">
                        {formatFils(
                          Number(
                            ((createdOrder || existingOrder) as any)?.taxFils ??
                              ((createdOrder || existingOrder) as any)?.taxCents ??
                              0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{t("appointments.total_cents") || "Total"}</span>
                      <span>
                        {formatFils(
                          Number(
                            ((createdOrder || existingOrder) as any)?.totalFils ??
                              ((createdOrder || existingOrder) as any)?.totalCents ??
                              totalFils,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </ProtectedComponent>
  );
};

export default AppointmentCheckoutPage;
