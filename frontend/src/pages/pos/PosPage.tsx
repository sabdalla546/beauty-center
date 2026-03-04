/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipLoader } from "react-spinners";
import { Gift, Search, ShoppingCart, UserPlus, Wallet, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import { resolvePublicImageUrl } from "@/utils/publicFiles";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useProducts } from "@/hooks/products/useProducts";
import { useServices } from "@/hooks/services/useServices";
import { usePackagePlans } from "@/hooks/packages/usePackagePlans";
import { useCustomers } from "@/hooks/customers/useCustomers";
import { usePaymentMethods } from "@/hooks/paymentMethods/usePaymentMethods";
import {
  useCancelPosOrder,
  useCreatePosOrder,
  usePayPosOrder,
  useRefundPosOrder,
} from "@/hooks/pos/usePosMutations";
import { usePosOrder } from "@/hooks/pos/usePosOrders";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import type { Product } from "@/pages/products/types";
import type { Service } from "@/pages/services/types";
import type { PackagePlan } from "@/pages/packages/types";
import type { Customer } from "@/pages/customers/types";
import type { PosLineType, PosOrder, PosPayResponse } from "@/pages/pos/types";

type CartItem = {
  key: string;
  lineType: PosLineType;
  referenceId: number;
  name: string;
  quantity: number;
  unitPriceKwd: number;
  totalPriceKwd: number;
};

type CatalogType = "products" | "services" | "packages";
type CatalogItem = Product | Service | PackagePlan;

const normalizeInt = (value: number, min = 0) => {
  const safe = Number.isFinite(value) ? Math.floor(value) : min;
  return Math.max(min, safe);
};

const roundKwd = (value: number, min = 0) => {
  const safe = Number.isFinite(value) ? value : min;
  const rounded = Math.round(safe * 1000) / 1000;
  return Math.max(min, rounded);
};

const toKwdFromFils = (value?: number | null) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric / 1000;
};

const getItemPriceKwd = (item: CatalogItem) => {
  const directKwd = (item as any).priceKwd;
  if (directKwd !== undefined && directKwd !== null) return Number(directKwd);

  const directFils = (item as any).priceFils ?? (item as any).priceCents;
  if (directFils !== undefined && directFils !== null)
    return toKwdFromFils(directFils);

  return 0;
};

const buildKey = (lineType: PosLineType, referenceId: number) =>
  `${lineType}-${referenceId}`;

