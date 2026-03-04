/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";

export interface PackagePlanFormValues {
  name: string;
  description?: string | null;
  priceKwd: number;
  sessionsCount: number;
  validDays: number;
  serviceId?: number | null;
}

export const useCreatePackagePlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: PackagePlanFormValues) =>
      api.post("/packages/plans", values),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Package plan created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["package-plans"] });
      navigate("/packages/plans");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create package plan.",
      });
    },
  });
};

export const useUpdatePackagePlan = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: PackagePlanFormValues) => {
      if (!id) {
        throw new Error("Package plan id is required");
      }
      return api.put(`/packages/plans/${id}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Package plan updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["package-plans"] });
      navigate("/packages/plans");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update package plan.",
      });
    },
  });
};

export const useTogglePackagePlan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: { id: number }) =>
      api.patch(`/packages/plans/${payload.id}/toggle`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Package plan status updated",
      });
      queryClient.invalidateQueries({ queryKey: ["package-plans"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update plan status.",
      });
    },
  });
};
