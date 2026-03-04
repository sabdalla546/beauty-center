export interface Permission {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  permissions?: Permission[];
  permissionsCount?: number;
}

export interface RolesResponse {
  message?: string;
  roles: Role[];
}

export interface PermissionsResponse {
  message?: string;
  permissions: Permission[];
}
