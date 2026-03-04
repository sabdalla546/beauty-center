import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { Service } from "../types";

interface ServicesColumnsProps {
  editPermission: string;
}

const formatKwd = (value?: number | null) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toFixed(3);
};

const apiBaseUrl = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/api\/v1\/?$/, "");
const uploadsBaseUrl = (import.meta.env.VITE_UPLOADS_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

const joinBaseAndPath = (base: string, path: string) => {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanBase.endsWith("/uploads") && cleanPath.startsWith("/uploads/")) {
    return `${cleanBase}${cleanPath.slice("/uploads".length)}`;
  }
  return `${cleanBase}${cleanPath}`;
};

const resolvePublicImageUrl = (
  imageUrl?: string | null,
  imagePath?: string | null,
) => {
  if (imagePath) {
    if (imagePath.startsWith("http")) return imagePath;
    if (uploadsBaseUrl) return joinBaseAndPath(uploadsBaseUrl, imagePath);
    if (apiBaseUrl) return joinBaseAndPath(apiBaseUrl, imagePath);
    return imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  }
  if (imageUrl) return imageUrl;
  return null;
};

export const useServicesColumns = ({
  editPermission,
}: ServicesColumnsProps): ColumnDef<Service>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "imageUrl",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("services.image") || "Image"}
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const src = resolvePublicImageUrl(
          row.original.imageUrl,
          row.original.imagePath,
        );
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            {src ? (
              <img
                src={src}
                alt={row.original.name}
                className="h-10 w-10 rounded-md object-cover border border-border"
                loading="lazy"
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
          {t("services.name") || t("name") || "Name"}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "code",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("services.code") || "Code"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.code || "-"}
        </div>
      ),
    },
    {
      accessorKey: "durationMinutes",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("services.duration") || "Duration"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.durationMinutes ?? 0}{" "}
          {t("services.minutes") || "min"}
        </div>
      ),
    },
    {
      accessorKey: "priceKwd",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("services.price_kwd") || "Price (KWD)"}
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
      accessorKey: "requiredRoomType",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("services.room_type") || "Room type"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.requiredRoomType?.name || "-"}
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
                navigate(`/services/edit/${row.original.id}`, {
                  state: { service: row.original },
                })
              }
            >
              <FaEdit className="w-3.5 h-3.5" />
            </Button>
          </ProtectedComponent>
        </div>
      ),
    },
  ];
};
