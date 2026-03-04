import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PosOrder } from "@/pages/pos/types";

interface PosOrdersColumnsProps {
  onView: (order: PosOrder) => void;
}

const statusStyles: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  partially_paid: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  refunded: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  cancelled: "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

const statusLabelKey: Record<string, string> = {
  open: "pos_history.status_open",
  partially_paid: "pos_history.status_partially_paid",
  paid: "pos_history.status_paid",
  refunded: "pos_history.status_refunded",
  cancelled: "pos_history.status_cancelled",
};

const formatDateTime = (value?: string | null, locale = enUS) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM d, yyyy h:mm a", { locale });
};

const getCustomerName = (order: PosOrder) => {
  const customer = order.customer;
  if (!customer) return "-";
  const name = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim();
  return name || customer.phone || "-";
};

const formatKwd = (value: number, locale: string) => {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  } catch {
    return String(value);
  }
};

export const usePosOrdersColumns = ({
  onView,
}: PosOrdersColumnsProps): ColumnDef<PosOrder>[] => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "id",
      header: () => <div className="text-left">#</div>,
      cell: ({ row }) => <span className="font-medium">#{row.original.id}</span>,
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("pos_history.created_at") || t("created_at") || "Created at"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {formatDateTime(row.original.createdAt, dateLocale)}
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("pos_history.customer") || t("customers.customers") || "Customer"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {getCustomerName(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status") || "Status"}</div>,
      cell: ({ row }) => {
        const status = String(row.original.status || "-");
        return (
          <div className="flex justify-center">
            <Badge
              className={
                statusStyles[status] ||
                "bg-slate-500/15 text-slate-600 border-slate-500/30"
              }
            >
              {statusLabelKey[status]
                ? t(statusLabelKey[status]) || status
                : status}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "totalKwd",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("pos_history.total_kwd") || t("pos.total_kwd") || "Total (KWD)"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {formatKwd(Number(row.original.totalKwd ?? 0), i18n.language)}
        </div>
      ),
    },
    {
      accessorKey: "itemsCount",
      header: () => (
        <div className="text-center">
          {t("pos_history.items") || "Items"}
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          {row.original.items?.length ?? 0}
        </div>
      ),
    },
    {
      accessorKey: "paymentsCount",
      header: () => (
        <div className="text-center">
          {t("pos_history.payments") || "Payments"}
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          {row.original.payments?.length ?? 0}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-center">{t("actions") || "Actions"}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-primary border-primary/50 hover:bg-primary/10"
            onClick={() => onView(row.original)}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
