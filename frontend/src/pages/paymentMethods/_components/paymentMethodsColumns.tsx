import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { PaymentMethod } from "../types";

interface PaymentMethodsColumnsProps {
  editPermission: string;
  onToggleActive: (method: PaymentMethod) => void;
  canToggle: boolean;
  isToggling: boolean;
}

export const usePaymentMethodsColumns = ({
  editPermission,
  onToggleActive,
  canToggle,
  isToggling,
}: PaymentMethodsColumnsProps): ColumnDef<PaymentMethod>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "code",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("payment_methods.code") || "Code"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.code || "-"}
        </div>
      ),
    },
    {
      accessorKey: "nameEn",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("payment_methods.name_en") || "Name (EN)"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.nameEn}
        </div>
      ),
    },
    {
      accessorKey: "nameAr",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("payment_methods.name_ar") || "Name (AR)"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.nameAr}
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: () => (
        <div className="text-center">
          {t("payment_methods.status") || "Status"}
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Badge
            className={
              row.original.isActive
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                : "bg-slate-500/15 text-slate-600 border-slate-500/30"
            }
          >
            {row.original.isActive
              ? t("payment_methods.active") || "Active"
              : t("payment_methods.inactive") || "Inactive"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("created_at") || "Created at"}
        </div>
      ),
      cell: ({ row }) => {
        if (!row.original.createdAt) {
          return (
            <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
              -
            </div>
          );
        }
        const createdAt = new Date(row.original.createdAt);
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <span className="text-foreground font-medium">
              {format(createdAt, "MMM d, yyyy", { locale: dateLocale })}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">{t("actions") || "Actions"}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <ProtectedComponent permission={editPermission}>
            <Button
              variant="outline"
              size="sm"
              className="text-yellow-400 border-yellow-700 hover:bg-yellow-900/20 hover:border-yellow-600 transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={() =>
                navigate(`/system/payment-methods/edit/${row.original.id}`, {
                  state: { method: row.original },
                })
              }
            >
              <FaEdit className="w-3.5 h-3.5" />
            </Button>
          </ProtectedComponent>
          {canToggle ? (
            <ProtectedComponent permission={editPermission}>
              <Button
                variant="outline"
                size="sm"
                className={
                  row.original.isActive
                    ? "text-rose-500 border-rose-600 hover:bg-rose-500/10"
                    : "text-emerald-500 border-emerald-600 hover:bg-emerald-500/10"
                }
                onClick={() => onToggleActive(row.original)}
                disabled={isToggling}
              >
                {row.original.isActive
                  ? t("payment_methods.disable") || "Disable"
                  : t("payment_methods.enable") || "Enable"}
              </Button>
            </ProtectedComponent>
          ) : null}
        </div>
      ),
    },
  ];
};
