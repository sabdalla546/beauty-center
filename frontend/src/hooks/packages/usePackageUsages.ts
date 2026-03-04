import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { PackageUsagesResponse } from "@/pages/packages/types";

interface UsePackageUsagesParams {
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const usePackageUsages = ({
  customerId,
  dateFrom,
  dateTo,
}: UsePackageUsagesParams) => {
  return useQuery<PackageUsagesResponse>({
    queryKey: ["package-usages", customerId, dateFrom, dateTo],
    queryFn: () =>
      api
        .get("/packages/usages", {
          params: {
            customerId: customerId ?? undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
        .then((res) => res.data),
  });
};
