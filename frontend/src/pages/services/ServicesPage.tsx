/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { Briefcase } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";

import { useServices } from "@/hooks/services/useServices";
import { useServicesColumns } from "@/pages/services/_components/servicesColumns";
import { toTableServices } from "@/pages/services/adapters";

const ServicesPage: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const viewPermission = "services.read";
  const createPermission = "services.create";
  const editPermission = "services.update";

  const { data: raw, isLoading } = useServices({ searchQuery });

  const adapted = toTableServices(
    raw as any,
    currentPage,
    itemsPerPage,
    searchQuery,
  );
  const services = adapted.data.services;
  const totalItems = adapted.total;
  const totalPages = adapted.totalPages;

  const columns = useServicesColumns({
    editPermission,
  });

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  };

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Briefcase className="w-5 h-5 text-primary" />}
          title={t("services.services") || "Services"}
          totalText={
            <>
              {totalItems} {t("services.total_services") || "total services"}
            </>
          }
          search={{
            placeholder: t("services.search_services") || "Search services...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
          right={
            <ProtectedComponent permission={createPermission}>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 h-auto text-xs"
                onClick={() => navigate("/services/create")}
              >
                {t("services.create_service") || "Create service"}
              </Button>
            </ProtectedComponent>
          }
        />

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("services.services_list") || "Services list"}
              totalItems={totalItems}
              currentCount={services.length}
              entityName={t("services.services") || "services"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("services.loading") || "Loading services..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={services}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="services"
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

export default ServicesPage;
