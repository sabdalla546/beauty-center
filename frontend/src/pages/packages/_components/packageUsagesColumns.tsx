import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";

import type { PackageUsage } from "../types";

interface PackageUsagesColumnsProps {
  serviceMap?: Record<number, string>;
}

export const usePackageUsagesColumns = ({
  serviceMap,
}: PackageUsagesColumnsProps): ColumnDef<PackageUsage>[] => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "usedAt",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.used_at") || "Used at"}
        </div>
      ),
      cell: ({ row }) => {
        if (!row.original.usedAt) {
          return (
            <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
              -
            </div>
          );
        }
        const usedAt = new Date(row.original.usedAt);
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <span className="text-foreground font-medium">
              {format(usedAt, "MMM d, yyyy HH:mm", { locale: dateLocale })}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "plan",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.plan") || "Plan"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.customerPackage?.plan?.name || "-"}
        </div>
      ),
    },
    {
      accessorKey: "qty",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.qty") || "Qty"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.qty ?? 0}
        </div>
      ),
    },
    {
      accessorKey: "serviceId",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.service") || "Service"}
        </div>
      ),
      cell: ({ row }) => {
        const serviceId = row.original.serviceId;
        const serviceName =
          serviceId && serviceMap ? serviceMap[serviceId] : "";
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            {serviceName || (serviceId ? `#${serviceId}` : "-")}
          </div>
        );
      },
    },
    {
      accessorKey: "appointmentId",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.appointment") || "Appointment"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.appointmentId ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "orderItemId",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.order_item") || "Order item"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.orderItemId ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "customerPackageId",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.customer_package") || "Customer package"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.customerPackageId ?? "-"}
        </div>
      ),
    },
  ];
};
