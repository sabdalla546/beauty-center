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
  sourceType?: string | null;
  sourceId?: number | null;
  customerPackageId?: number | null;
  startAt: string;
  endAt?: string;
  status?: string;
  notes?: string | null;
  internalNotes?: string | null;
}

export interface AppointmentAssignmentValues {
  actualStaffId?: number | null;
  actualRoomId?: number | null;
}

export interface AppointmentCancelValues {
  cancelReason: string;
}

export interface AppointmentRescheduleValues {
  newStartAt: string;
  newEndAt?: string;
  staffId?: number | null;
  roomId?: number | null;
  reason?: string | null;
  status?: "booked" | "confirmed";
}

const invalidateAppointmentQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({ queryKey: ["appointments-calendar"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
};

const buildAppointmentPayload = (
  values: AppointmentFormValues,
  options?: { includeStatus?: boolean },
) => {
  const payload: Record<string, any> = {
    customerId: values.customerId,
    serviceId: values.serviceId,
    staffId: values.staffId ?? null,
    roomId: values.roomId ?? null,
    sourceType: values.sourceType || "single_service",
    sourceId: values.sourceId ?? null,
    customerPackageId:
      values.sourceType === "package" ? values.customerPackageId ?? null : null,
    startAt: values.startAt,
    notes: values.notes ?? null,
    internalNotes: values.internalNotes ?? null,
  };

  if (values.endAt) {
    payload.endAt = values.endAt;
  }

  if (options?.includeStatus && values.status) {
    payload.status = values.status;
  }

  return payload;
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: AppointmentFormValues) =>
      api.post(
        "/appointments",
        buildAppointmentPayload(values, { includeStatus: true }),
      ),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });
      invalidateAppointmentQueries(queryClient);
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
      invalidateAppointmentQueries(queryClient);
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
      invalidateAppointmentQueries(queryClient);
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

const useAppointmentWorkflowAction = <TInput,>(
  id: number | string | undefined,
  endpoint: string,
  successMessage: string,
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: TInput) => {
      if (!id) {
        throw new Error("Appointment id is required");
      }
      return api.post(`/appointments/${id}/${endpoint}`, values ?? {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: successMessage,
      });
      invalidateAppointmentQueries(queryClient);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Appointment action failed.",
      });
    },
  });
};

export const useConfirmAppointment = (id?: number | string) =>
  useAppointmentWorkflowAction<Record<string, never>>(
    id,
    "confirm",
    "Appointment confirmed successfully",
  );

export const useCheckInAppointment = (id?: number | string) =>
  useAppointmentWorkflowAction<Record<string, never>>(
    id,
    "check-in",
    "Appointment checked in successfully",
  );

export const useStartAppointmentService = (id?: number | string) =>
  useAppointmentWorkflowAction<AppointmentAssignmentValues>(
    id,
    "start",
    "Service started successfully",
  );

export const useCompleteAppointment = (id?: number | string) =>
  useAppointmentWorkflowAction<AppointmentAssignmentValues>(
    id,
    "complete",
    "Appointment completed successfully",
  );

export const useCancelAppointment = (id?: number | string) =>
  useAppointmentWorkflowAction<AppointmentCancelValues>(
    id,
    "cancel",
    "Appointment cancelled successfully",
  );

export const useMarkAppointmentNoShow = (id?: number | string) =>
  useAppointmentWorkflowAction<Record<string, never>>(
    id,
    "no-show",
    "Appointment marked as no-show",
  );

export const useRescheduleAppointment = (id?: number | string) =>
  useAppointmentWorkflowAction<AppointmentRescheduleValues>(
    id,
    "reschedule",
    "Appointment rescheduled successfully",
  );
