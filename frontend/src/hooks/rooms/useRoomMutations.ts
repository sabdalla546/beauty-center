/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface RoomFormValues {
  name: string;
  roomTypeId?: number | null;
  capacity?: number;
  status?: string;
}

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: RoomFormValues) =>
      api.post("/rooms", {
        name: values.name,
        roomTypeId: values.roomTypeId,
        capacity: values.capacity,
        status: values.status,
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      navigate("/rooms");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to create room.",
      });
    },
  });
};

export const useUpdateRoom = (id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: RoomFormValues) => {
      if (!id) {
        throw new Error("Room id is required");
      }
      return api.put(`/rooms/${id}`, {
        name: values.name,
        roomTypeId: values.roomTypeId,
        capacity: values.capacity,
        status: values.status,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      navigate("/rooms");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          "Failed to update room.",
      });
    },
  });
};
