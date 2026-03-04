import type { RoomType, RoomTypesResponse } from "../types";

type TableRoomTypesResult = {
  data: { roomTypes: RoomType[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const matchesSearch = (roomType: RoomType, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = roomType.name?.toLowerCase() || "";
  return name.includes(q);
};

export const toTableRoomTypes = (
  payload: RoomTypesResponse | null | undefined,
  page: number,
  limit: number,
  searchQuery: string,
): TableRoomTypesResult => {
  const roomTypes = payload?.data ?? [];
  const filtered = searchQuery
    ? roomTypes.filter((roomType) => matchesSearch(roomType, searchQuery))
    : roomTypes;

  const total = filtered.length;
  const safeLimit = Math.max(1, limit || 10);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  const paged = filtered.slice(start, start + safeLimit);

  return {
    data: { roomTypes: paged },
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};
