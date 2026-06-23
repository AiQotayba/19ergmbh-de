import { ShiftDateBadges } from "@/components/shifts/ShiftDateBadges";
import { ShiftTimeBadges } from "@/components/shifts/ShiftTimeBadges";
import { resolveShiftFromApi } from "@/components/shifts/shift-form-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layouts/PageHeader";
import { DataTable, type TableColumn } from "@/components/tables/DataTable";
import { useTableUrlFilters } from "@/hooks/use-table-url-filters";
import { useI18n } from "@/i18n";
import { api, normalizePaginated } from "@/lib/api-client";
import type { PaginatedResponse, RosterStatus } from "@19er/types";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface RosterRow {
  id: string;
  shiftId: string;
  employeeId: string;
  status: string;
  attendanceStatus: RosterStatus;
  attendance: {
    id: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    notes: string | null;
  } | null;
  employee: { id: string; fullName: string; email: string };
  shift: {
    id: string;
    title: string | null;
    fromDate: string;
    toDate: string;
    dailyStartTime: string;
    dailyEndTime: string;
    startTime: string;
    endTime: string;
  };
}

const statusVariant: Record<string, "success" | "destructive" | "warning" | "outline" | "secondary"> = {
  PRESENT: "success",
  ON_DUTY: "success",
  ABSENT: "destructive",
  LATE: "warning",
  SCHEDULED: "outline",
  HOLIDAY: "outline",
};

const ATTENDANCE_STATUS_FILTERS = new Set([
  "ON_DUTY",
  "SCHEDULED",
  "PRESENT",
  "ABSENT",
  "LATE",
  "HOLIDAY",
]);

export function AttendancePage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const tableFilters = useTableUrlFilters();
  const [actionKey, setActionKey] = useState<string | null>(null);

  const rawStatusFilter = tableFilters.get("attendanceStatus");
  const statusFilter = ATTENDANCE_STATUS_FILTERS.has(rawStatusFilter) ? rawStatusFilter : "";
  const fromDate = tableFilters.get("fromDate");
  const toDate = tableFilters.get("toDate");
  const employeeFilter = tableFilters.get("employeeId");

  const { data: employees } = useQuery({
    queryKey: ["employees-for-attendance"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<{ id: string; fullName: string }>>("/admin/users", {
        params: { role: "EMPLOYEE", limit: 100 },
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 100).items;
    },
  });

  async function runAction(
    key: string,
    endpoint: "/attendance/absent" | "/attendance/holiday",
    row: RosterRow,
    successMessage: string,
  ) {
    setActionKey(key);
    try {
      const res = await api.post(
        endpoint,
        { shiftId: row.shiftId, employeeId: row.employeeId },
        { showSuccessToast: true, successMessage },
      );
      if (res.isError) throw new Error(res.message);
      queryClient.invalidateQueries({ queryKey: ["attendance-roster"] });
    } finally {
      setActionKey(null);
    }
  }

  const statusLabels: Record<string, string> = {
    SCHEDULED: t("attendance.scheduled"),
    ON_DUTY: t("attendance.onDuty"),
    PRESENT: t("attendance.present"),
    ABSENT: t("attendance.absent"),
    LATE: t("attendance.late"),
    HOLIDAY: t("attendance.holiday"),
  };

  const columns: TableColumn<RosterRow>[] = [
    {
      key: "employee",
      label: t("attendance.employee"),
      sortable: true,
      render: (_, row) => row.employee.fullName,
    },
    {
      key: "date",
      label: t("attendance.date"),
      sortable: true,
      render: (_, row) => {
        const schedule = resolveShiftFromApi(row.shift);
        return <ShiftDateBadges fromDate={schedule.fromDate} toDate={schedule.toDate} />;
      },
    },
    {
      key: "shift",
      label: t("attendance.shift"),
      render: (_, row) => {
        const schedule = resolveShiftFromApi(row.shift);
        return (
          <div className="flex flex-col gap-1">
            <span>{row.shift.title || t("shifts.untitled")}</span>
            <ShiftTimeBadges
              dailyStartTime={schedule.dailyStartTime}
              dailyEndTime={schedule.dailyEndTime}
            />
          </div>
        );
      },
    },
    {
      key: "attendanceStatus",
      label: t("attendance.status"),
      render: (_, row) => (
        <Badge variant={statusVariant[row.attendanceStatus] ?? "outline"}>
          {statusLabels[row.attendanceStatus] ?? row.attendanceStatus}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: t("attendance.actions"),
      render: (_, row) => {
        const key = `${row.shiftId}:${row.employeeId}`;
        const busy = actionKey === key;
        const isFinal = row.attendanceStatus === "ABSENT" || row.attendanceStatus === "HOLIDAY";
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isFinal || busy}
              onClick={() => void runAction(key, "/attendance/absent", row, t("attendance.markedAbsent"))}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("attendance.markAbsent")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isFinal || busy}
              onClick={() => void runAction(key, "/attendance/holiday", row, t("attendance.markedHoliday"))}
            >
              {t("attendance.markHoliday")}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("attendance.title")} description={t("attendance.description")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("attendance.helpTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">{t("attendance.helpText")}</p>
        </CardContent>
      </Card>

      <DataTable<RosterRow>
        columns={columns}
        apiEndpoint="/shift-employees"
        queryKeyPrefix="attendance-roster"
        apiFilterKeys={["attendanceStatus", "fromDate", "toDate", "employeeId"]}
        enableActions={false}
        searchPlaceholder={t("attendance.searchPlaceholder")}
        toolbar={
          <>
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={statusFilter || "all"}
              onValueChange={(value) =>
                tableFilters.set({ attendanceStatus: value === "all" ? null : value })
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("attendance.allStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("attendance.allStatus")}</SelectItem>
                <SelectItem value="ON_DUTY">{t("attendance.onDuty")}</SelectItem>
                <SelectItem value="SCHEDULED">{t("attendance.scheduled")}</SelectItem>
                <SelectItem value="PRESENT">{t("attendance.present")}</SelectItem>
                <SelectItem value="ABSENT">{t("attendance.absent")}</SelectItem>
                <SelectItem value="LATE">{t("attendance.late")}</SelectItem>
                <SelectItem value="HOLIDAY">{t("attendance.holiday")}</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker
              from={fromDate}
              to={toDate}
              onChange={(nextFrom, nextTo) => {
                tableFilters.set({
                  fromDate: nextFrom || null,
                  toDate: nextTo || null,
                });
              }}
              placeholder={t("shifts.dateRange")}
            />
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={employeeFilter || "all"}
              onValueChange={(value) =>
                tableFilters.set({ employeeId: value === "all" ? null : value })
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t("attendance.allEmployees")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("attendance.allEmployees")}</SelectItem>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
