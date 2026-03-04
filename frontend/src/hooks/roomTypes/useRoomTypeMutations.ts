/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";

export interface RoomTypeFormValues {
  name: string;
  requiresPrivate?: boolean;
}

export const useCreateRoomType = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: RoomTypeFormValues) =>
      api.post("/room-types", {
        name: values.name,
        requiresPrivate: values.requiresPrivate ?? false,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room type created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["room-types"] });
      navigate("/rooms/types");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create room type.",
      });
    },
  });
};

export const useUpdateRoomType = (id?: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: RoomTypeFormValues) => {
      if (!id) {
        throw new Error("Room type id is required");
      }
      return api.put(`/room-types/${id}`, {
        name: values.name,
        requiresPrivate: values.requiresPrivate ?? false,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room type updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["room-types"] });
      navigate("/rooms/types");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update room type.",
      });
    },
  });
};
