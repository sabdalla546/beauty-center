/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product, ProductsResponse } from "../types";

type TableProductsResult = {
  data: { products: Product[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

export const toTableProducts = (
  payload?: ProductsResponse | null,
): TableProductsResult => {
  if (!payload) {
    return {
      data: { products: [] },
      total: 0,
      totalPages: 1,
      page: 1,
      limit: 10,
    };
  }

  const products = Array.isArray(payload.data) ? payload.data : [];
  const meta = payload.meta || { page: 1, limit: products.length, total: 0 };
  const total = Number(meta.total ?? products.length) || 0;
  const limit = Number(meta.limit ?? products.length) || 10;
  const page = Number(meta.page ?? 1) || 1;
  const totalPages =
    Number((meta as any).pages) || Math.max(1, Math.ceil(total / limit));

  return {
    data: { products },
    total,
    totalPages,
    page,
    limit,
  };
};
