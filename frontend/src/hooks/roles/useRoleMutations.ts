/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/roles/useRoleMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface RoleFormValues {
  name: string;
  description?: string;
  permissionIds: number[];
}

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const res = await api.post("/roles", {
        name: values.name,
        description: values.description,
      });
      const roleId = res.data?.role?.id;
      if (roleId && values.permissionIds?.length) {
        await api.post(`/roles/${roleId}/permissions`, {
          permissionIds: values.permissionIds,
          mode: "replace",
        });
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      navigate("/system/roles");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create role.",
      });
    },
  });
};

export const useUpdateRole = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (values: RoleFormValues) => {
      if (!id) {
        throw new Error("Role id is required");
      }
      const res = await api.put(`/roles/${id}`, {
        name: values.name,
        description: values.description,
      });
      if (values.permissionIds?.length) {
        await api.post(`/roles/${id}/permissions`, {
          permissionIds: values.permissionIds,
          mode: "replace",
        });
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      if (id) queryClient.invalidateQueries({ queryKey: ["role", id] });
      navigate("/system/roles");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update role.",
      });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete role.",
      });
    },
  });
};
