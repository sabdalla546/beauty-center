import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipLoader } from "react-spinners";
import { Activity } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import Pagination from "@/components/ui/pagination";
import CompactHeader from "@/components/common/CompactHeader";
import TableHeader from "@/components/common/TableHeader";
import { ProtectedComponent } from "@/components/routing/ProtectedComponent";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
  SearchableSelectEmpty,
  SearchableSelectItem,
} from "@/components/ui/searchable-select";

import { useCustomers } from "@/hooks/customers/useCustomers";
import { useServices } from "@/hooks/services/useServices";
import { usePackageUsages } from "@/hooks/packages/usePackageUsages";
import { usePackageUsagesColumns } from "@/pages/packages/_components/packageUsagesColumns";
import { toTablePackageUsages } from "@/pages/packages/adapters";

const toInputDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
};

const getStartDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getEndDate = () => {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
};

const PackageUsagesPage: React.FC = () => {
  const { t } = useTranslation("common");

  const [dateFrom, setDateFrom] = useState(() => toInputDate(getStartDate()));
  const [dateTo, setDateTo] = useState(() => toInputDate(getEndDate()));
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [customerSearch, setCustomerSearch] = useState("");

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
  const servicesQuery = useServices({ searchQuery: "" });

  const dateFromParam = dateFrom ? `${dateFrom}T00:00:00` : undefined;
  const dateToParam = dateTo ? `${dateTo}T23:59:59` : undefined;

  const usagesQuery = usePackageUsages({
    customerId,
    dateFrom: dateFromParam,
    dateTo: dateToParam,
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

  const adapted = toTablePackageUsages(
    usagesQuery.data,
    currentPage,
    itemsPerPage,
    searchQuery,
  );
  const rows = adapted.data.usages;
  const totalItems = adapted.total;
  const totalPages = adapted.totalPages;

  const columns = usePackageUsagesColumns({ serviceMap });

  const handleSearchSubmit = () => {
    setSearchQuery(searchTerm.trim());
    setCurrentPage(1);
  };

  return (
    <ProtectedComponent permission={viewPermission}>
      <div className="min-h-screen p-4 space-y-4 bg-background text-foreground">
        <CompactHeader
          icon={<Activity className="w-5 h-5 text-primary" />}
          title={t("packages.usages") || "Package usage"}
          subtitle={
            t("packages.usages_subtitle") ||
            "Track redeemed sessions across customers."
          }
          search={{
            placeholder: t("packages.search_usages") || "Search usage...",
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
                {t("packages.usages_filters_hint") ||
                  "Filter by date range and customer."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("packages.from") || "From"}
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {t("packages.to") || "To"}
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
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
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => usagesQuery.refetch()}>
                {t("packages.refresh") || "Refresh"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom(toInputDate(getStartDate()));
                  setDateTo(toInputDate(getEndDate()));
                }}
              >
                {t("packages.last_30_days") || "Last 30 days"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="px-1 sm:px-0">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <TableHeader
              title={t("packages.usages_list") || "Usage list"}
              totalItems={totalItems}
              currentCount={rows.length}
              entityName={t("packages.usages") || "usages"}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
            />

            {usagesQuery.isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="text-center">
                  <ClipLoader size={50} color="hsl(var(--primary))" />
                  <p className="text-muted-foreground mt-4">
                    {t("packages.loading") || "Loading package usage..."}
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
                  fileName="package-usages"
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

export default PackageUsagesPage;
