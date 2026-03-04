import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { CreditCard } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import { Checkbox } from "@/components/ui/checkbox";

import { usePaymentMethods } from "@/hooks/paymentMethods/usePaymentMethods";
import { useTogglePaymentMethod } from "@/hooks/paymentMethods/usePaymentMethodMutations";
import { usePaymentMethodsColumns } from "@/pages/paymentMethods/_components/paymentMethodsColumns";
import { toTablePaymentMethods } from "@/pages/paymentMethods/adapters";
import type { PaymentMethod } from "@/pages/paymentMethods/types";

const PaymentMethodsPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showInactive, setShowInactive] = useState(false);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const viewPermission = "payment_methods.read";
  const createPermission = "payment_methods.create";
  const editPermission = "payment_methods.update";

  const { data: raw, isLoading } = usePaymentMethods({ activeOnly: false });
  const toggleMutation = useTogglePaymentMethod();

  const adapted = toTablePaymentMethods(
    raw ? { data: raw } : null,
    currentPage,
    itemsPerPage,
    searchQuery,
    showInactive,
  );
  const methods = adapted.data.methods;
  const totalItems = adapted.total;
  const totalPages = adapted.totalPages;

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm.trim());
    setCurrentPage(1);
  };

  const handleToggleActive = (method: PaymentMethod) => {
    toggleMutation.mutate({ id: method.id, isActive: !method.isActive });
  };

  const columns = usePaymentMethodsColumns({
    editPermission,
    onToggleActive: handleToggleActive,
    canToggle: true,
    isToggling: toggleMutation.isPending,
  });

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<CreditCard className="w-5 h-5 text-primary" />}
          title={t("payment_methods.payment_methods") || "Payment methods"}
          totalText={
            <>
              {totalItems} {t("payment_methods.total_methods") || "methods"}
            </>
          }
          search={{
            placeholder:
              t("payment_methods.search_methods") || "Search payment methods...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <ProtectedComponent permission={createPermission}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/system/payment-methods/create")}
              >
                {t("payment_methods.create_method") || "Create method"}
              </Button>
            </ProtectedComponent>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("payment_methods.methods_list") || "Payment methods list"}
              totalItems={totalItems}
              currentCount={methods.length}
              entityName={t("payment_methods.payment_methods") || "methods"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
              extra={
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={showInactive}
                    onCheckedChange={(value) => {
                      setShowInactive(Boolean(value));
                      setCurrentPage(1);
                    }}
                  />
                  {t("payment_methods.show_inactive") || "Show inactive"}
                </label>
              }
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("payment_methods.loading") || "Loading payment methods..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={methods}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="payment-methods"
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
      </div>
    </ProtectedComponent>
  );
};

export default PaymentMethodsPage;
