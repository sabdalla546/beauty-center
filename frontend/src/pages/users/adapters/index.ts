import type { User, UsersResponse } from "../types";

type TableUsersResult = {
  data: { users: User[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const withFullName = (user: User): User => {
  if (user.fullName) return user;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return {
    ...user,
    fullName: fullName || user.email,
  };
};

export const toTableUsers = (
  payload?: UsersResponse | null,
): TableUsersResult => {
  if (!payload) {
    return {
      data: { users: [] },
      total: 0,
      totalPages: 1,
      page: 1,
      limit: 10,
    };
  }

  const users = Array.isArray(payload.data)
    ? payload.data.map(withFullName)
    : [];
  const meta = payload.meta || { page: 1, limit: users.length, total: 0 };
  const total = Number(meta.total ?? users.length) || 0;
  const limit = Number(meta.limit ?? users.length) || 10;
  const page = Number(meta.page ?? 1) || 1;
  const totalPages =
    Number((meta as any).pages) || Math.max(1, Math.ceil(total / limit));

  return {
    data: { users },
    total,
    totalPages,
    page,
    limit,
  };
};
