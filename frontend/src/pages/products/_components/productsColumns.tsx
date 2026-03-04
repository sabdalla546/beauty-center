/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit, FaExchangeAlt } from "react-icons/fa";
import { resolvePublicImageUrl } from "@/utils/publicFiles";
import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { Product } from "../types";

interface ProductsColumnsProps {
  onAdjustStock: (product: Product) => void;
  editPermission: string;
  adjustPermission: string;
}

const formatKwd = (value?: number | null) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toFixed(3);
};

export const useProductsColumns = ({
  onAdjustStock,
  editPermission,
  adjustPermission,
}: ProductsColumnsProps): ColumnDef<Product>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      id: "image",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("products.image") || "Image"}
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const src = resolvePublicImageUrl({
          imageUrl: (row.original as any).imageUrl,
          imagePath: (row.original as any).imagePath,
          filename: (row.original as any).image, // ✅ DB filename
          folder: "products",
        });

        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            {src ? (
              <img
                src={src}
                alt={row.original.name}
                className="h-10 w-10 rounded-md object-cover border border-border"
                loading="lazy"
                onError={(e) => {
                  // fallback UI if missing file
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },

    {
      accessorKey: "name",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("products.name") || t("name") || "Name"}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "sku",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("products.sku") || "SKU"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.sku || "-"}
        </div>
      ),
    },
    {
      accessorKey: "barcode",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("products.barcode") || "Barcode"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.barcode || "-"}
        </div>
      ),
    },
    {
      accessorKey: "priceKwd",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("products.price_kwd") || "Price (KWD)"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {formatKwd(row.original.priceKwd)}
        </div>
      ),
    },
    {
      accessorKey: "costKwd",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("products.cost_kwd") || "Cost (KWD)"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {formatKwd(row.original.costKwd)}
        </div>
      ),
    },
    {
      accessorKey: "currentQty",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("products.quantity") || "Qty"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.currentQty ?? 0}
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
      enableSorting: true,
      cell: ({ row }) => {
        if (!row.original.createdAt) {
          return (
            <div
              className={i18n.language === "ar" ? "text-right" : "text-left"}
            >
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
      header: () => (
        <div className="text-center">{t("actions") || "Actions"}</div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <ProtectedComponent permission={editPermission}>
            <Button
              variant="outline"
              size="sm"
              className="text-yellow-400 border-yellow-700 hover:bg-yellow-900/20 hover:border-yellow-600 transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={() =>
                navigate(`/inventory/products/edit/${row.original.id}`, {
                  state: { product: row.original },
                })
              }
            >
              <FaEdit className="w-3.5 h-3.5" />
            </Button>
          </ProtectedComponent>
          <ProtectedComponent permission={adjustPermission}>
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-400 border-emerald-700 hover:bg-emerald-900/20 hover:border-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={() => onAdjustStock(row.original)}
            >
              <FaExchangeAlt className="w-3.5 h-3.5" />
            </Button>
          </ProtectedComponent>
        </div>
      ),
    },
  ];
};
