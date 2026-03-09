import type { Customer } from "@/pages/customers/types";
import type { Service } from "@/pages/services/types";
import type { Staff } from "@/pages/staff/types";
import type { Room } from "@/pages/rooms/types";
import type { PosOrder } from "@/pages/pos/types";
import type { CustomerPackage } from "@/pages/packages/types";

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "checked_in"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled"
  | string;

export type AppointmentSourceType =
  | "single_service"
  | "package"
  | "complimentary"
  | "adjustment"
  | string;

export interface Appointment {
  id: number;
  customerId: number;
  serviceId: number;
  staffId?: number | null;
  roomId?: number | null;
  sourceType?: AppointmentSourceType | null;
  sourceId?: number | null;
  customerPackageId?: number | null;
  startAt: string;
  endAt: string;
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  actualStaffId?: number | null;
  actualRoomId?: number | null;
  completedBy?: number | null;
  status: AppointmentStatus;
  notes?: string | null;
  internalNotes?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: number | null;
  cancelReason?: string | null;
  noShowMarkedAt?: string | null;
  noShowMarkedBy?: number | null;
  rescheduledFromAppointmentId?: number | null;
  checkoutOrderId?: number | null;
  checkedOutAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  customer?: Customer | null;
  service?: Service | null;
  staff?: Staff | null;
  actualStaff?: Staff | null;
  room?: Room | null;
  actualRoom?: Room | null;
  customerPackage?: CustomerPackage | null;
}

export interface AppointmentCalendarResponse {
  data: Appointment[];
}

export interface AppointmentCheckoutResponse {
  data: {
    order: PosOrder | null;
    appointmentId: number;
    checkoutOrderId?: number | null;
    checkedOutAt?: string | null;
  };
}
