import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit, FaTrash, FaUndo } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { Customer } from "../types";

interface CustomersColumnsProps {
  onDelete: (id: number) => void;
  onRestore?: (id: number) => void;
  editPermission: string;
  deletePermission: string;
  restorePermission?: string;
}

const getFullName = (customer: Customer) =>
  [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();

export const useCustomersColumns = ({
  onDelete,
  onRestore,
  editPermission,
  deletePermission,
  restorePermission,
}: CustomersColumnsProps): ColumnDef<Customer>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "firstName",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("customers.full_name") || t("full_name") || "Full name"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const fullName = getFullName(row.original);
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            {fullName || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("customers.phone") || "Phone"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.phone || "-"}
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
              onClick={() => navigate(`/customers/edit/${row.original.id}`)}
            >
              <FaEdit className="w-3.5 h-3.5" />
            </Button>
          </ProtectedComponent>
          {row.original.deletedAt && onRestore ? (
            <ProtectedComponent permission={restorePermission}>
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-400 border-emerald-700 hover:bg-emerald-900/20 hover:border-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => onRestore?.(row.original.id)}
              >
                <FaUndo className="w-3.5 h-3.5" />
              </Button>
            </ProtectedComponent>
          ) : (
            <ProtectedComponent permission={deletePermission}>
              <Button
                variant="outline"
                size="sm"
                className="text-red-400 border-red-700 hover:bg-red-900/20 hover:border-red-600 transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => onDelete(row.original.id)}
              >
                <FaTrash className="w-3.5 h-3.5" />
              </Button>
            </ProtectedComponent>
          )}
        </div>
      ),
    },
  ];
};
