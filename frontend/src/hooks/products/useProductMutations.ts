/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface ProductFormValues {
  sku?: string | null;
  name?: string;
  barcode?: string | null;
  costKwd?: number;
  priceKwd?: number;
  currentQty?: number;
  image?: File | null;
}

const buildProductFormData = (values: ProductFormValues) => {
  const formData = new FormData();

  if (values.sku !== undefined && values.sku !== null) {
    formData.append("sku", values.sku);
  }
  if (values.name !== undefined) {
    formData.append("name", values.name);
  }
  if (values.barcode !== undefined && values.barcode !== null) {
    formData.append("barcode", values.barcode);
  }
  if (values.costKwd !== undefined && values.costKwd !== null) {
    formData.append("costKwd", String(values.costKwd));
  }
  if (values.priceKwd !== undefined && values.priceKwd !== null) {
    formData.append("priceKwd", String(values.priceKwd));
  }
  if (values.currentQty !== undefined && values.currentQty !== null) {
    formData.append("currentQty", String(values.currentQty));
  }
  if (values.image) {
    formData.append("image", values.image);
  }

  return formData;
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: ProductFormValues) =>
      api.post("/products", buildProductFormData(values)),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/inventory/products");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create product.",
      });
    },
  });
};

export const useUpdateProduct = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: ProductFormValues) => {
      if (!id) {
        throw new Error("Product id is required");
      }
      return api.put(`/products/${id}`, buildProductFormData(values));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/inventory/products");
    },
    onError: (error: any) => {
      console.log(error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update product.",
      });
    },
  });
};

export const useAdjustProductStock = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: {
      id: number;
      change: number;
      reason: string;
      referenceId?: string;
    }) =>
      api.post(`/products/${payload.id}/adjust-stock`, {
        change: payload.change,
        reason: payload.reason,
        referenceId: payload.referenceId ?? null,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stock adjusted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to adjust stock.",
      });
    },
  });
};
