/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface PaymentMethodFormValues {
  code?: string;
  nameEn?: string;
  nameAr?: string;
  isActive?: boolean;
}

export const useCreatePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: PaymentMethodFormValues) =>
      api.post("/payment-methods", {
        code: values.code,
        nameEn: values.nameEn,
        nameAr: values.nameAr,
        isActive: values.isActive ?? true,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment method created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      navigate("/system/payment-methods");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create payment method.",
      });
    },
  });
};

export const useUpdatePaymentMethod = (id?: string | number) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: PaymentMethodFormValues) => {
      if (!id) {
        throw new Error("Payment method id is required");
      }
      return api.patch(`/payment-methods/${id}`, {
        nameEn: values.nameEn,
        nameAr: values.nameAr,
        isActive: values.isActive,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment method updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      navigate("/system/payment-methods");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update payment method.",
      });
    },
  });
};

export const useTogglePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: { id: number; isActive: boolean }) =>
      api.patch(`/payment-methods/${payload.id}`, {
        isActive: payload.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update payment method.",
      });
    },
  });
};
