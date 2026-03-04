import type { Customer, CustomersResponse } from "../types";

type TableCustomersResult = {
  data: { customers: Customer[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

export const toTableCustomers = (
  payload?: CustomersResponse | null,
): TableCustomersResult => {
  if (!payload) {
    return {
      data: { customers: [] },
      total: 0,
      totalPages: 1,
      page: 1,
      limit: 10,
    };
  }

  const customers = Array.isArray(payload.data) ? payload.data : [];
  const meta = payload.meta || { page: 1, limit: customers.length, total: 0 };
  const total = Number(meta.total ?? customers.length) || 0;
  const limit = Number(meta.limit ?? customers.length) || 10;
  const page = Number(meta.page ?? 1) || 1;
  const totalPages =
    Number((meta as any).pages) || Math.max(1, Math.ceil(total / limit));

  return {
    data: { customers },
    total,
    totalPages,
    page,
    limit,
  };
};
