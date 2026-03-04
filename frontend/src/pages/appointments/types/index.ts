import type { Customer } from "@/pages/customers/types";
import type { Service } from "@/pages/services/types";
import type { Staff } from "@/pages/staff/types";
import type { Room } from "@/pages/rooms/types";
import type { PosOrder } from "@/pages/pos/types";

export type AppointmentStatus =
  | "booked"
  | "checked_in"
  | "in_service"
  | "completed"
  | "cancelled"
  | "no_show"
  | string;

export interface Appointment {
  id: number;
  customerId: number;
  serviceId: number;
  staffId?: number | null;
  roomId?: number | null;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  customer?: Customer | null;
  service?: Service | null;
  staff?: Staff | null;
  room?: Room | null;
}

export interface AppointmentCalendarResponse {
  data: Appointment[];
}

export interface AppointmentCheckoutResponse {
  data: {
    order: PosOrder | null;
    appointmentId: number;
  };
}
