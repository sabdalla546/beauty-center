import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { PaymentMethod } from "@/pages/paymentMethods/types";

interface UsePaymentMethodsParams {
  activeOnly?: boolean;
}

export const usePaymentMethods = ({ activeOnly = true }: UsePaymentMethodsParams = {}) => {
  return useQuery<PaymentMethod[]>({
    queryKey: ["payment-methods", activeOnly ? "active" : "all"],
    queryFn: () =>
      api
        .get(activeOnly ? "/payment-methods/active" : "/payment-methods")
        .then((res) => {
          const payload = res.data || {};
          return Array.isArray(payload.data) ? payload.data : [];
        }),
  });
};
