/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface AppointmentFormValues {
  customerId: number;
  serviceId: number;
  staffId?: number | null;
  roomId?: number | null;
  startAt: string;
  endAt?: string;
  status?: string;
  notes?: string | null;
}

const buildAppointmentPayload = (values: AppointmentFormValues) => {
  const payload: Record<string, any> = {
    customerId: values.customerId,
    serviceId: values.serviceId,
    staffId: values.staffId ?? null,
    roomId: values.roomId ?? null,
    startAt: values.startAt,
    status: values.status || undefined,
    notes: values.notes ?? null,
  };

  if (values.endAt) {
    payload.endAt = values.endAt;
  }

  return payload;
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: AppointmentFormValues) =>
      api.post("/appointments", buildAppointmentPayload(values)),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["appointments-calendar"] });
      navigate("/appointments");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create appointment.",
      });
    },
  });
};

export const useUpdateAppointment = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: AppointmentFormValues) => {
      if (!id) {
        throw new Error("Appointment id is required");
      }
      return api.put(`/appointments/${id}`, buildAppointmentPayload(values));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["appointments-calendar"] });
      navigate("/appointments");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update appointment.",
      });
    },
  });
};

export const useUpdateAppointmentStatus = (id?: number) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (status: string) => {
      if (!id) {
        throw new Error("Appointment id is required");
      }
      return api.patch(`/appointments/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["appointments-calendar"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update appointment status.",
      });
    },
  });
};
