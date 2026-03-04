import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { Users } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirmDialog";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useCustomers } from "@/hooks/customers/useCustomers";
import { useDeleteCustomer } from "@/hooks/customers/useDeleteCustomer";
import { useRestoreCustomer } from "@/hooks/customers/useRestoreCustomer";
import { useCustomersColumns } from "@/pages/customers/_components/customersColumns";
import { toTableCustomers } from "@/pages/customers/adapters";

const CustomersPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const [deleteCandidate, setDeleteCandidate] = useState<number | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<number | null>(null);

  const viewPermission = "customers.read";
  const createPermission = "customers.create";
  const editPermission = "customers.update";
  const deletePermission = "customers.delete";
  const restorePermission = "customers.restore";

  const { data: raw, isLoading } = useCustomers({
    currentPage,
    itemsPerPage,
    searchQuery,
  });

  const adapted = toTableCustomers(raw as any);
  const totalPages = adapted?.totalPages || 1;
  const customers = adapted?.data?.customers || [];
  const totalItems = adapted?.total || 0;

  const columns = useCustomersColumns({
    onDelete: setDeleteCandidate,
    onRestore: setRestoreCandidate,
    editPermission,
    deletePermission,
    restorePermission,
  });

  const deleteMutation = useDeleteCustomer();
  const restoreMutation = useRestoreCustomer();

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  };

  const handleDeleteConfirm = () => {
    if (!deleteCandidate) return;
    deleteMutation.mutate(deleteCandidate, {
      onSettled: () => setDeleteCandidate(null),
    });
  };

  const handleRestoreConfirm = () => {
    if (!restoreCandidate) return;
    restoreMutation.mutate(restoreCandidate, {
      onSettled: () => setRestoreCandidate(null),
    });
  };

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Users className="w-5 h-5 text-primary" />}
          title={t("customers.customers") || "Customers"}
          totalText={
            <>
              {totalItems} {t("customers.total_customers") || "total customers"}
            </>
          }
          search={{
            placeholder: t("customers.search_customers") || "Search customers...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <ProtectedComponent permission={createPermission}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/customers/create")}
              >
                {t("customers.create_customer") || "Create customer"}
              </Button>
            </ProtectedComponent>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("customers.customers_list") || "Customers list"}
              totalItems={totalItems}
              currentCount={customers.length}
              entityName={t("customers.customers") || "customers"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("customers.loading") || "Loading customers..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={customers}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="customers"
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

        <ConfirmDialog
          open={deleteCandidate !== null}
          onOpenChange={(open) => !open && setDeleteCandidate(null)}
          title={t("customers.delete_customer") || "Delete customer"}
          message={
            t("customers.confirm_delete_customer") ||
            "Are you sure you want to delete this customer?"
          }
          confirmLabel={t("delete") || "Delete"}
          cancelLabel={t("cancel") || "Cancel"}
          onConfirm={handleDeleteConfirm}
          isPending={deleteMutation.isPending}
        />

        <ConfirmDialog
          open={restoreCandidate !== null}
          onOpenChange={(open) => !open && setRestoreCandidate(null)}
          title={t("customers.restore_customer") || "Restore customer"}
          message={
            t("customers.confirm_restore_customer") ||
            "Are you sure you want to restore this customer?"
          }
          confirmLabel={t("restore") || "Restore"}
          cancelLabel={t("cancel") || "Cancel"}
          onConfirm={handleRestoreConfirm}
          isPending={restoreMutation.isPending}
        />
      </div>
    </ProtectedComponent>
  );
};

export default CustomersPage;
