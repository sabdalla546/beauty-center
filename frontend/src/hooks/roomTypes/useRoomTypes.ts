import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { RoomType } from "@/pages/rooms/types";

export const useRoomTypes = () => {
  return useQuery<{ data: RoomType[] }>({
    queryKey: ["room-types"],
    queryFn: () => api.get("/room-types").then((res) => res.data),
  });
};
