import { api, normalizePaginated } from "@/core/lib/api-client";
import type { PaginatedResponse } from "@19er/types";
import type { PayrollRecord } from "@/features/payroll/types";
import { useQuery } from "@tanstack/react-query";

export function useMyPayroll() {
  return useQuery({
    queryKey: ["my-payroll"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<PayrollRecord>>("/me/payroll", {
        params: { limit: 50 },
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 50).items;
    },
  });
}

export function usePayrollRecord(id: string | undefined) {
  const list = useMyPayroll();
  return {
    ...list,
    data: list.data?.find((p) => p.id === id),
    isLoading: list.isLoading,
    error: list.error ?? (!list.isLoading && id && !list.data?.find((p) => p.id === id) ? new Error("Not found") : null),
  };
}