const PosPage: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const dir = i18n.dir();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeCatalog, setActiveCatalog] = useState<CatalogType>("products");
  const [productSearch, setProductSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountKwd, setDiscountKwd] = useState(0);
  const [taxKwd, setTaxKwd] = useState(0);
  const [externalRef, setExternalRef] = useState("");
  const [createdOrder, setCreatedOrder] = useState<PosOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [lastInvoice80Html, setLastInvoice80Html] = useState("");
  const [isPrintingInvoice, setIsPrintingInvoice] = useState(false);

  const isProductsCatalog = activeCatalog === "products";
  const isServicesCatalog = activeCatalog === "services";
  const isPackagesCatalog = activeCatalog === "packages";

  const productsQuery = useProducts({
    currentPage: 1,
    itemsPerPage: 12,
    searchQuery: productSearch,
  });

  const servicesQuery = useServices({ searchQuery: serviceSearch });
  const packagePlansQuery = usePackagePlans({
    searchQuery: packageSearch,
    isActive: true,
  });

  const customersQuery = useCustomers({
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: customerSearch,
  });

  const paymentMethodsQuery = usePaymentMethods({ activeOnly: true });

  const createOrderMutation = useCreatePosOrder();
  const payOrderMutation = usePayPosOrder();
  const cancelOrderMutation = useCancelPosOrder();
  const refundOrderMutation = useRefundPosOrder();
  const createCustomerMutation = useMutation({
    mutationFn: async (payload: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
    }) => {
      const res = await api.post("/customers", payload);
      return res.data?.customer as Customer | undefined;
    },
    onSuccess: (customer) => {
      if (customer) {
        setSelectedCustomer(customer);
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setAddCustomerOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewPhone("");
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create customer.",
      });
    },
  });

  const products = productsQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const packagePlans = packagePlansQuery.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];
  const paymentMethods = paymentMethodsQuery.data ?? [];
  const customerOptions = useMemo(() => {
    if (!selectedCustomer) return customers;
    const exists = customers.some(
      (customer) => String(customer.id) === String(selectedCustomer.id),
    );
    return exists ? customers : [selectedCustomer, ...customers];
  }, [customers, selectedCustomer]);

  const catalogItems: CatalogItem[] = isProductsCatalog
    ? products
    : isPackagesCatalog
      ? packagePlans
      : services;
  const catalogSearch = isProductsCatalog
    ? productSearch
    : isPackagesCatalog
      ? packageSearch
      : serviceSearch;
  const setCatalogSearch = isProductsCatalog
    ? setProductSearch
    : isPackagesCatalog
      ? setPackageSearch
      : setServiceSearch;
  const catalogLoading = isProductsCatalog
    ? productsQuery.isLoading
    : isPackagesCatalog
      ? packagePlansQuery.isLoading
      : servicesQuery.isLoading;
  const catalogPlaceholder = isProductsCatalog
    ? t("pos.search_products") || "Search products..."
    : isPackagesCatalog
      ? t("pos.search_packages") || "Search package plans..."
      : t("pos.search_services") || "Search services...";

  const createdOrderQuery = usePosOrder(createdOrder?.id);

  useEffect(() => {
    if (!paymentMethod && paymentMethods.length) {
      setPaymentMethod(String(paymentMethods[0].id));
    }
  }, [paymentMethod, paymentMethods]);

  useEffect(() => {
    const latestOrder = createdOrderQuery.data?.data;
    if (!latestOrder || !createdOrder) return;
    if (Number(latestOrder.id) !== Number(createdOrder.id)) return;
    setCreatedOrder(latestOrder);
  }, [createdOrderQuery.data, createdOrder]);

  useEffect(() => {
    setLastInvoice80Html("");
  }, [createdOrder?.id]);

  const isOrderLocked = !!createdOrder;

  const subtotalKwd = useMemo(
    () =>
      roundKwd(
        cartItems.reduce((sum, item) => sum + item.totalPriceKwd, 0),
        0,
      ),
    [cartItems],
  );

  const totalKwd = useMemo(() => {
    const discount = roundKwd(discountKwd, 0);
    const tax = roundKwd(taxKwd, 0);
    return roundKwd(Math.max(0, subtotalKwd - discount + tax), 0);
  }, [subtotalKwd, discountKwd, taxKwd]);

  const remainingKwd = useMemo(() => {
    if (!createdOrder) return totalKwd;
    const remainingFromOrder =
      createdOrder.remainingKwd ??
      (createdOrder.remainingFils != null
        ? toKwdFromFils(createdOrder.remainingFils)
        : undefined);
    if (remainingFromOrder !== undefined)
      return roundKwd(remainingFromOrder, 0);

    const netPaidFils = createdOrder.netPaidFils ?? 0;
    const totalFils = createdOrder.totalFils ?? 0;
    if (totalFils || netPaidFils) {
      return roundKwd(toKwdFromFils(Math.max(0, totalFils - netPaidFils)), 0);
    }

    return roundKwd(createdOrder.totalKwd ?? totalKwd, 0);
  }, [createdOrder, totalKwd]);

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

  const getPaymentMethodLabel = (methodId?: number | null) => {
    const numericId = Number(methodId);
    if (!numericId) return `#${methodId ?? "-"}`;
    const method = paymentMethods.find(
      (entry) => Number(entry.id) === numericId,
    );
    if (!method) return `#${numericId}`;
    return i18n.language === "ar" ? method.nameAr : method.nameEn;
  };

  const completedPayments = (createdOrder?.payments ?? []).filter(
    (payment) => !payment.status || payment.status === "completed",
  );

  const printInvoice80Html = (html: string, existingWindow?: Window | null) => {
    const safeHtml = String(html || "").trim();
    if (!safeHtml) return false;

    const printWindow =
      existingWindow && !existingWindow.closed
        ? existingWindow
        : window.open("", "_blank", "width=420,height=900");

    if (!printWindow) return false;

    printWindow.document.open();
    printWindow.document.write(safeHtml);
    printWindow.document.close();

    const runPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // ignore window print errors
      }
    };

    if (printWindow.document.readyState === "complete") {
      setTimeout(runPrint, 120);
    } else {
      printWindow.onload = () => setTimeout(runPrint, 120);
    }

    return true;
  };

  const fetchInvoice80Html = async (orderId: number) => {
    const response = await api.get(`/pos/orders/${orderId}/invoice-80`, {
      params: { raw: 1 },
      responseType: "text",
    });
    const html = typeof response.data === "string" ? response.data : "";
    if (html.trim()) {
      setLastInvoice80Html(html);
    }
    return html;
  };

  const handlePrintInvoice = async () => {
    if (!createdOrder?.id) return;

    const popup = window.open("", "_blank", "width=420,height=900");
    setIsPrintingInvoice(true);
    try {
      let html = lastInvoice80Html;
      if (!html.trim()) {
        html = await fetchInvoice80Html(createdOrder.id);
      }
      if (!html.trim()) {
        if (popup && !popup.closed) popup.close();
        toast({
          variant: "destructive",
          title: t("error") || "Error",
          description:
            t("pos.invoice_unavailable") || "Invoice is not available.",
        });
        return;
      }

      const printed = printInvoice80Html(html, popup);
      if (!printed) {
        toast({
          variant: "destructive",
          title: t("error") || "Error",
          description:
            t("pos.invoice_print_failed") || "Unable to open print window.",
        });
      }
    } catch (error: any) {
      if (popup && !popup.closed) popup.close();
      toast({
        variant: "destructive",
        title: t("error") || "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          t("pos.invoice_unavailable") ||
          "Invoice is not available.",
      });
    } finally {
      setIsPrintingInvoice(false);
    }
  };

  const addItem = (lineType: PosLineType, item: CatalogItem) => {
    if (isOrderLocked) return;
    const referenceId = Number(item.id);
    const key = buildKey(lineType, referenceId);
    const unitPriceKwd = roundKwd(getItemPriceKwd(item), 0);

    setCartItems((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        const nextQty = normalizeInt(existing.quantity + 1, 1);
        return prev.map((p) =>
          p.key === key
            ? {
                ...p,
                quantity: nextQty,
                totalPriceKwd: roundKwd(nextQty * p.unitPriceKwd, 0),
              }
            : p,
        );
      }
      return [
        ...prev,
        {
          key,
          lineType,
          referenceId,
          name: item.name,
          quantity: 1,
          unitPriceKwd,
          totalPriceKwd: unitPriceKwd,
        },
      ];
    });
  };

  const updateItem = (
    key: string,
    fields: Partial<Pick<CartItem, "quantity" | "unitPriceKwd">>,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const quantity = fields.quantity ?? item.quantity;
        const unitPriceKwd = fields.unitPriceKwd ?? item.unitPriceKwd;
        const safeQty = normalizeInt(quantity, 1);
        const safePrice = roundKwd(unitPriceKwd, 0);
        return {
          ...item,
          quantity: safeQty,
          unitPriceKwd: safePrice,
          totalPriceKwd: roundKwd(safeQty * safePrice, 0),
        };
      }),
    );
  };

  const removeItem = (key: string) => {
    if (isOrderLocked) return;
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleCreateCustomer = () => {
    if (createCustomerMutation.isPending) return;
    const firstName = newFirstName.trim();
    const lastName = newLastName.trim();
    const phone = newPhone.trim();

    if (!firstName && !lastName && !phone) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Enter at least one field to create a customer.",
      });
      return;
    }

    createCustomerMutation.mutate({
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
    });
  };

  const resetOrder = () => {
    setCartItems([]);
    setDiscountKwd(0);
    setTaxKwd(0);
    setExternalRef("");
    setCreatedOrder(null);
    setPaymentAmount(0);
    setPaymentReference("");
    setLastInvoice80Html("");
  };

  const handleCreateOrder = () => {
    if (!cartItems.length || isOrderLocked) return;
    const hasPackageItems = cartItems.some(
      (item) => item.lineType === "package",
    );
    if (hasPackageItems && !selectedCustomer?.id) {
      toast({
        variant: "destructive",
        title: t("error") || "Error",
        description:
          t("pos.package_requires_customer") ||
          "Package sale requires selecting a customer.",
      });
      return;
    }

    createOrderMutation.mutate(
      {
        externalRef: externalRef.trim() || null,
        customerId: selectedCustomer?.id ?? null,
        items: cartItems.map((item) => ({
          lineType: item.lineType,
          referenceId: item.referenceId,
          description: item.name,
          quantity: item.quantity,
          unitPriceKwd: item.unitPriceKwd,
          totalPriceKwd: item.totalPriceKwd,
        })),
        discountKwd: roundKwd(discountKwd, 0),
        taxKwd: roundKwd(taxKwd, 0),
      },
      {
        onSuccess: (response: any) => {
          const order = response?.data?.data as PosOrder | undefined;
          if (order) {
            const subtotalFilsRaw =
              (order as any).subtotalFils ?? (order as any).subtotalCents ?? 0;
            const discountFilsRaw =
              (order as any).discountFils ?? (order as any).discountCents ?? 0;
            const taxFilsRaw =
              (order as any).taxFils ?? (order as any).taxCents ?? 0;
            const totalFilsRaw =
              (order as any).totalFils ?? (order as any).totalCents ?? 0;

            const subtotalFils = Number(subtotalFilsRaw);
            const discountFils = Number(discountFilsRaw);
            const taxFils = Number(taxFilsRaw);
            const totalFils = Number(totalFilsRaw);

            const subtotalKwd = Number(
              (order as any).subtotalKwd ??
                (Number.isFinite(subtotalFils) ? subtotalFils / 1000 : 0),
            );
            const discountKwd = Number(
              (order as any).discountKwd ??
                (Number.isFinite(discountFils) ? discountFils / 1000 : 0),
            );
            const taxKwd = Number(
              (order as any).taxKwd ??
                (Number.isFinite(taxFils) ? taxFils / 1000 : 0),
            );
            const totalKwd = Number(
              (order as any).totalKwd ??
                (Number.isFinite(totalFils) ? totalFils / 1000 : 0),
            );

            setCreatedOrder({
              ...order,
              subtotalKwd,
              discountKwd,
              taxKwd,
              totalKwd,
              subtotalFils: Number.isFinite(subtotalFils)
                ? subtotalFils
                : undefined,
              discountFils: Number.isFinite(discountFils)
                ? discountFils
                : undefined,
              taxFils: Number.isFinite(taxFils) ? taxFils : undefined,
              totalFils: Number.isFinite(totalFils) ? totalFils : undefined,
              paidFils: 0,
              refundedFils: 0,
              netPaidFils: 0,
              remainingFils: Number.isFinite(totalFils) ? totalFils : undefined,
              paidKwd: 0,
              refundedKwd: 0,
              netPaidKwd: 0,
              remainingKwd: Number.isFinite(totalFils)
                ? totalFils / 1000
                : totalKwd,
            });
            setPaymentAmount(
              Number.isFinite(totalFils) ? totalFils / 1000 : totalKwd,
            );
          }
        },
      },
    );
  };

  const handlePayOrder = () => {
    if (!createdOrder) return;
    const methodId = Number(paymentMethod);
    if (!methodId) return;
    const amountKwd = roundKwd(paymentAmount, 0);
    const popup = window.open("", "_blank", "width=420,height=900");
    setIsPrintingInvoice(true);

    payOrderMutation.mutate(
      {
        orderId: createdOrder.id,
        payments: [
          {
            amountKwd,
            methodId,
            providerReference: paymentReference.trim() || null,
          },
        ],
      },
      {
        onSuccess: (response: any) => {
          const result = response?.data?.data as
            | PosPayResponse["data"]
            | undefined;
          if (!result) {
            if (popup && !popup.closed) popup.close();
            return;
          }

          setCreatedOrder((prev) => {
            if (!prev) return prev;
            const paidFils = Number(result.paidFils ?? prev.paidFils ?? 0);
            const remainingFils = Number(
              result.remainingFils ?? prev.remainingFils ?? 0,
            );
            return {
              ...prev,
              status: result.status ?? prev.status,
              paidFils: Number.isFinite(paidFils) ? paidFils : prev.paidFils,
              remainingFils: Number.isFinite(remainingFils)
                ? remainingFils
                : prev.remainingFils,
              netPaidFils: Number.isFinite(paidFils)
                ? paidFils
                : prev.netPaidFils,
              paidKwd: Number.isFinite(paidFils)
                ? paidFils / 1000
                : prev.paidKwd,
              remainingKwd: Number.isFinite(remainingFils)
                ? remainingFils / 1000
                : prev.remainingKwd,
              netPaidKwd: Number.isFinite(paidFils)
                ? paidFils / 1000
                : prev.netPaidKwd,
            };
          });

          const invoice80Html =
            typeof result.invoice80Html === "string"
              ? result.invoice80Html
              : "";
          if (invoice80Html.trim()) {
            setLastInvoice80Html(invoice80Html);
            const printed = printInvoice80Html(invoice80Html, popup);
            if (!printed) {
              toast({
                variant: "destructive",
                title: t("error") || "Error",
                description:
                  t("pos.invoice_print_failed") ||
                  "Unable to open print window.",
              });
            }
          } else {
            if (popup && !popup.closed) popup.close();
            toast({
              variant: "destructive",
              title: t("error") || "Error",
              description:
                t("pos.invoice_unavailable") || "Invoice is not available.",
            });
          }

          const nextRemaining = Number(result.remainingFils ?? 0);
          if (Number.isFinite(nextRemaining)) {
            setPaymentAmount(Math.max(0, nextRemaining / 1000));
          }

          if (createdOrder?.id) {
            queryClient.invalidateQueries({
              queryKey: ["pos-order", createdOrder.id],
            });
          }
        },
        onError: () => {
          if (popup && !popup.closed) popup.close();
        },
        onSettled: () => {
          setIsPrintingInvoice(false);
        },
      },
    );
  };

  const handleCancelOrder = () => {
    if (!createdOrder) return;
    if (!window.confirm(t("pos.cancel_confirm") || "Cancel this order?"))
      return;
    cancelOrderMutation.mutate(
      { orderId: createdOrder.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["pos-order", createdOrder.id],
          });
          queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
        },
      },
    );
  };

  const handleRefundOrder = () => {
    if (!createdOrder) return;
    if (!window.confirm(t("pos.refund_confirm") || "Refund this order?"))
      return;
    refundOrderMutation.mutate(
      { orderId: createdOrder.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["pos-order", createdOrder.id],
          });
          queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
        },
      },
    );
  };

  const payableStatuses = new Set(["open", "partially_paid"]);
  const paymentTooHigh = roundKwd(paymentAmount, 0) > roundKwd(remainingKwd, 0);
  const paymentTooLow = roundKwd(paymentAmount, 0) <= 0;
  const cancelableStatuses = new Set(["open", "partially_paid"]);
  const refundableStatuses = new Set(["paid"]);
  const isOrderBusy =
    createOrderMutation.isPending ||
    payOrderMutation.isPending ||
    cancelOrderMutation.isPending ||
    refundOrderMutation.isPending;
  const canPay =
    !!createdOrder &&
    payableStatuses.has(createdOrder.status) &&
    remainingKwd > 0 &&
    !paymentTooHigh &&
    !paymentTooLow &&
    Number(paymentMethod) > 0;
  const catalogTitle = isProductsCatalog
    ? t("pos.products") || "Products"
    : isPackagesCatalog
      ? t("pos.packages") || "Packages"
      : t("pos.services") || "Services";

  return (
    <ProtectedComponent anyOf={["pos.orders.create", "pos.orders.pay"]}>
      <div
        className="flex h-[calc(100dvh-3.5rem-1.5rem)] min-h-0 flex-col overflow-hidden px-2 py-0 text-foreground sm:h-[calc(100dvh-3.5rem-2rem)] sm:px-3 sm:py-0"
        dir={dir}
      >
        {/* POS summary header (temporarily hidden)
        <div className="shrink-0 rounded-3xl border border-primary/20 bg-[linear-gradient(120deg,hsl(var(--background)/0.96),hsl(var(--background)/0.86)_55%,hsl(var(--primary)/0.08))] p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-primary/80">
                {t("sidebar.pos") || "POS"}
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("sidebar.pos") || "Point of Sale"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("pos.subtitle") ||
                  "Fast checkout flow with live cart and payment controls."}
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("pos.cart") || "Cart"}
                </p>
                <p className="text-base font-semibold">
                  {cartQuantity} {t("pos.quantity") || "Qty"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("pos.total_kwd") || "Total (KWD)"}
                </p>
                <p className="text-base font-semibold">{formatKwd(totalKwd)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("pos.remaining_kwd") || "Remaining (KWD)"}
                </p>
                <p className="text-base font-semibold text-primary">
                  {formatKwd(remainingKwd)}
                </p>
              </div>
            </div>
          </div>
        </div>
        */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="order-2 min-h-0 xl:order-1">
            <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border-primary/25 bg-card/90 shadow-sm backdrop-blur">
              <div className="border-b border-border/80 bg-muted/20 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{catalogTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("pos.add") || "Add"} {catalogTitle.toLowerCase()}{" "}
                      {t("pos.cart") || "cart"}
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-border bg-background/80 p-1">
                    <Button
                      size="sm"
                      variant={isProductsCatalog ? "default" : "ghost"}
                      className="rounded-full px-4"
                      onClick={() => setActiveCatalog("products")}
                      disabled={isOrderLocked}
                    >
                      {t("pos.products") || "Products"}
                    </Button>
                    <Button
                      size="sm"
                      variant={isServicesCatalog ? "default" : "ghost"}
                      className="rounded-full px-4"
                      onClick={() => setActiveCatalog("services")}
                      disabled={isOrderLocked}
                    >
                      {t("pos.services") || "Services"}
                    </Button>
                    <Button
                      size="sm"
                      variant={isPackagesCatalog ? "default" : "ghost"}
                      className="rounded-full px-4"
                      onClick={() => setActiveCatalog("packages")}
                      disabled={isOrderLocked}
                    >
                      {t("pos.packages") || "Packages"}
                    </Button>
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:w-72 lg:flex-none">
                      <Search
                        className={[
                          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80",
                          dir === "rtl" ? "right-3" : "left-3",
                        ].join(" ")}
                      />
                      <Input
                        className={[
                          "h-10 border-border/80 bg-background/85",
                          dir === "rtl" ? "pr-9" : "pl-9",
                        ].join(" ")}
                        placeholder={catalogPlaceholder}
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        disabled={isOrderLocked}
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/70 bg-background/80 p-2">
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-emerald-500 text-white hover:bg-emerald-600"
                        onClick={() => setAddCustomerOpen(true)}
                        disabled={isOrderLocked}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>

                      <div className="min-w-[180px] flex-1">
                        <SearchableSelect
                          value={
                            selectedCustomer ? String(selectedCustomer.id) : ""
                          }
                          onValueChange={(value) => {
                            if (!value) {
                              setSelectedCustomer(null);
                              return;
                            }
                            const match = customerOptions.find(
                              (customer) =>
                                String(customer.id) === String(value),
                            );
                            if (match) setSelectedCustomer(match);
                          }}
                          placeholder={
                            t("pos.select_customer") || "Select customer"
                          }
                          searchPlaceholder={
                            t("pos.search_customers") || "Search customers..."
                          }
                          onSearch={setCustomerSearch}
                          isLoading={customersQuery.isLoading}
                          emptyMessage={
                            t("pos.no_customers") || "No customers found."
                          }
                          allowClear={!!selectedCustomer}
                          onClear={() => setSelectedCustomer(null)}
                          dir={dir}
                        >
                          {customerOptions.length ? (
                            customerOptions.map((customer) => (
                              <SearchableSelectItem
                                key={customer.id}
                                value={String(customer.id)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {customer.firstName || ""}{" "}
                                    {customer.lastName || ""}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {customer.phone || "-"}
                                  </span>
                                </div>
                              </SearchableSelectItem>
                            ))
                          ) : (
                            <SearchableSelectEmpty
                              message={
                                customersQuery.isLoading
                                  ? t("pos.loading_customers") ||
                                    "Loading customers..."
                                  : t("pos.no_customers") ||
                                    "No customers found."
                              }
                            />
                          )}
                        </SearchableSelect>
                      </div>

                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => setSelectedCustomer(null)}
                        disabled={isOrderLocked || !selectedCustomer}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Dialog
                      open={addCustomerOpen}
                      onOpenChange={(open) => {
                        setAddCustomerOpen(open);
                        if (!open) {
                          setNewFirstName("");
                          setNewLastName("");
                          setNewPhone("");
                        }
                      }}
                    >
                      <DialogContent className="sm:max-w-md border-primary/30 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))] shadow-xl">
                        <DialogHeader>
                          <DialogTitle className="text-foreground">
                            {t("pos.add_customer") || "Add customer"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("customers.first_name") || "First name"}
                            </p>
                            <Input
                              className="bg-background/80 border-primary/20 focus-visible:ring-primary/30"
                              value={newFirstName}
                              onChange={(e) => setNewFirstName(e.target.value)}
                              disabled={createCustomerMutation.isPending}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("customers.last_name") || "Last name"}
                            </p>
                            <Input
                              className="bg-background/80 border-primary/20 focus-visible:ring-primary/30"
                              value={newLastName}
                              onChange={(e) => setNewLastName(e.target.value)}
                              disabled={createCustomerMutation.isPending}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("customers.phone") || "Phone"}
                            </p>
                            <Input
                              className="bg-background/80 border-primary/20 focus-visible:ring-primary/30"
                              value={newPhone}
                              onChange={(e) => setNewPhone(e.target.value)}
                              disabled={createCustomerMutation.isPending}
                            />
                          </div>
                        </div>
                        <DialogFooter className="gap-2">
                          <Button
                            variant="outline"
                            className="border-primary/30 hover:bg-primary/10"
                            onClick={() => setAddCustomerOpen(false)}
                            disabled={createCustomerMutation.isPending}
                          >
                            {t("cancel") || "Cancel"}
                          </Button>
                          <Button
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={handleCreateCustomer}
                            disabled={createCustomerMutation.isPending}
                          >
                            {createCustomerMutation.isPending ? (
                              <span className="flex items-center gap-2">
                                <ClipLoader
                                  size={16}
                                  color="hsl(var(--primary-foreground))"
                                />
                                {t("pos.processing") || "Processing"}
                              </span>
                            ) : (
                              t("pos.create_customer") || "Create customer"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-3 sm:p-4">
                {isPackagesCatalog && !selectedCustomer ? (
                  <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    {t("pos.package_requires_customer") ||
                      "Package sale requires selecting a customer."}
                  </p>
                ) : null}
                {catalogLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    <ClipLoader size={16} color="hsl(var(--primary))" />
                    {isProductsCatalog
                      ? t("pos.loading_products") || "Loading products..."
                      : isPackagesCatalog
                        ? t("pos.loading_packages") ||
                          "Loading package plans..."
                        : t("pos.loading_services") || "Loading services..."}
                  </div>
                ) : catalogItems.length ? (
                  <div className="custom-scrollbar h-full min-h-0 overflow-y-auto pe-1">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {catalogItems.map((item) => {
                        const imageSrc = isPackagesCatalog
                          ? null
                          : resolvePublicImageUrl({
                              imageUrl:
                                (item as Product | Service).imageUrl ?? null,
                              imagePath:
                                (item as Product | Service).imagePath ?? null,
                              filename:
                                (item as Product | Service).image ?? null,
                              folder: isProductsCatalog
                                ? "products"
                                : "services",
                            });
                        const price = formatKwd(
                          roundKwd(getItemPriceKwd(item), 0),
                        );
                        const stock = isProductsCatalog
                          ? ((item as Product).currentQty ?? 0)
                          : null;
                        return (
                          <div
                            key={`${activeCatalog}-${item.id}`}
                            className="group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background/75 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                          >
                            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/30 flex items-center justify-center">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={item.name}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                                  {isPackagesCatalog ? (
                                    <Gift className="h-5 w-5 text-primary" />
                                  ) : null}
                                  <span>{t("no_image") || "No image"}</span>
                                </div>
                              )}
                              <Badge className="absolute top-1.5 right-1.5 border-primary/20 bg-background/90 px-1.5 py-0 text-[10px] text-foreground shadow-sm">
                                {price}
                              </Badge>
                            </div>
                            <div className="space-y-1 p-2.5">
                              <p className="truncate text-xs font-semibold">
                                {item.name}
                              </p>
                              {isProductsCatalog ? (
                                <p className="text-xs text-muted-foreground">
                                  {t("pos.stock") || "Stock"}: {stock}
                                </p>
                              ) : isPackagesCatalog ? (
                                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                                  {t("pos.package_sessions") || "Sessions"}:{" "}
                                  {(item as PackagePlan).sessionsCount ?? 0} |{" "}
                                  {t("pos.package_valid_days") || "Valid days"}:{" "}
                                  {(item as PackagePlan).validDays ?? 0}
                                </p>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">
                                  {t("pos.price_kwd") || "Price (KWD)"}: {price}
                                </p>
                              )}
                            </div>
                            <div className="px-2.5 pb-2.5 pt-0">
                              <Button
                                size="sm"
                                className="h-7 w-full rounded-lg text-xs"
                                onClick={() =>
                                  addItem(
                                    isProductsCatalog
                                      ? "product"
                                      : isPackagesCatalog
                                        ? "package"
                                        : "service",
                                    item,
                                  )
                                }
                                disabled={
                                  isOrderLocked ||
                                  (isPackagesCatalog && !selectedCustomer)
                                }
                              >
                                {t("pos.add") || "Add"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border bg-muted/15 p-8 text-center text-sm text-muted-foreground">
                    {isProductsCatalog
                      ? t("pos.no_products") || "No products found."
                      : isPackagesCatalog
                        ? t("pos.no_packages") || "No package plans found."
                        : t("pos.no_services") || "No services found."}
                  </p>
                )}
              </div>
            </Card>
          </div>
          <div className="order-1 min-h-0 xl:order-2 flex flex-col gap-3">
            <Card className="min-h-0 flex-1 rounded-3xl border-primary/20 bg-card/95 shadow-sm">
              <div className="custom-scrollbar h-full min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-semibold">
                      {t("pos.cart") || "Cart"}
                    </h2>
                  </div>
                  {createdOrder ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      {t("pos.order_created") || "Order created"}
                    </Badge>
                  ) : null}
                </div>

                {cartItems.length ? (
                  <div className="custom-scrollbar max-h-[42vh] space-y-3 overflow-y-auto pe-1">
                    {cartItems.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-2xl border border-border/70 bg-muted/20 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <Badge className="bg-primary/10 text-primary border border-primary/20">
                              {item.lineType === "product"
                                ? t("pos.type_product") || "Product"
                                : item.lineType === "service"
                                  ? t("pos.type_service") || "Service"
                                  : t("pos.type_package") || "Package"}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeItem(item.key)}
                            disabled={isOrderLocked}
                          >
                            {t("pos.remove") || "Remove"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("pos.quantity") || "Qty"}
                            </p>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.key, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              disabled={isOrderLocked}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("pos.unit_price_kwd") || "Unit price (KWD)"}
                            </p>
                            <Input
                              type="number"
                              min={0}
                              step={0.001}
                              value={item.unitPriceKwd}
                              onChange={(e) =>
                                updateItem(item.key, {
                                  unitPriceKwd: Number(e.target.value),
                                })
                              }
                              disabled={
                                isOrderLocked || item.lineType === "package"
                              }
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("pos.total_kwd") || "Total (KWD)"}
                            </p>
                            <div className="h-9 flex items-center px-3 rounded-md border border-border bg-background/80">
                              {formatKwd(item.totalPriceKwd)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                    {t("pos.empty_cart") || "Cart is empty."}
                  </p>
                )}

                <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("pos.subtotal_kwd") || "Subtotal (KWD)"}
                    </span>
                    <span className="font-medium">
                      {formatKwd(subtotalKwd)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("pos.discount_kwd") || "Discount (KWD)"}
                      </p>
                      <Input
                        type="number"
                        min={0}
                        step={0.001}
                        value={discountKwd}
                        onChange={(e) => setDiscountKwd(Number(e.target.value))}
                        disabled={isOrderLocked}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("pos.tax_kwd") || "Tax (KWD)"}
                      </p>
                      <Input
                        type="number"
                        min={0}
                        step={0.001}
                        value={taxKwd}
                        onChange={(e) => setTaxKwd(Number(e.target.value))}
                        disabled={isOrderLocked}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">
                      {t("pos.total_kwd") || "Total (KWD)"}
                    </span>
                    <span className="text-base font-semibold text-primary">
                      {formatKwd(totalKwd)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("pos.external_ref") || "External reference"}
                  </p>
                  <Input
                    placeholder={t("pos.external_ref_hint") || "Optional"}
                    value={externalRef}
                    onChange={(e) => setExternalRef(e.target.value)}
                    disabled={isOrderLocked}
                  />
                </div>

                <ProtectedComponent permission="pos.orders.create">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="flex-1 min-w-[170px]"
                      onClick={handleCreateOrder}
                      disabled={
                        !cartItems.length ||
                        isOrderLocked ||
                        createOrderMutation.isPending
                      }
                    >
                      {createOrderMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <ClipLoader
                            size={16}
                            color="hsl(var(--primary-foreground))"
                          />
                          {t("pos.processing") || "Processing"}
                        </span>
                      ) : (
                        t("pos.create_order") || "Create order"
                      )}
                    </Button>
                    {createdOrder ? (
                      <Button variant="outline" onClick={resetOrder}>
                        {t("pos.new_order") || "New order"}
                      </Button>
                    ) : null}
                  </div>
                </ProtectedComponent>
                {createdOrder ? (
                  <ProtectedComponent permission="pos.orders.pay">
                    <div className="pt-4 mt-2 border-t border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <h2 className="text-lg font-semibold">
                            {t("pos.payment") || "Payment"}
                          </h2>
                        </div>
                        <Badge className="bg-primary/10 text-primary border border-primary/20">
                          {t("pos.order_id") || "Order"} #{createdOrder.id}
                        </Badge>
                      </div>

                      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
                        <p className="text-muted-foreground">
                          {t("pos.order_status") || "Order status"}:{" "}
                          <span className="text-foreground font-semibold">
                            {createdOrder.status}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          {t("pos.remaining_kwd") || "Remaining (KWD)"}:{" "}
                          <span className="text-foreground font-medium">
                            {formatKwd(remainingKwd)}
                          </span>
                        </p>
                      </div>

                      {completedPayments.length ? (
                        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                          <p className="text-xs font-semibold text-foreground">
                            {t("pos.payments") || "Payments"}
                          </p>
                          {completedPayments.map((payment, index) => (
                            <div
                              key={payment.id ?? `${payment.methodId}-${index}`}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-muted-foreground">
                                {getPaymentMethodLabel(payment.methodId)}
                              </span>
                              <span className="font-medium">
                                {formatKwd(Number(payment.amountKwd ?? 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("pos.payment_method") || "Payment method"}
                        </p>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          disabled={
                            isOrderBusy ||
                            paymentMethodsQuery.isLoading ||
                            !paymentMethods.length
                          }
                        >
                          {paymentMethods.map((method) => (
                            <option key={method.id} value={String(method.id)}>
                              {i18n.language === "ar"
                                ? method.nameAr
                                : method.nameEn}
                            </option>
                          ))}
                        </select>
                        {!paymentMethodsQuery.isLoading &&
                        !paymentMethods.length ? (
                          <p className="text-xs text-amber-600 mt-1">
                            {t("pos.no_payment_methods") ||
                              "No active payment methods configured."}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("pos.payment_amount_kwd") || "Amount (KWD)"}
                        </p>
                        <Input
                          type="number"
                          min={0}
                          step={0.001}
                          value={paymentAmount}
                          onChange={(e) =>
                            setPaymentAmount(Number(e.target.value))
                          }
                          disabled={isOrderBusy}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("pos.remaining_kwd") || "Remaining (KWD)"}:{" "}
                          <span className="text-foreground font-medium">
                            {formatKwd(remainingKwd)}
                          </span>
                        </p>
                        {paymentTooHigh ? (
                          <p className="text-xs text-red-500 mt-1">
                            {t("pos.payment_mismatch") ||
                              "Payment must be less than or equal to remaining."}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("pos.provider_reference") || "Provider reference"}
                        </p>
                        <Input
                          placeholder={
                            t("pos.provider_reference_hint") || "Optional"
                          }
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          disabled={isOrderBusy}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="flex-1 min-w-[150px]"
                          onClick={handlePayOrder}
                          disabled={!canPay || isOrderBusy}
                        >
                          {payOrderMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <ClipLoader
                                size={16}
                                color="hsl(var(--primary-foreground))"
                              />
                              {t("pos.processing") || "Processing"}
                            </span>
                          ) : createdOrder.status === "paid" ? (
                            t("pos.paid") || "Paid"
                          ) : (
                            t("pos.pay_order") || "Pay order"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handlePrintInvoice}
                          disabled={
                            !createdOrder?.id ||
                            isOrderBusy ||
                            isPrintingInvoice
                          }
                        >
                          {isPrintingInvoice ? (
                            <span className="flex items-center gap-2">
                              <ClipLoader
                                size={16}
                                color="hsl(var(--foreground))"
                              />
                              {t("pos.processing") || "Processing"}
                            </span>
                          ) : (
                            t("pos.print_invoice") || "Print invoice"
                          )}
                        </Button>
                        <ProtectedComponent permission="pos.orders.canceled">
                          <Button
                            variant="outline"
                            onClick={handleCancelOrder}
                            disabled={
                              isOrderBusy ||
                              !cancelableStatuses.has(createdOrder.status)
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
                        <ProtectedComponent permission="pos.orders.refund">
                          <Button
                            variant="outline"
                            onClick={handleRefundOrder}
                            disabled={
                              isOrderBusy ||
                              !refundableStatuses.has(createdOrder.status)
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
                      </div>
                    </div>
                  </ProtectedComponent>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedComponent>
  );
};

export default PosPage;
