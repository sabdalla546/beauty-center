/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface ServiceFormValues {
  code?: string | null;
  name: string;
  durationMinutes: number;
  priceKwd: number;
  requiredRoomTypeId?: number | null;
  image?: File | null;
}

const buildServiceFormData = (values: ServiceFormValues) => {
  const formData = new FormData();

  if (values.code !== undefined && values.code !== null) {
    formData.append("code", values.code);
  }
  if (values.name !== undefined) {
    formData.append("name", values.name);
  }
  if (values.durationMinutes !== undefined && values.durationMinutes !== null) {
    formData.append("durationMinutes", String(values.durationMinutes));
  }
  if (values.priceKwd !== undefined && values.priceKwd !== null) {
    formData.append("priceKwd", String(values.priceKwd));
  }
  if (
    values.requiredRoomTypeId !== undefined &&
    values.requiredRoomTypeId !== null
  ) {
    formData.append("requiredRoomTypeId", String(values.requiredRoomTypeId));
  }
  if (values.image) {
    formData.append("image", values.image);
  }

  return formData;
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: ServiceFormValues) =>
      api.post("/services", buildServiceFormData(values)),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Service created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      navigate("/services");
    },
    onError: (error: any) => {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create service.",
      });
    },
  });
};

export const useUpdateService = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: ServiceFormValues) => {
      if (!id) {
        throw new Error("Service id is required");
      }
      return api.put(`/services/${id}`, buildServiceFormData(values));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Service updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      navigate("/services");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update service.",
      });
    },
  });
};
