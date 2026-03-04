// src/hooks/users/useUsers.ts
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { User, UsersResponse } from "@/pages/users/types";

interface UseUsersParams {
  currentPage: number;
  itemsPerPage: number;
  searchQuery: string;
}

export const useUsers = ({
  currentPage,
  itemsPerPage,
  searchQuery,
}: UseUsersParams) => {
  return useQuery<UsersResponse>({
    queryKey: ["users", currentPage, itemsPerPage, searchQuery],
    queryFn: () =>
      api
        .get("/users", {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: searchQuery, // لو في الباك اسم مختلف غيّره هنا
          },
        })
        .then((res) => {
          const payload = res.data || {};
          const data = (payload.data || []).map((u: User) => {
            const fullName = [u.firstName, u.lastName]
              .filter(Boolean)
              .join(" ")
              .trim();
            return {
              ...u,
              fullName: fullName || u.email,
            };
          });

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

export const useUser = (id?: string) => {
  return useQuery<User>({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await api.get(`/users/${id}`);
      const user = res.data?.user as User | undefined;
      if (!user) {
        throw new Error("User not found");
      }
      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      return {
        ...user,
        fullName: fullName || user.email,
      };
    },
    enabled: !!id,
  });
};
