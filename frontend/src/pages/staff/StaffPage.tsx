import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { User } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirmDialog";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useStaff } from "@/hooks/staff/useStaff";
import { useDeleteStaff } from "@/hooks/staff/useDeleteStaff";
import { useRestoreStaff } from "@/hooks/staff/useRestoreStaff";
import { useStaffColumns } from "@/pages/staff/_components/staffColumns";
import { toTableStaff } from "@/pages/staff/adapters";

const StaffPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const [deleteCandidate, setDeleteCandidate] = useState<number | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<number | null>(null);

  const viewPermission = "staff.read";
  const createPermission = "staff.create";
  const editPermission = "staff.update";
  const deletePermission = "staff.delete";
  const restorePermission = "staff.restore";

  const { data: raw, isLoading } = useStaff({
    currentPage,
    itemsPerPage,
    searchQuery,
  });

  const adapted = toTableStaff(raw as any);
  const totalPages = adapted?.totalPages || 1;
  const staff = adapted?.data?.staff || [];
  const totalItems = adapted?.total || 0;

  const columns = useStaffColumns({
    onDelete: setDeleteCandidate,
    onRestore: setRestoreCandidate,
    editPermission,
    deletePermission,
    restorePermission,
  });

  const deleteMutation = useDeleteStaff();
  const restoreMutation = useRestoreStaff();

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
          icon={<User className="w-5 h-5 text-primary" />}
          title={t("staff.staff") || "Staff"}
          totalText={
            <>
              {totalItems} {t("staff.total_staff") || "total staff"}
            </>
          }
          search={{
            placeholder: t("staff.search_staff") || "Search staff...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <ProtectedComponent permission={createPermission}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/staff/create")}
              >
                {t("staff.create_staff") || "Create staff"}
              </Button>
            </ProtectedComponent>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("staff.staff_list") || "Staff list"}
              totalItems={totalItems}
              currentCount={staff.length}
              entityName={t("staff.staff") || "staff"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("staff.loading") || "Loading staff..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={staff}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="staff"
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
          title={t("staff.delete_staff") || "Delete staff"}
          message={
            t("staff.confirm_delete_staff") ||
            "Are you sure you want to delete this staff member?"
          }
          confirmLabel={t("delete") || "Delete"}
          cancelLabel={t("cancel") || "Cancel"}
          onConfirm={handleDeleteConfirm}
          isPending={deleteMutation.isPending}
        />

        <ConfirmDialog
          open={restoreCandidate !== null}
          onOpenChange={(open) => !open && setRestoreCandidate(null)}
          title={t("staff.restore_staff") || "Restore staff"}
          message={
            t("staff.confirm_restore_staff") ||
            "Are you sure you want to restore this staff member?"
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

export default StaffPage;
