/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface CustomerFormValues {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: CustomerFormValues) =>
      api.post("/customers", {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      navigate("/customers");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create customer.",
      });
    },
  });
};

export const useUpdateCustomer = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: CustomerFormValues) => {
      if (!id) {
        throw new Error("Customer id is required");
      }
      return api.put(`/customers/${id}`, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (id) queryClient.invalidateQueries({ queryKey: ["customer", id] });
      navigate("/customers");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update customer.",
      });
    },
  });
};
