import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { CustomerPackage } from "../types";

interface CustomerPackagesColumnsProps {
  serviceMap?: Record<number, string>;
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  used_up: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  expired: "bg-slate-500/15 text-slate-600 border-slate-500/30",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-500/30",
};

export const useCustomerPackagesColumns = ({
  serviceMap,
}: CustomerPackagesColumnsProps): ColumnDef<CustomerPackage>[] => {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "plan",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.plan") || "Plan"}
        </div>
      ),
      cell: ({ row }) => {
        const planName = row.original.plan?.name || "-";
        const serviceId = row.original.plan?.serviceId;
        const serviceName =
          serviceId && serviceMap ? serviceMap[serviceId] : "";
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <div className="font-medium text-foreground">{planName}</div>
            <div className="text-xs text-muted-foreground">
              {serviceId
                ? serviceName || `#${serviceId}`
                : t("packages.any") || "Any"}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => (
        <div className="text-center">{t("packages.status") || "Status"}</div>
      ),
      cell: ({ row }) => {
        const status = String(row.original.status ?? "active");
        return (
          <div className="flex justify-center">
            <Badge className={statusStyles[status] || statusStyles.expired}>
              {t(`packages.status_${status}`) || status.replace("_", " ")}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "remainingSessions",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.sessions_left") || "Sessions left"}
        </div>
      ),
      cell: ({ row }) => {
        const total = Number(row.original.totalSessions ?? 0);
        const used = Number(row.original.usedSessions ?? 0);
        const remaining =
          row.original.remainingSessions ?? Math.max(0, total - used);
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <div className="font-medium text-foreground">{remaining}</div>
            <div className="text-xs text-muted-foreground">
              {used}/{total}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "expiresAt",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("packages.validity") || "Validity"}
        </div>
      ),
      cell: ({ row }) => {
        const start = row.original.startAt
          ? format(new Date(row.original.startAt), "MMM d, yyyy", {
              locale: dateLocale,
            })
          : "-";
        const end = row.original.expiresAt
          ? format(new Date(row.original.expiresAt), "MMM d, yyyy", {
              locale: dateLocale,
            })
          : "-";
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <div className="text-xs text-muted-foreground">
              {t("packages.start") || "Start"}: {start}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("packages.end") || "End"}: {end}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "isUsable",
      header: () => (
        <div className="text-center">{t("packages.usable") || "Usable"}</div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Badge
            className={
              row.original.isUsable
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                : "bg-slate-500/15 text-slate-600 border-slate-500/30"
            }
          >
            {row.original.isUsable
              ? t("packages.usable_yes") || "Yes"
              : t("packages.usable_no") || "No"}
          </Badge>
        </div>
      ),
    },
  ];
};
