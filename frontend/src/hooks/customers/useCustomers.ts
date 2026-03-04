import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  Customer,
  CustomerDetailsResponse,
  CustomersResponse,
} from "@/pages/customers/types";

interface UseCustomersParams {
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
}

export const useCustomers = ({
  currentPage,
  itemsPerPage,
  searchQuery,
}: UseCustomersParams) => {
  return useQuery<CustomersResponse>({
    queryKey: ["customers", currentPage, itemsPerPage, searchQuery],
    queryFn: () =>
      api
        .get("/customers", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: searchQuery,
          },
        })
        .then((res) => {
          const payload = res.data || {};
          const data = Array.isArray(payload.data) ? payload.data : [];
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

export const useCustomer = (id?: string) => {
  return useQuery<Customer>({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await api.get<CustomerDetailsResponse>(`/customers/${id}`);
      const customer = res.data?.customer;
      if (!customer) {
        throw new Error("Customer not found");
      }
      return customer;
    },
    enabled: !!id,
  });
};
