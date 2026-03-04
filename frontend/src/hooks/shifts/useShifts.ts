import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ShiftOpenResponse } from "@/pages/shifts/types";

interface UseMyOpenShiftOptions {
  enabled?: boolean;
}

export const useMyOpenShift = (options: UseMyOpenShiftOptions = {}) => {
  return useQuery<ShiftOpenResponse>({
    queryKey: ["shift-open"],
    queryFn: () => api.get("/shifts/me/open").then((res) => res.data),
    enabled: options.enabled ?? true,
  });
};
