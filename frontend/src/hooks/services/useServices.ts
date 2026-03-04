import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { Service, ServicesResponse } from "@/pages/services/types";

interface UseServicesParams {
  searchQuery: string;
}

export const useServices = ({ searchQuery }: UseServicesParams) => {
  return useQuery<ServicesResponse>({
    queryKey: ["services", searchQuery],
    queryFn: () =>
      api
        .get("/services", {
          params: {
            q: searchQuery || undefined,
          },
        })
        .then((res) => {
          const payload = res.data as ServicesResponse;
          const services = Array.isArray(payload?.data)
            ? payload.data.map((service) => {
                const priceFils = Number(
                  (service as any).priceFils ?? service.priceCents ?? 0,
                );
                const priceKwd = Number(
                  service.priceKwd ??
                    (Number.isFinite(priceFils) ? priceFils / 1000 : 0),
                );
                return {
                  ...service,
                  priceKwd,
                  priceCents:
                    Number.isFinite(priceFils) && priceFils > 0
                      ? priceFils
                      : Math.round(priceKwd * 1000),
                };
              })
            : [];

          return {
            ...payload,
            data: services,
          };
        }),
  });
};

export const useServiceFromList = (id?: string, services?: Service[]) => {
  if (!id || !services?.length) return undefined;
  return services.find((service) => String(service.id) === String(id));
};
