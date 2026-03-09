import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  Staff,
  StaffDetailsResponse,
  StaffListResponse,
} from "@/pages/staff/types";

interface UseStaffParams {
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
  enabled?: boolean;
}

export const useStaff = ({
  currentPage,
  itemsPerPage,
  searchQuery,
  enabled = true,
}: UseStaffParams) => {
  return useQuery<StaffListResponse>({
    queryKey: ["staff", currentPage, itemsPerPage, searchQuery],
    queryFn: () =>
      api
        .get("/staff", {
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
    enabled,
  });
};

export const useStaffMember = (id?: string) => {
  return useQuery<Staff>({
    queryKey: ["staff-member", id],
    queryFn: async () => {
      const res = await api.get<StaffDetailsResponse>(`/staff/${id}`);
      const staff = res.data?.staff;
      if (!staff) {
        throw new Error("Staff not found");
      }
      return staff;
    },
    enabled: !!id,
  });
};
