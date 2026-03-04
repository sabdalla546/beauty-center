import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { Gift } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import { Checkbox } from "@/components/ui/checkbox";

import { usePackagePlans } from "@/hooks/packages/usePackagePlans";
import { useTogglePackagePlan } from "@/hooks/packages/usePackagePlanMutations";
import { useServices } from "@/hooks/services/useServices";
import { usePackagePlansColumns } from "@/pages/packages/_components/packagePlansColumns";
import { toTablePackagePlans } from "@/pages/packages/adapters";

const PackagePlansPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showInactive, setShowInactive] = useState(false);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const viewPermission = "packages.read";
  const createPermission = "packages.create";
  const editPermission = "packages.update";

  const plansQuery = usePackagePlans({
    searchQuery,
    isActive: showInactive ? null : true,
  });
  const toggleMutation = useTogglePackagePlan();

  const servicesQuery = useServices({ searchQuery: "" });
  const serviceMap = useMemo(() => {
    const map: Record<number, string> = {};
    const services = servicesQuery.data?.data ?? [];
    services.forEach((service) => {
      map[service.id] = service.name;
    });
    return map;
  }, [servicesQuery.data]);

  const adapted = toTablePackagePlans(
    plansQuery.data,
    currentPage,
    itemsPerPage,
    searchQuery,
    showInactive,
  );
  const plans = adapted.data.plans;
  const totalItems = adapted.total;
  const totalPages = adapted.totalPages;

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm.trim());
    setCurrentPage(1);
  };

  const handleToggleActive = (plan: { id: number }) => {
    toggleMutation.mutate({ id: plan.id });
  };

  const columns = usePackagePlansColumns({
    editPermission,
    onToggleActive: handleToggleActive,
    canToggle: true,
    isToggling: toggleMutation.isPending,
    serviceMap,
  });

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Gift className="w-5 h-5 text-primary" />}
          title={t("packages.plans") || "Package plans"}
          totalText={
            <>
              {totalItems} {t("packages.total_plans") || "plans"}
            </>
          }
          search={{
            placeholder: t("packages.search_plans") || "Search plans...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <ProtectedComponent permission={createPermission}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/packages/plans/create")}
              >
                {t("packages.create_plan") || "Create plan"}
              </Button>
            </ProtectedComponent>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("packages.plans_list") || "Plans list"}
              totalItems={totalItems}
              currentCount={plans.length}
              entityName={t("packages.plans") || "plans"}
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
                  {t("packages.show_inactive") || "Show inactive"}
                </label>
              }
            />

            {plansQuery.isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("packages.loading") || "Loading package plans..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={plans}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="package-plans"
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

export default PackagePlansPage;
