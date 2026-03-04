import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Role, RolesResponse } from "@/pages/roles&permissions/types";

export const useRoles = () => {
  return useQuery<RolesResponse>({
    queryKey: ["roles"],
    queryFn: () => api.get("/roles").then((res) => res.data),
  });
};

export const useRole = (id?: string) => {
  return useQuery<Role | null>({
    queryKey: ["role", id],
    queryFn: async () => {
      const res = await api.get("/roles");
      const roles = (res.data?.roles || []) as Role[];
      return roles.find((role) => String(role.id) === String(id)) || null;
    },
    enabled: !!id,
  });
};
