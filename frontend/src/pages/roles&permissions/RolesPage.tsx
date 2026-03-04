import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { Shield } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirmDialog";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useRoles } from "@/hooks/roles/useRoles";
import { useDeleteRole } from "@/hooks/roles/useRoleMutations";
import { useRolesColumns } from "@/pages/roles&permissions/_components/rolesColumns";
import { toTableRoles } from "@/pages/roles&permissions/adapters";

const RolesPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteCandidate, setDeleteCandidate] = useState<number | null>(null);

  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const viewRolePermission = "roles.read";
  const createRolePermission = "roles.create";
  const editRolePermission = "roles.update";
  const deleteRolePermission = "roles.delete";

  const { data: raw, isLoading } = useRoles();

  const adapted = toTableRoles(raw as any, currentPage, itemsPerPage, searchQuery);
  const roles = adapted.data.roles;
  const totalItems = adapted.total;
  const totalPages = adapted.totalPages;

  const columns = useRolesColumns({
    onDelete: setDeleteCandidate,
    editPermission: editRolePermission,
    deletePermission: deleteRolePermission,
  });

  const deleteMutation = useDeleteRole();

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

  return (
    <ProtectedComponent permission={viewRolePermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Shield className="w-5 h-5 text-primary" />}
          title={t("roles") || "Roles"}
          totalText={
            <>
              {totalItems} {t("total_roles") || "total roles"}
            </>
          }
          search={{
            placeholder: t("search_roles") || "Search roles...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <ProtectedComponent permission={createRolePermission}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/system/roles/create")}
              >
                {t("create_role") || "Create role"}
              </Button>
            </ProtectedComponent>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("roles_list") || t("roles") || "Roles"}
              totalItems={totalItems}
              currentCount={roles.length}
              entityName={t("roles") || "roles"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("loading") || "Loading roles..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={roles}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="roles"
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
          title={t("delete_role") || "Delete role"}
          message={t("confirm_delete_role") || "Are you sure you want to delete this role?"}
          confirmLabel={t("delete") || "Delete"}
          cancelLabel={t("cancel") || "Cancel"}
          onConfirm={handleDeleteConfirm}
          isPending={deleteMutation.isPending}
        />
      </div>
    </ProtectedComponent>
  );
};

export default RolesPage;
