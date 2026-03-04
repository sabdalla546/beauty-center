import type { Role, RolesResponse } from "../types";

type TableRolesResult = {
  data: { roles: Role[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const matchesSearch = (role: Role, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const name = role.name?.toLowerCase() || "";
  const description = role.description?.toLowerCase() || "";
  const permNames =
    role.permissions?.map((p) => p.name?.toLowerCase() || "").join(" ") || "";

  return (
    name.includes(q) ||
    description.includes(q) ||
    permNames.includes(q)
  );
};

export const toTableRoles = (
  payload: RolesResponse | null | undefined,
  page: number,
  limit: number,
  searchQuery: string,
): TableRolesResult => {
  const roles = payload?.roles ?? [];
  const filtered = searchQuery
    ? roles.filter((role) => matchesSearch(role, searchQuery))
    : roles;

  const total = filtered.length;
  const safeLimit = Math.max(1, limit || 10);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  const paged = filtered.slice(start, start + safeLimit).map((role) => ({
    ...role,
    permissionsCount: role.permissions?.length ?? 0,
  }));

  return {
    data: { roles: paged },
    total,
    totalPages,
    page: safePage,
    limit: safeLimit,
  };
};
