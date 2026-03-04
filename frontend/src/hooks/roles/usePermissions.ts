// src/hooks/permissions/usePermissions.ts
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { PermissionsResponse } from "@/pages/roles&permissions/types";

export const usePermissions = () => {
  return useQuery<PermissionsResponse>({
    queryKey: ["permissions"],
    queryFn: () => api.get("/roles/permissions").then((res) => res.data),
  });
};
