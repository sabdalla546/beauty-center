// src/pages/users/_components/usersColumns.tsx
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";

// Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

// Icons
import { FaEdit, FaTrash, FaUndo } from "react-icons/fa";

// Types
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "../types";

interface UsersColumnsProps {
  onDelete: (id: number) => void;
  onRestore?: (id: number) => void;
  editPermission: string;
  deletePermission: string;
  restorePermission?: string;
}

export const useUsersColumns = ({
  onDelete,
  onRestore,
  editPermission,
  deletePermission,
  restorePermission,
}: UsersColumnsProps): ColumnDef<User>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "firstName",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("name")}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const fullName = [row.original.firstName, row.original.lastName]
          .filter(Boolean)
          .join(" ");
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            {fullName || row.original.email}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("email")}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "roles",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("role")}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.roles?.length ? (
            <Badge
              variant="default"
              className="bg-primary/15 text-primary border border-primary/30 shadow-sm hover:shadow-md transition-shadow"
            >
              {row.original.roles[0].name}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("created_at")}
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
      header: () => <div className="text-center">{t("actions")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <ProtectedComponent permission={editPermission}>
            <Button
              variant="outline"
              size="sm"
              className="text-yellow-400 border-yellow-700 hover:bg-yellow-900/20 hover:border-yellow-600 transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={() => navigate(`/system/users/edit/${row.original.id}`)}
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
