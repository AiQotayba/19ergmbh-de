import { api, normalizePaginated } from "@/core/lib/api-client";
import type { PaginatedResponse } from "@19er/types";
import type { PayrollRecord } from "@/features/payroll/types";
import type { ShiftAssignment } from "@/features/schedule/types";
import { upcomingShiftsParams } from "@/features/schedule/hooks/useMyShifts";
import { useQuery } from "@tanstack/react-query";

export function useHomeData() {
  const shiftsQuery = useQuery({
    queryKey: ["home-shifts"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ShiftAssignment>>("/me/shifts", {
        params: upcomingShiftsParams(),
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 10).items;
    },
  });

  const payrollQuery = useQuery({
    queryKey: ["home-payroll"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<PayrollRecord>>("/me/payroll", {
        params: { limit: 1 },
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 1).items[0] ?? null;
    },
  });

  return {
    shifts: shiftsQuery.data ?? [],
    latestPayroll: payrollQuery.data ?? null,
    isLoading: shiftsQuery.isLoading || payrollQuery.isLoading,
    error: shiftsQuery.error ?? payrollQuery.error,
  };
}
