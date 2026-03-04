import type { Staff, StaffListResponse } from "../types";

type TableStaffResult = {
  data: { staff: Staff[] };
  total: number;
  totalPages: number;
  page: number;
  limit: number;
};

const withDisplayName = (staff: Staff): Staff => {
  if (staff.displayName) return staff;
  const user = staff.user || staff.User;
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const fallback = fullName || user?.email || null;
  return {
    ...staff,
    displayName: fallback,
  };
};

export const toTableStaff = (
  payload?: StaffListResponse | null,
): TableStaffResult => {
  if (!payload) {
    return {
      data: { staff: [] },
      total: 0,
      totalPages: 1,
      page: 1,
      limit: 10,
    };
  }

  const staff = Array.isArray(payload.data)
    ? payload.data.map(withDisplayName)
    : [];
  const meta = payload.meta || { page: 1, limit: staff.length, total: 0 };
  const total = Number(meta.total ?? staff.length) || 0;
  const limit = Number(meta.limit ?? staff.length) || 10;
  const page = Number(meta.page ?? 1) || 1;
  const totalPages =
    Number((meta as any).pages) || Math.max(1, Math.ceil(total / limit));

  return {
    data: { staff },
    total,
    totalPages,
    page,
    limit,
  };
};
