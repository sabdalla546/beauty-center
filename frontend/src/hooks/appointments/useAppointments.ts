import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { AppointmentCalendarResponse } from "@/pages/appointments/types";

interface UseAppointmentsCalendarParams {
  from?: string;
  to?: string;
  staffId?: number | null;
  roomId?: number | null;
}

export const useAppointmentsCalendar = ({
  from,
  to,
  staffId,
  roomId,
}: UseAppointmentsCalendarParams) => {
  return useQuery<AppointmentCalendarResponse>({
    queryKey: ["appointments-calendar", from, to, staffId, roomId],
    queryFn: () =>
      api
        .get("/appointments/calendar", {
          params: {
            from,
            to,
            staffId: staffId || undefined,
            roomId: roomId || undefined,
          },
        })
        .then((res) => res.data),
    enabled: Boolean(from && to),
  });
};
