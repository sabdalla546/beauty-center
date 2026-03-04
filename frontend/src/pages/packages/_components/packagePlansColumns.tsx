import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit } from "react-icons/fa";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { PackagePlan } from "../types";

interface PackagePlansColumnsProps {
  editPermission: string;
  onToggleActive: (plan: PackagePlan) => void;
  canToggle: boolean;
  isToggling: boolean;
  serviceMap?: Record<number, string>;
}

const formatKwd = (value?: number | null) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toFixed(3);
};

export const usePackagePlansColumns = ({
  editPermission,
  onToggleActive,
  canToggle,
  isToggling,
  serviceMap,
}: PackagePlansColumnsProps): ColumnDef<PackagePlan>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "name",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.plan_name") || "Plan name"}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "description",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.description") || "Description"}
        </div>
      ),
      cell: ({ row }) => (
        <div
          className={[
            i18n.language === "ar" ? "text-right" : "text-left",
            "max-w-[240px] truncate text-muted-foreground",
          ].join(" ")}
        >
          {row.original.description || "-"}
        </div>
      ),
    },
    {
      accessorKey: "priceKwd",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.price_kwd") || "Price (KWD)"}
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
      accessorKey: "sessionsCount",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.sessions") || "Sessions"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.sessionsCount ?? 0}
        </div>
      ),
    },
    {
      accessorKey: "validDays",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.valid_days") || "Valid days"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.validDays ?? 0}
        </div>
      ),
    },
    {
      accessorKey: "serviceId",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.service_restriction") || "Service restriction"}
        </div>
      ),
      cell: ({ row }) => {
        const serviceId = row.original.serviceId;
        const serviceName =
          serviceId && serviceMap ? serviceMap[serviceId] : "";
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            {serviceId ? serviceName || `#${serviceId}` : t("packages.any") || "Any"}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: () => (
        <div className="text-center">
          {t("packages.status") || "Status"}
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
              ? t("packages.active") || "Active"
              : t("packages.inactive") || "Inactive"}
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
                navigate(`/packages/plans/edit/${row.original.id}`, {
                  state: { plan: row.original },
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
                  ? t("packages.disable") || "Disable"
                  : t("packages.enable") || "Enable"}
              </Button>
            </ProtectedComponent>
          ) : null}
        </div>
      ),
    },
  ];
};
