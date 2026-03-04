import type { Room, RoomsResponse } from "../types";

type TableRoomsResult = {
  data: { rooms: Room[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const matchesSearch = (room: Room, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = room.name?.toLowerCase() || "";
  const status = room.status?.toLowerCase() || "";
  const roomType = room.roomType?.name?.toLowerCase() || "";
  return name.includes(q) || status.includes(q) || roomType.includes(q);
};

export const toTableRooms = (
  payload: RoomsResponse | null | undefined,
  page: number,
  limit: number,
  searchQuery: string,
): TableRoomsResult => {
  const rooms = payload?.data ?? [];
  const filtered = searchQuery
    ? rooms.filter((room) => matchesSearch(room, searchQuery))
    : rooms;

  const total = filtered.length;
  const safeLimit = Math.max(1, limit || 10);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  const paged = filtered.slice(start, start + safeLimit);

  return {
    data: { rooms: paged },
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};
