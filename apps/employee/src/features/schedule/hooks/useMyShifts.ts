import { api, normalizePaginated } from "@/core/lib/api-client";
import type { PaginatedResponse } from "@19er/types";
import type { ShiftAssignment } from "@/features/schedule/types";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export function useMyShifts(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["my-shifts", params],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ShiftAssignment>>("/me/shifts", { params });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 100).items;
    },
  });
}

export function useMyShift(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ["my-shift", assignmentId],
    enabled: Boolean(assignmentId),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ShiftAssignment>>("/me/shifts", {
        params: { limit: 200, fromDate: "2000-01-01", toDate: "2099-12-31" },
      });
      if (res.isError) throw new Error(res.message);
      const item = normalizePaginated(res.data, 1, 200).items.find((a) => a.id === assignmentId);
      if (!item) throw new Error("Shift not found");
      return item;
    },
  });
}

export function upcomingShiftsParams() {
  const today = format(new Date(), "yyyy-MM-dd");
  return { fromDate: today, limit: 10, sort_field: "date", sort_order: "asc" };
}
