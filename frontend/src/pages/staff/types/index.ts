export interface StaffUser {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface Staff {
  id: number;
  displayName?: string | null;
  commissionPercent?: number | string | null;
  skills?: Record<string, unknown> | null;
  user?: StaffUser | null;
  User?: StaffUser | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface StaffListResponse {
  message?: string;
  data: Staff[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages?: number;
  };
}

export interface StaffDetailsResponse {
  message?: string;
  staff: Staff;
}
