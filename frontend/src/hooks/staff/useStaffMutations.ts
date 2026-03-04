/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface StaffFormValues {
  userId?: number;
  displayName?: string;
  commissionPercent?: number;
  skills?: Record<string, unknown>;
}

export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: StaffFormValues) =>
      api.post("/staff", {
        userId: values.userId,
        displayName: values.displayName,
        commissionPercent: values.commissionPercent,
        skills: values.skills,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      navigate("/staff");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create staff.",
      });
    },
  });
};

export const useUpdateStaff = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: StaffFormValues) => {
      if (!id) {
        throw new Error("Staff id is required");
      }
      return api.put(`/staff/${id}`, {
        displayName: values.displayName,
        commissionPercent: values.commissionPercent,
        skills: values.skills,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      if (id) queryClient.invalidateQueries({ queryKey: ["staff-member", id] });
      navigate("/staff");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update staff.",
      });
    },
  });
};
