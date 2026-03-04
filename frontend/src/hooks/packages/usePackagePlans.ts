import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { PackagePlan, PackagePlansResponse } from "@/pages/packages/types";

interface UsePackagePlansParams {
  searchQuery?: string;
  isActive?: boolean | null;
}

const normalizePlan = (plan: PackagePlan): PackagePlan => {
  const priceFils = Number(plan.priceFils ?? plan.priceCents ?? 0);
  const priceKwd = Number(
    plan.priceKwd ?? (Number.isFinite(priceFils) ? priceFils / 1000 : 0),
  );
  return {
    ...plan,
    priceFils,
    priceKwd,
    priceCents:
      Number.isFinite(priceFils) && priceFils > 0 ? priceFils : plan.priceCents,
  };
};

export const usePackagePlans = ({
  searchQuery,
  isActive,
}: UsePackagePlansParams) => {
  return useQuery<PackagePlansResponse>({
    queryKey: ["package-plans", searchQuery, isActive],
    queryFn: () =>
      api
        .get("/packages/plans", {
          params: {
            q: searchQuery || undefined,
            isActive: isActive === null ? undefined : isActive,
          },
        })
        .then((res) => {
          const payload = res.data as PackagePlansResponse;
          const plans = Array.isArray(payload?.data)
            ? payload.data.map(normalizePlan)
            : [];
          return {
            ...payload,
            data: plans,
          };
        }),
  });
};
