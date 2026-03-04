import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit } from "react-icons/fa";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { RoomType } from "../types";

interface RoomTypesColumnsProps {
  editPermission: string;
}

export const useRoomTypesColumns = ({
  editPermission,
}: RoomTypesColumnsProps): ColumnDef<RoomType>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();

  return [
    {
      accessorKey: "name",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("rooms.room_type") || "Room type"}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "requiresPrivate",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("rooms.requires_private") || "Private room"}
        </div>
      ),
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.requiresPrivate ? (
            <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
              {t("rooms.private_yes") || "Required"}
            </Badge>
          ) : (
            <Badge className="bg-muted/50 text-muted-foreground border border-border">
              {t("rooms.private_no") || "Not required"}
            </Badge>
          )}
        </div>
      ),
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
                navigate(`/rooms/types/edit/${row.original.id}`, {
                  state: { roomType: row.original },
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
