import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { enUS, ar } from "date-fns/locale";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit } from "react-icons/fa";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { Room } from "../types";

interface RoomsColumnsProps {
  editPermission: string;
}

const getStatusVariant = (status?: string | null) => {
  const value = (status || "").toLowerCase();
  if (value === "maintenance" || value === "out_of_service") {
    return "bg-amber-500/15 text-amber-500 border border-amber-500/30";
  }
  if (value === "occupied") {
    return "bg-rose-500/15 text-rose-500 border border-rose-500/30";
  }
  return "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30";
};

export const useRoomsColumns = ({
  editPermission,
}: RoomsColumnsProps): ColumnDef<Room>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  return [
    {
      accessorKey: "name",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("rooms.name") || t("name") || "Name"}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "roomType",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("rooms.room_type") || "Room type"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.roomType?.name || "-"}
        </div>
      ),
    },
    {
      accessorKey: "capacity",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("rooms.capacity") || "Capacity"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.capacity ?? 1}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("rooms.status") || "Status"}
        </div>
      ),
      cell: ({ row }) => {
        const status = row.original.status || t("rooms.available") || "available";
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <Badge className={getStatusVariant(row.original.status)}>
              {status}
            </Badge>
          </div>
        );
      },
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
                navigate(`/rooms/edit/${row.original.id}`, {
                  state: { room: row.original },
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
