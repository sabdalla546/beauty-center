export interface UserRole {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName?: string;
  role?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  roles?: UserRole[];
}

export interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface UserFormData {
  id?: number;
  email: string;
  firstName: string;
  lastName?: string;
  roleId: number;
  password?: string;
  roles?: UserRole[];
}
