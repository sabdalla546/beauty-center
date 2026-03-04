import type { PaymentMethod, PaymentMethodsResponse } from "../types";

type TablePaymentMethodsResult = {
  data: { methods: PaymentMethod[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const matchesSearch = (method: PaymentMethod, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const code = method.code?.toLowerCase() || "";
  const nameEn = method.nameEn?.toLowerCase() || "";
  const nameAr = method.nameAr?.toLowerCase() || "";
  return code.includes(q) || nameEn.includes(q) || nameAr.includes(q);
};

export const toTablePaymentMethods = (
  payload: PaymentMethodsResponse | null | undefined,
  page: number,
  limit: number,
  searchQuery: string,
  showInactive: boolean,
): TablePaymentMethodsResult => {
  const methods = payload?.data ?? [];
  const filtered = methods.filter((method) => {
    if (!showInactive && !method.isActive) return false;
    return matchesSearch(method, searchQuery);
  });

  const total = filtered.length;
  const safeLimit = Math.max(1, limit || 10);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  const paged = filtered.slice(start, start + safeLimit);

  return {
    data: { methods: paged },
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};
