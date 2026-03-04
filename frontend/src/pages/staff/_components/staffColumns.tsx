import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { FaEdit, FaTrash, FaUndo } from "react-icons/fa";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import type { Staff, StaffUser } from "../types";

interface StaffColumnsProps {
  onDelete: (id: number) => void;
  onRestore?: (id: number) => void;
  editPermission: string;
  deletePermission: string;
  restorePermission?: string;
}

const getUserLabel = (user?: StaffUser | null) => {
  if (!user) return "-";
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || user.email || "-";
};

const getSkillsList = (skills?: Staff["skills"] | null) => {
  if (!skills || typeof skills !== "object") return [];
  if (Array.isArray(skills)) {
    return skills.map((item) => String(item)).filter(Boolean);
  }
  return Object.keys(skills).filter(Boolean);
};

export const useStaffColumns = ({
  onDelete,
  onRestore,
  editPermission,
  deletePermission,
  restorePermission,
}: StaffColumnsProps): ColumnDef<Staff>[] => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();

  return [
    {
      accessorKey: "displayName",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("staff.display_name") || t("name") || "Display name"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {row.original.displayName ||
            getUserLabel(row.original.user || row.original.User)}
        </div>
      ),
    },
    {
      id: "userName",
      accessorFn: (row) => getUserLabel(row.user || row.User),
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("staff.user") || "User"}
        </div>
      ),
      cell: ({ row }) => {
        const user = row.original.user || row.original.User;
        const label = getUserLabel(user);
        const email = user?.email;
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            <div className="text-foreground font-medium">{label}</div>
            {email && email !== label && (
              <div className="text-muted-foreground text-xs">{email}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "commissionPercent",
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("staff.commission_percent") || "Commission %"}
        </div>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const value = Number(row.original.commissionPercent ?? 0);
        const label = Number.isFinite(value) ? `${value}%` : "-";
        return (
          <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
            {label}
          </div>
        );
      },
    },
    {
      id: "skills",
      accessorFn: (row) => getSkillsList(row.skills).join(", "),
      header: () => (
        <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
          {t("staff.skills") || "Skills"}
        </div>
      ),
      cell: ({ row }) => {
        const skills = getSkillsList(row.original.skills);
        if (!skills.length) {
          return (
            <div className={i18n.language === "ar" ? "text-right" : "text-left"}>
              <span className="text-muted-foreground">-</span>
            </div>
          );
        }

        const preview = skills.slice(0, 2);
        const remainder = skills.length - preview.length;
        return (
          <div
            className={[
              "flex flex-wrap gap-1",
              i18n.language === "ar" ? "justify-end" : "justify-start",
            ].join(" ")}
          >
            {preview.map((skill) => (
              <Badge
                key={skill}
                variant="default"
                className="bg-primary/10 text-primary border border-primary/20"
              >
                {skill}
              </Badge>
            ))}
            {remainder > 0 && (
              <span className="text-xs text-muted-foreground">
                +{remainder}
              </span>
            )}
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
              onClick={() => navigate(`/staff/edit/${row.original.id}`)}
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
