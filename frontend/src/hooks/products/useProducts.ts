/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { Product, ProductsResponse } from "@/pages/products/types";

interface UseProductsParams {
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
  sku?: string;
  barcode?: string;
}

export const useProducts = ({
  currentPage,
  itemsPerPage,
  searchQuery,
  sku,
  barcode,
}: UseProductsParams) => {
  return useQuery<ProductsResponse>({
    queryKey: [
      "products",
      currentPage,
      itemsPerPage,
      searchQuery,
      sku,
      barcode,
    ],
    queryFn: () =>
      api
        .get("/products", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            q: searchQuery,
            sku,
            barcode,
          },
        })
        .then((res) => {
          const payload = res.data || {};
          const data = Array.isArray(payload.data)
            ? payload.data.map((product: Product) => {
                const costFilsRaw =
                  (product as any).costFils ?? product.costCents;
                const priceFilsRaw =
                  (product as any).priceFils ?? product.priceCents;
                const costFils = Number(costFilsRaw);
                const priceFils = Number(priceFilsRaw);
                const hasCostFils =
                  costFilsRaw !== undefined &&
                  costFilsRaw !== null &&
                  Number.isFinite(costFils);
                const hasPriceFils =
                  priceFilsRaw !== undefined &&
                  priceFilsRaw !== null &&
                  Number.isFinite(priceFils);
                const costKwd = Number(
                  product.costKwd ?? (hasCostFils ? costFils / 1000 : 0),
                );
                const priceKwd = Number(
                  product.priceKwd ?? (hasPriceFils ? priceFils / 1000 : 0),
                );

                return {
                  ...product,
                  costKwd,
                  priceKwd,
                  costCents: hasCostFils
                    ? costFils
                    : Math.round(costKwd * 1000),
                  priceCents: hasPriceFils
                    ? priceFils
                    : Math.round(priceKwd * 1000),
                };
              })
            : [];
          const meta = payload.meta || {
            page: currentPage,
            limit: itemsPerPage,
            total: data.length,
          };
          const pages = Math.max(1, Math.ceil(meta.total / meta.limit));

          return {
            ...payload,
            data,
            meta: {
              ...meta,
              pages,
            },
          };
        }),
  });
};

export const useProductFromList = (id?: string, products?: Product[]) => {
  if (!id || !products?.length) return undefined;
  return products.find((product) => String(product.id) === String(id));
};
