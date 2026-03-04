import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  CustomerPackage,
  CustomerPackagesResponse,
} from "@/pages/packages/types";

interface UseCustomerPackagesParams {
  customerId?: number;
  onlyUsable?: boolean;
  includeInactive?: boolean;
  serviceId?: number | null;
}

const normalizeRow = (row: CustomerPackage): CustomerPackage => {
  const total = Number(row.totalSessions ?? 0);
  const used = Number(row.usedSessions ?? 0);
  const remaining = Math.max(0, total - used);
  return {
    ...row,
    remainingSessions: row.remainingSessions ?? remaining,
  };
};

export const useCustomerPackages = ({
  customerId,
  onlyUsable,
  includeInactive,
  serviceId,
}: UseCustomerPackagesParams) => {
  return useQuery<CustomerPackagesResponse>({
    queryKey: [
      "customer-packages",
      customerId,
      onlyUsable,
      includeInactive,
      serviceId,
    ],
    queryFn: () =>
      api
        .get(`/packages/customers/${customerId}`, {
          params: {
            onlyUsable: onlyUsable === undefined ? undefined : onlyUsable,
            includeInactive:
              includeInactive === undefined ? undefined : includeInactive,
            serviceId: serviceId ?? undefined,
          },
        })
        .then((res) => {
          const payload = res.data as CustomerPackagesResponse;
          const rows = Array.isArray(payload?.data)
            ? payload.data.map(normalizeRow)
            : [];
          return {
            ...payload,
            data: rows,
          };
        }),
    enabled: !!customerId,
  });
};
