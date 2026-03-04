export interface PackagePlan {
  id: number;
  name: string;
  description?: string | null;
  priceCents?: number | null;
  priceFils?: number | null;
  priceKwd?: number | null;
  sessionsCount: number;
  validDays: number;
  serviceId?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackagePlansResponse {
  data: PackagePlan[];
}

export type CustomerPackageStatus =
  | "active"
  | "expired"
  | "used_up"
  | "cancelled";

export interface CustomerPackage {
  id: number;
  customerId: number;
  planId: number;
  startAt: string;
  expiresAt: string;
  status: CustomerPackageStatus;
  totalSessions: number;
  usedSessions: number;
  remainingSessions?: number;
  isExpired?: boolean;
  isUsable?: boolean;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  plan?: PackagePlan;
}

export interface CustomerPackagesResponse {
  data: CustomerPackage[];
}

export interface PackageUsage {
  id: number;
  customerPackageId: number;
  appointmentId?: number | null;
  orderItemId?: number | null;
  serviceId: number;
  qty: number;
  usedAt: string;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
  customerPackage?: CustomerPackage;
}

export interface PackageUsagesResponse {
  data: PackageUsage[];
}
