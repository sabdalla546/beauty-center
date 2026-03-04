/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import type { PosOrderItem } from "@/pages/pos/types";

export interface CreatePosOrderInput {
  externalRef?: string | null;
  customerId?: number | null;
  items: PosOrderItem[];
  discountKwd?: number;
  taxKwd?: number;
}

export interface PayPosOrderInput {
  orderId: number;
  payments: Array<{
    amountKwd: number;
    methodId: number;
    providerReference?: string | null;
  }>;
}

export interface OrderActionInput {
  orderId: number;
}

const invalidatePosQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: number,
) => {
  queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: ["pos-order", orderId] });
  }
};

export const useCreatePosOrder = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: CreatePosOrderInput) =>
      api.post("/pos/orders", {
        externalRef: values.externalRef ?? null,
        customerId: values.customerId ?? null,
        items: values.items,
        discountKwd: values.discountKwd ?? 0,
        taxKwd: values.taxKwd ?? 0,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create order.",
      });
    },
  });
};

export const usePayPosOrder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: PayPosOrderInput) =>
      api.post(`/pos/orders/${values.orderId}/pay`, {
        payments: values.payments,
      }),
    onSuccess: (_response, variables) => {
      invalidatePosQueries(queryClient, variables.orderId);
      toast({
        title: "Success",
        description: "Payment completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to process payment.",
      });
    },
  });
};

export const useCancelPosOrder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: OrderActionInput) =>
      api.post(`/pos/pos-orders/${values.orderId}/cancel`),
    onSuccess: (_response, variables) => {
      invalidatePosQueries(queryClient, variables.orderId);
      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to cancel order.",
      });
    },
  });
};

export const useRefundPosOrder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: OrderActionInput) =>
      api.post(`/pos/orders/${values.orderId}/refund`),
    onSuccess: (_response, variables) => {
      invalidatePosQueries(queryClient, variables.orderId);
      toast({
        title: "Success",
        description: "Order refunded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to refund order.",
      });
    },
  });
};
