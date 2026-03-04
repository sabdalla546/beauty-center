// src/pages/roles&permissions/_components/rolesColumns.tsx
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit, FaTrash } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { Role } from "../types";

interface RolesColumnsProps {
  onDelete: (id: number) => void;
  editPermission: string;
  deletePermission: string;
}

export const useRolesColumns = ({
  onDelete,
  editPermission,
  deletePermission,
}: RolesColumnsProps): ColumnDef<Role>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "name",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("name") || "Name"}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "description",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("description") || "Description"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.description || "-"}
        </div>
      ),
    },
    {
      accessorKey: "permissionsCount",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("permissions") || "Permissions"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.permissionsCount ?? row.original.permissions?.length ?? 0}
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
              onClick={() => navigate(`/system/roles/edit/${row.original.id}`)}
            >
              <FaEdit className="w-3.5 h-3.5" />
            </Button>
          </ProtectedComponent>
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
        </div>
      ),
    },
  ];
};
