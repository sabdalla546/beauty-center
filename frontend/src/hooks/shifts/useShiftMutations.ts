/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";

export interface OpenShiftInput {
  openingCashFils: number;
  notes?: string | null;
}

export interface CloseShiftInput {
  shiftId: number;
  closingCashKwd: number;
  notes?: string | null;
}

export interface ShiftSummaryInput {
  shiftId: number;
  to?: string;
}

export const useOpenShift = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: OpenShiftInput) =>
      api.post("/shifts/open", {
        openingCashFils: values.openingCashFils,
        notes: values.notes ?? null,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift opened successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["shift-open"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to open shift.",
      });
    },
  });
};

export const useCloseShift = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: CloseShiftInput) =>
      api.post(`/shifts/${values.shiftId}/close`, {
        closingCashKwd: values.closingCashKwd,
        notes: values.notes ?? null,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift closed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["shift-open"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to close shift.",
      });
    },
  });
};

export const useShiftSummary = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: ShiftSummaryInput) =>
      api.post(`/shifts/${values.shiftId}/summary`, {
        to: values.to || undefined,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Summary loaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to load summary.",
      });
    },
  });
};
