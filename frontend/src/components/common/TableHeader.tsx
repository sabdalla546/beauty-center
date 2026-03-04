// src/components/ui/tableHeader.tsx
import React from "react";
import { useTranslation } from "react-i18next";

interface TableHeaderProps {
  title: string; // e.g. t("branches_list")
  totalItems?: number;
  currentCount?: number;
  entityName?: string; // e.g. t("branches")
  itemsPerPage: number;
  setItemsPerPage: (size: number) => void;
  setCurrentPage: (page: number) => void;
  showMeta?: boolean; // whether to show "Showing X of Y branches"
  extra?: React.ReactNode;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  title,
  totalItems,
  currentCount,
  entityName,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  showMeta = true,
  extra,
}) => {
  const { t } = useTranslation("common");

  return (
    <div className="px-6 py-4 border-b border-border bg-muted/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {showMeta &&
            totalItems !== undefined &&
            currentCount !== undefined && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("showing")} {currentCount} {t("of")} {totalItems}{" "}
                {entityName}
              </p>
            )}
        </div>

        {/* Items per page selector */}
        <div className="flex flex-wrap items-center gap-3">
          {extra ? <div className="flex items-center gap-2">{extra}</div> : null}
          <label htmlFor="itemsPerPageTop" className="text-sm text-muted-foreground">
            {t("items_per_page")}:
          </label>
          <select
            id="itemsPerPageTop"
            value={itemsPerPage}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setItemsPerPage(newSize);
              setCurrentPage(1);
            }}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {[1, 5, 10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default TableHeader;
