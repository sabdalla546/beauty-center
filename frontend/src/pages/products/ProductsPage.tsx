import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipLoader } from "react-spinners";
import { Package } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useProducts } from "@/hooks/products/useProducts";
import { useAdjustProductStock } from "@/hooks/products/useProductMutations";
import { useProductsColumns } from "@/pages/products/_components/productsColumns";
import { toTableProducts } from "@/pages/products/adapters";
import type { Product } from "@/pages/products/types";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ProductsPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustChange, setAdjustChange] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustReferenceId, setAdjustReferenceId] = useState("");

  const viewPermission = "products.read";
  const createPermission = "products.create";
  const editPermission = "products.update";
  const adjustPermission = "products.adjust_stock";

  const { data: raw, isLoading } = useProducts({
    currentPage,
    itemsPerPage,
    searchQuery,
  });

  const adapted = toTableProducts(raw as any);
  const totalPages = adapted?.totalPages || 1;
  const products = adapted?.data?.products || [];
  const totalItems = adapted?.total || 0;

  const adjustMutation = useAdjustProductStock();

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  };

  const openAdjust = (product: Product) => {
    setAdjustTarget(product);
    setAdjustChange("");
    setAdjustReason("");
    setAdjustReferenceId("");
    setAdjustOpen(true);
  };

  const handleAdjustSubmit = () => {
    if (!adjustTarget) return;
    const changeValue = Number(adjustChange);
    if (!Number.isFinite(changeValue) || changeValue === 0) {
      toast({
        variant: "destructive",
        title: t("error") || "Error",
        description:
          t("products.adjust_change_invalid") ||
          "Enter a non-zero adjustment value.",
      });
      return;
    }
    if (!adjustReason.trim()) {
      toast({
        variant: "destructive",
        title: t("error") || "Error",
        description:
          t("products.adjust_reason_required") ||
          "Reason is required for stock adjustment.",
      });
      return;
    }

    adjustMutation.mutate(
      {
        id: adjustTarget.id,
        change: changeValue,
        reason: adjustReason.trim(),
        referenceId: adjustReferenceId.trim() || undefined,
      },
      {
        onSuccess: () => setAdjustOpen(false),
      },
    );
  };

  const columns = useProductsColumns({
    onAdjustStock: openAdjust,
    editPermission,
    adjustPermission,
  });

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Package className="w-5 h-5 text-primary" />}
          title={t("products.products") || "Products"}
          totalText={
            <>
              {totalItems} {t("products.total_products") || "total products"}
            </>
          }
          search={{
            placeholder: t("products.search_products") || "Search products...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <ProtectedComponent permission={createPermission}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/inventory/products/create")}
              >
                {t("products.create_product") || "Create product"}
              </Button>
            </ProtectedComponent>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("products.products_list") || "Products list"}
              totalItems={totalItems}
              currentCount={products.length}
              entityName={t("products.products") || "products"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("products.loading") || "Loading products..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={products}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="products"
                />
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-border bg-muted/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("products.adjust_stock") || "Adjust stock"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">
                  {t("products.adjust_for") || "Adjusting stock for"}
                </p>
                <p className="text-foreground font-medium">
                  {adjustTarget?.name || "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("products.current_qty") || "Current qty"}:{" "}
                  {adjustTarget?.currentQty ?? 0}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t("products.adjust_change") || "Change"}
                </label>
                <Input
                  type="number"
                  value={adjustChange}
                  onChange={(e) => setAdjustChange(e.target.value)}
                  placeholder={t("products.adjust_change_hint") || "+5 / -2"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t("products.adjust_reason") || "Reason"}
                </label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder={
                    t("products.adjust_reason_hint") || "Stock count"
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t("products.reference_id") || "Reference id"}
                </label>
                <Input
                  value={adjustReferenceId}
                  onChange={(e) => setAdjustReferenceId(e.target.value)}
                  placeholder={t("products.reference_id_hint") || "Optional"}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setAdjustOpen(false)}
                disabled={adjustMutation.isPending}
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                onClick={handleAdjustSubmit}
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending
                  ? t("products.processing") || "Processing"
                  : t("products.apply_adjustment") || "Apply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedComponent>
  );
};

export default ProductsPage;
