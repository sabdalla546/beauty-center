/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";

export interface AppointmentCheckoutInput {
  appointmentId: number;
  products?: Array<{ productId: number; qty: number }>;
  discountFils?: number;
  taxFils?: number;
  notes?: string | null;
}

export const useAppointmentCheckout = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: AppointmentCheckoutInput) =>
      api.post(`/appointments/${values.appointmentId}/checkout`, {
        products: values.products ?? [],
        discountFils: values.discountFils ?? 0,
        taxFils: values.taxFils ?? 0,
        notes: values.notes ?? null,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment checked out successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to checkout appointment.",
      });
    },
  });
};
