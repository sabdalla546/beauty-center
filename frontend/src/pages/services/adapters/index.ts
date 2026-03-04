import type { Service, ServicesResponse } from "../types";

type TableServicesResult = {
  data: { services: Service[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const matchesSearch = (service: Service, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = service.name?.toLowerCase() || "";
  const code = service.code?.toLowerCase() || "";
  const roomType = service.requiredRoomType?.name?.toLowerCase() || "";
  return name.includes(q) || code.includes(q) || roomType.includes(q);
};

export const toTableServices = (
  payload: ServicesResponse | null | undefined,
  page: number,
  limit: number,
  searchQuery: string,
): TableServicesResult => {
  const services = payload?.data ?? [];
  const filtered = searchQuery
    ? services.filter((service) => matchesSearch(service, searchQuery))
    : services;

  const total = filtered.length;
  const safeLimit = Math.max(1, limit || 10);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  const paged = filtered.slice(start, start + safeLimit);

  return {
    data: { services: paged },
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};
