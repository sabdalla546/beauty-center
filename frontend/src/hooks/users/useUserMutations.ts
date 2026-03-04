/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/users/useUserMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface UserFormValues {
  firstName?: string;
  lastName?: string;
  email: string;
  roleIds: number[];
  isActive?: boolean;
  password?: string;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: UserFormValues) =>
      api.post("/users", {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        roles: values.roleIds,
        password: values.password,
        isActive: values.isActive,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/system/users");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create user.",
      });
    },
  });
};

export const useUpdateUser = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: UserFormValues) => {
      const payload: any = {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        roles: values.roleIds,
        isActive: values.isActive,
      };

      return api.put(`/users/${id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (id) queryClient.invalidateQueries({ queryKey: ["user", id] });
      navigate("/system/users");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update user.",
      });
    },
  });
};
