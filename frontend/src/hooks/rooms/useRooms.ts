import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { Room, RoomsResponse } from "@/pages/rooms/types";

interface UseRoomsParams {
  searchQuery: string;
  roomTypeId?: number;
  status?: string;
}

export const useRooms = ({ searchQuery, roomTypeId, status }: UseRoomsParams) => {
  return useQuery<RoomsResponse>({
    queryKey: ["rooms", searchQuery, roomTypeId, status],
    queryFn: () =>
      api
        .get("/rooms", {
          params: {
            q: searchQuery || undefined,
            roomTypeId: roomTypeId || undefined,
            status: status || undefined,
          },
        })
        .then((res) => res.data),
  });
};

export const useRoomFromList = (id?: string, rooms?: Room[]) => {
  if (!id || !rooms?.length) return undefined;
  return rooms.find((room) => String(room.id) === String(id));
};
