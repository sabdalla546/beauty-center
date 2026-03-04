import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipLoader } from "react-spinners";
import { Package } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";

import { useCustomers } from "@/hooks/customers/useCustomers";
import { useServices } from "@/hooks/services/useServices";
import { useCustomerPackages } from "@/hooks/packages/useCustomerPackages";
import { useCustomerPackagesColumns } from "@/pages/packages/_components/customerPackagesColumns";
import { toTableCustomerPackages } from "@/pages/packages/adapters";

const CustomerPackagesPage: React.FC = () => {
  const { t } = useTranslation("common");

  const [customerId, setCustomerId] = useState<number | undefined>();
  const [serviceId, setServiceId] = useState<number | undefined>();
  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const [onlyUsable, setOnlyUsable] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const rowNumberStart = (currentPage - 1) * itemsPerPage + 1;

  const viewPermission = "packages.read";

  const customersQuery = useCustomers({
    currentPage: 1,
    itemsPerPage: 20,
    searchQuery: customerSearch,
  });

  const servicesQuery = useServices({ searchQuery: serviceSearch });

  const packagesQuery = useCustomerPackages({
    customerId,
    onlyUsable,
    includeInactive,
    serviceId: serviceId ?? null,
  });

  const customers = customersQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];

  const serviceMap = useMemo(() => {
    const map: Record<number, string> = {};
    services.forEach((service) => {
      map[service.id] = service.name;
    });
    return map;
  }, [services]);

  const adapted = toTableCustomerPackages(
    packagesQuery.data,
    currentPage,
    itemsPerPage,
    searchQuery,
  );
  const rows = adapted.data.packages;
  const totalItems = adapted.total;
  const totalPages = adapted.totalPages;

  const columns = useCustomerPackagesColumns({ serviceMap });

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm.trim());
    setCurrentPage(1);
  };

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Package className="w-5 h-5 text-primary" />}
          title={t("packages.customer_packages") || "Customer packages"}
          subtitle={
            t("packages.customer_packages_subtitle") ||
            "Track active and expired packages per customer."
          }
          search={{
            placeholder: t("packages.search_customer_packages") || "Search plans...",
            value: searchTerm,
            onChange: setSearchTerm,
            onSubmit: handleSearchSubmit,
          }}
        />

        <Card className="bg-card border-border rounded-xl shadow-sm">
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("packages.filters") || "Filters"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("packages.filters_hint") ||
                  "Select a customer and optionally restrict by service."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("packages.customer") || "Customer"}
                </label>
                <SearchableSelect
                  value={customerId ? String(customerId) : ""}
                  onValueChange={(value) =>
                    setCustomerId(value ? Number(value) : undefined)
                  }
                  placeholder={t("packages.select_customer") || "Select customer"}
                  searchPlaceholder={
                    t("packages.search_customers") || "Search customers..."
                  }
                  onSearch={setCustomerSearch}
                  isLoading={customersQuery.isLoading}
                  emptyMessage={t("packages.no_customers") || "No customers found"}
                  allowClear={!!customerId}
                  onClear={() => setCustomerId(undefined)}
                >
                  {customers.length ? (
                    customers.map((customer) => (
                      <SearchableSelectItem
                        key={customer.id}
                        value={String(customer.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {`${customer.firstName ?? ""} ${
                              customer.lastName ?? ""
                            }`.trim() || `#${customer.id}`}
                          </span>
                          {customer.phone ? (
                            <span className="text-xs text-muted-foreground">
                              {customer.phone}
                            </span>
                          ) : null}
                        </div>
                      </SearchableSelectItem>
                    ))
                  ) : (
                    <SearchableSelectEmpty
                      message={t("packages.no_customers") || "No customers found"}
                    />
                  )}
                </SearchableSelect>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  {t("packages.service") || "Service"}
                </label>
                <SearchableSelect
                  value={serviceId ? String(serviceId) : ""}
                  onValueChange={(value) =>
                    setServiceId(value ? Number(value) : undefined)
                  }
                  placeholder={t("packages.select_service") || "Select service"}
                  searchPlaceholder={
                    t("packages.search_services") || "Search services..."
                  }
                  onSearch={setServiceSearch}
                  isLoading={servicesQuery.isLoading}
                  emptyMessage={t("packages.no_services") || "No services found"}
                  allowClear={!!serviceId}
                  onClear={() => setServiceId(undefined)}
                >
                  {services.length ? (
                    services.map((service) => (
                      <SearchableSelectItem
                        key={service.id}
                        value={String(service.id)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {service.durationMinutes ?? 0}{" "}
                            {t("packages.minutes") || "min"}
                          </span>
                        </div>
                      </SearchableSelectItem>
                    ))
                  ) : (
                    <SearchableSelectEmpty
                      message={t("packages.no_services") || "No services found"}
                    />
                  )}
                </SearchableSelect>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs text-muted-foreground">
                  {t("packages.visibility") || "Visibility"}
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={onlyUsable}
                    onCheckedChange={(value) => {
                      setOnlyUsable(Boolean(value));
                      setCurrentPage(1);
                    }}
                  />
                  {t("packages.only_usable") || "Only usable"}
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={includeInactive}
                    onCheckedChange={(value) => {
                      setIncludeInactive(Boolean(value));
                      setCurrentPage(1);
                    }}
                  />
                  {t("packages.include_inactive") || "Include cancelled"}
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => packagesQuery.refetch()} disabled={!customerId}>
                {t("packages.refresh") || "Refresh"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("packages.customer_packages_list") || "Customer packages list"}
              totalItems={totalItems}
              currentCount={rows.length}
              entityName={t("packages.customer_packages") || "packages"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {!customerId ? (
              <div className="flex justify-center items-center h-64 text-muted-foreground">
                {t("packages.select_customer_prompt") ||
                  "Select a customer to view packages."}
              </div>
            ) : packagesQuery.isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("packages.loading") || "Loading customer packages..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <DataTable
                  columns={columns}
                  data={rows}
                  rowNumberStart={rowNumberStart}
                  enableRowNumbers
                  showExportCSV
                  showExportExcel
                  showPrint
                  fileName="customer-packages"
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

export default CustomerPackagesPage;
