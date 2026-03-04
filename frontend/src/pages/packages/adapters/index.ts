import type {
  PackagePlan,
  PackagePlansResponse,
  CustomerPackage,
  CustomerPackagesResponse,
  PackageUsage,
  PackageUsagesResponse,
} from "../types";

type TablePlansResult = {
  data: { plans: PackagePlan[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

type TableCustomerPackagesResult = {
  data: { packages: CustomerPackage[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

type TablePackageUsagesResult = {
  data: { usages: PackageUsage[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const matchesPlanSearch = (plan: PackagePlan, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = plan.name?.toLowerCase() || "";
  const description = plan.description?.toLowerCase() || "";
  return name.includes(q) || description.includes(q);
};

const matchesCustomerPackageSearch = (row: CustomerPackage, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const planName = row.plan?.name?.toLowerCase() || "";
  const status = String(row.status ?? "").toLowerCase();
  return planName.includes(q) || status.includes(q);
};

const matchesUsageSearch = (row: PackageUsage, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const planName = row.customerPackage?.plan?.name?.toLowerCase() || "";
  const customerPackageId = String(row.customerPackageId ?? "");
  const appointmentId = String(row.appointmentId ?? "");
  const orderItemId = String(row.orderItemId ?? "");
  return (
    planName.includes(q) ||
    customerPackageId.includes(q) ||
    appointmentId.includes(q) ||
    orderItemId.includes(q)
  );
};

const paginate = <T,>(rows: T[], page: number, limit: number) => {
  const safeLimit = Math.max(1, limit || 10);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  return {
    paged: rows.slice(start, start + safeLimit),
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};

export const toTablePackagePlans = (
  payload: PackagePlansResponse | null | undefined,
  page: number,
  limit: number,
  searchQuery: string,
  showInactive: boolean,
): TablePlansResult => {
  const plans = payload?.data ?? [];
  const filtered = plans
    .filter((plan) => matchesPlanSearch(plan, searchQuery))
    .filter((plan) => (showInactive ? true : Boolean(plan.isActive)));

  const { paged, total, totalPages, page: safePage, limit: safeLimit } =
    paginate(filtered, page, limit);

  return {
    data: { plans: paged },
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};

export const toTableCustomerPackages = (
  payload: CustomerPackagesResponse | null | undefined,
  page: number,
  limit: number,
  searchQuery: string,
): TableCustomerPackagesResult => {
  const rows = payload?.data ?? [];
  const filtered = rows.filter((row) =>
    matchesCustomerPackageSearch(row, searchQuery),
  );

  const { paged, total, totalPages, page: safePage, limit: safeLimit } =
    paginate(filtered, page, limit);

  return {
    data: { packages: paged },
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};

export const toTablePackageUsages = (
  payload: PackageUsagesResponse | null | undefined,
  page: number,
  limit: number,
  searchQuery: string,
): TablePackageUsagesResult => {
  const rows = payload?.data ?? [];
  const filtered = rows.filter((row) => matchesUsageSearch(row, searchQuery));

  const { paged, total, totalPages, page: safePage, limit: safeLimit } =
    paginate(filtered, page, limit);

  return {
    data: { usages: paged },
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};
