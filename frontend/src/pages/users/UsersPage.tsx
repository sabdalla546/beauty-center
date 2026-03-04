/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { ClipLoader } from "react-spinners";
import ConfirmDialog from "@/components/ui/confirmDialog";
import { FaPlus } from "react-icons/fa";
import { Users as UsersIcon } from "lucide-react";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import CompactHeader from "@/components/common/CompactHeader";

import { useUsers } from "@/hooks/users/useUsers";
import { useUsersColumns } from "@/pages/users/_components/usersColumns";
import { toTableUsers } from "@/pages/users/adapters";
import { useDeleteUser } from "@/hooks/users/useDeleteUser";
import { useRestoreUser } from "@/hooks/users/useRestoreUser";

const UsersPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { toast } = useToast();

  // state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const [deleteCandidate, setDeleteCandidate] = useState<number | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<number | null>(null);

  // permissions
  const viewPermission = "users.read";
  const createPermission = "users.create";
  const editPermission = "users.update";
  const deletePermission = "users.delete";
  const restorePermission = "users.restore";

  // fetch
  const { data: raw, isLoading } = useUsers({
    currentPage,
    itemsPerPage,
    searchQuery,
  });

  const adapted = toTableUsers(raw as any);
  const totalPages = adapted?.totalPages || 1;
  const users = adapted?.data?.users || [];
  const totalItems = adapted?.total || 0;

  // columns
  const columns = useUsersColumns({
    onDelete: setDeleteCandidate,
    onRestore: setRestoreCandidate,
    editPermission,
    deletePermission,
    restorePermission,
  });

  // export
  const handleExport = async () => {
    try {
      const res = await api.get("/users/export", {
        params: { searchTerm: searchQuery, search: searchQuery },
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `users_${new Date().toISOString().slice(0, 10)}.xlsx`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: t("users.success") || t("success"),
        description:
          t("users.excel_export_success") || "Excel exported successfully",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: t("users.error") || t("error"),
        description:
          err?.response?.data?.message ||
          t("users.excel_export_failed") ||
          "Failed to export Excel",
      });
    }
  };

  // events
  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  };

  const deleteMutation = useDeleteUser();
  const restoreMutation = useRestoreUser();

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
          icon={<UsersIcon className="w-5 h-5 text-primary" />}
          title={t("users.users") || t("users")}
          totalText={
            <>
              {totalItems}{" "}
              {t("users.total_users") || t("total_users") || "users"}
            </>
          }
          search={{
            placeholder:
              t("users.search_users") || t("search_users") || "Search...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-input text-foreground bg-background hover:bg-accent hover:text-accent-foreground px-3 py-2 h-auto text-xs"
                onClick={handleExport}
              >
                <svg
                  className="w-3.5 h-3.5 sm:mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {t("users.export_excel") || t("export_excel") || "Export"}
                </span>
              </Button>

              <ProtectedComponent permission={createPermission}>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                  onClick={() => navigate("/system/users/create")}
                >
                  <FaPlus className="w-3.5 h-3.5 mr-1.5" />
                  {t("users.create_user") || t("create_user")}
                </Button>
              </ProtectedComponent>
            </>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("users.users_list") || t("users_list")}
              totalItems={totalItems}
              currentCount={users.length}
              entityName={t("users.users") || t("users")}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("users.loading") || "Loading users..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={users}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="users"
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
          title={t("users.delete_user") || t("delete_user")}
          message={t("users.confirm_delete_user") || t("confirm_delete_user")}
          confirmLabel={t("users.delete") || t("delete")}
          cancelLabel={t("users.cancel") || t("cancel")}
          onConfirm={handleDeleteConfirm}
          isPending={deleteMutation.isPending}
        />

        <ConfirmDialog
          open={restoreCandidate !== null}
          onOpenChange={(open) => !open && setRestoreCandidate(null)}
          title={t("users.restore_user") || "Restore User"}
          message={
            t("users.confirm_restore_user") ||
            "Are you sure you want to restore this user?"
          }
          confirmLabel={t("users.restore") || "Restore"}
          cancelLabel={t("users.cancel") || t("cancel")}
          onConfirm={handleRestoreConfirm}
          isPending={restoreMutation.isPending}
        />
      </div>
    </ProtectedComponent>
  );
};

export default UsersPage;
