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

type ApiErrorShape = {
  response?: {
    data?: {
      error?: {
        message?: string;
        code?: string;
        details?: any;
      };
      message?: string;
    };
  };
};

export type PosPayErrorDetails = {
  remainingFils?: number;
  incomingSum?: number;
  orderTotalFils?: number;
  paidFilsBefore?: number;
  packageCoveredFils?: number;
};

export const getApiErrorInfo = (error: ApiErrorShape) => {
  const apiError = error?.response?.data?.error;
  return {
    code: apiError?.code,
    details: apiError?.details,
    message:
      apiError?.message ||
      error?.response?.data?.message ||
      "Unexpected error.",
  };
};

const toKwd = (fils: unknown) => {
  const n = Number(fils);
  if (!Number.isFinite(n)) return null;
  return (n / 1000).toFixed(3);
};

const buildPayErrorDescription = (error: ApiErrorShape) => {
  const info = getApiErrorInfo(error);

  if (info.code === "pos.overpay_not_allowed") {
    const d = (info.details || {}) as PosPayErrorDetails;
    const remaining = toKwd(d.remainingFils);
    const incoming = toKwd(d.incomingSum);
    const packageCovered = toKwd(d.packageCoveredFils);

    const parts = [info.message];
    if (remaining !== null) parts.push(`Remaining: ${remaining} KWD`);
    if (incoming !== null) parts.push(`Entered: ${incoming} KWD`);
    if (packageCovered !== null && Number(d.packageCoveredFils || 0) > 0) {
      parts.push(`Package covered: ${packageCovered} KWD`);
    }
    return parts.join(" | ");
  }

  return info.message || "Failed to process payment.";
};

const invalidatePosQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  orderId?: number,
) => {
  queryClient.invalidateQueries({ queryKey: ["pos-orders"] });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: ["pos-order", orderId] });
  }
};
export const isOverpayError = (error: ApiErrorShape) => {
  const info = getApiErrorInfo(error);
  const d = (info.details || {}) as PosPayErrorDetails;

  const hasNumbers =
    Number.isFinite(Number(d.remainingFils)) &&
    Number.isFinite(Number(d.incomingSum));

  const msg = String(info.message || "").toLowerCase();
  const looksLikeOverpay =
    msg.includes("cannot exceed remaining") ||
    msg.includes("overpay") ||
    msg.includes("remaining amount");

  // ✅ accept either correct code OR wrong code but with details/message
  return (
    info.code === "pos.overpay_not_allowed" || hasNumbers || looksLikeOverpay
  );
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
      // ✅ do not show toast for overpay; UI will auto-retry

      if (isOverpayError(error)) return;
      console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: buildPayErrorDescription(error),
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
