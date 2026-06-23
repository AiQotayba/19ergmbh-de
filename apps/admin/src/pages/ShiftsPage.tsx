import { AssignedEmployeesBadges } from "@/components/shifts/AssignedEmployeesBadges";
import { CreateShiftDialog } from "@/components/shifts/CreateShiftDialog";
import { EditShiftDialog, type EditShiftRow } from "@/components/shifts/EditShiftDialog";
import { ShiftFlexibleCalendar } from "@/components/shifts/ShiftFlexibleCalendar";
import {
  calendarSpanRange,
  expandShiftsToOccurrences,
  parseCalendarAnchor,
  parseCalendarSpan,
  type ShiftViewMode,
} from "@/components/shifts/shift-calendar-utils";
import { ShiftDateBadges } from "@/components/shifts/ShiftDateBadges";
import { ShiftTimeBadges } from "@/components/shifts/ShiftTimeBadges";
import { resolveShiftFromApi } from "@/components/shifts/shift-form-utils";
import { PageHeader } from "@/components/layouts/PageHeader";
import { DataTable, type TableColumn } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { useTableUrlFilters } from "@/hooks/use-table-url-filters";
import { useI18n } from "@/i18n";
import { api, normalizePaginated } from "@/lib/api-client";
import type { PaginatedResponse } from "@19er/types";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

export function ShiftsPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableFilters = useTableUrlFilters();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<EditShiftRow | null>(null);
  const [sendingScheduleId, setSendingScheduleId] = useState<string | null>(null);

  const viewMode: ShiftViewMode =
    searchParams.get("view") === "calendar" ? "calendar" : "table";
  const calendarSpan = parseCalendarSpan(searchParams.get("calSpan"));
  const calendarAnchor = parseCalendarAnchor(searchParams.get("calAnchor") ?? undefined);

  const fromDate = tableFilters.get("fromDate");
  const toDate = tableFilters.get("toDate");
  const employeeFilter = tableFilters.get("employeeId");

  const calendarRange = useMemo(
    () => calendarSpanRange(calendarAnchor, calendarSpan),
    [calendarAnchor, calendarSpan],
  );

  function setViewMode(next: ShiftViewMode) {
    const params = new URLSearchParams(searchParams);
    if (next === "table") {
      params.delete("view");
      params.delete("calSpan");
      params.delete("calAnchor");
    } else {
      params.set("view", "calendar");
      if (!params.get("calSpan")) params.set("calSpan", "week");
      if (!params.get("calAnchor")) {
        params.set("calAnchor", new Date().toISOString().slice(0, 10));
      }
    }
    setSearchParams(params, { replace: true });
  }

  function setCalendarAnchor(next: Date) {
    const params = new URLSearchParams(searchParams);
    params.set("calAnchor", next.toISOString().slice(0, 10));
    setSearchParams(params, { replace: true });
  }

  function setCalendarSpan(next: typeof calendarSpan) {
    const params = new URLSearchParams(searchParams);
    params.set("calSpan", next);
    setSearchParams(params, { replace: true });
  }

  const { data: employees } = useQuery({
    queryKey: ["employees-for-shifts"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<UserOption>>("/admin/users", {
        params: { role: "EMPLOYEE", limit: 100, isActive: "true" },
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 100).items;
    },
  });

  const { data: calendarShifts, isLoading: calendarLoading } = useQuery({
    queryKey: [
      "shifts-calendar",
      calendarRange.fromDate,
      calendarRange.toDate,
      employeeFilter,
    ],
    enabled: viewMode === "calendar",
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: 200,
        fromDate: calendarRange.fromDate,
        toDate: calendarRange.toDate,
      };
      if (employeeFilter) params.employeeId = employeeFilter;
      const res = await api.get<PaginatedResponse<EditShiftRow>>("/shifts", { params });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 200).items;
    },
  });

  const occurrences = useMemo(
    () =>
      expandShiftsToOccurrences(
        calendarShifts ?? [],
        calendarRange.fromDate,
        calendarRange.toDate,
      ),
    [calendarShifts, calendarRange.fromDate, calendarRange.toDate],
  );

  async function sendSchedule(shiftId: string) {
    setSendingScheduleId(shiftId);
    try {
      const res = await api.post(
        "/notifications/send-schedule",
        { shiftId },
        { showSuccessToast: false },
      );
      if (res.isError) throw new Error(res.message);
      toast.success(t("shifts.scheduleSent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSendingScheduleId(null);
    }
  }

  const columns: TableColumn<EditShiftRow>[] = [
    { key: "title", label: t("shifts.shiftTitle"), sortable: true, render: (v) => String(v || "—") },
    {
      key: "start",
      label: t("shifts.dateRange"),
      sortable: true,
      render: (_, row) => {
        const schedule = resolveShiftFromApi(row);
        return <ShiftDateBadges fromDate={schedule.fromDate} toDate={schedule.toDate} />;
      },
    },
    {
      key: "startTime",
      label: t("shifts.dailySchedule"),
      sortable: true,
      render: (_, row) => {
        const schedule = resolveShiftFromApi(row);
        return (
          <ShiftTimeBadges
            dailyStartTime={schedule.dailyStartTime}
            dailyEndTime={schedule.dailyEndTime}
          />
        );
      },
    },
    { key: "breakMinutes", label: t("shifts.break") },
    {
      key: "status",
      label: t("shifts.status"),
      sortable: true,
      render: (v) => <Badge variant="outline">{String(v)}</Badge>,
    },
    {
      key: "employees",
      label: t("shifts.assigned"),
      render: (_, row) => (
        <AssignedEmployeesBadges
          names={row.employees?.map((e) => e.employee.fullName) ?? []}
          maxVisible={4}
        />
      ),
    },
    {
      key: "notify",
      label: t("shifts.sendSchedule"),
      render: (_, row) => {
        const hasEmployees = (row.employees?.length ?? 0) > 0;
        const busy = sendingScheduleId === row.id;
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={!hasEmployees || busy}
            onClick={() => void sendSchedule(row.id)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("shifts.sendSchedule")}
          </Button>
        );
      },
    },
  ];

  function openCreate() {
    setCreateOpen(true);
  }

  function openEdit(row: EditShiftRow) {
    setEditingShift(row);
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("shifts.title")} description={t("shifts.description")} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={viewMode}
          onChange={(id) => setViewMode(id as ShiftViewMode)}
          tabs={[
            { id: "table", label: t("shifts.viewTable") },
            { id: "calendar", label: t("shifts.viewCalendar") },
          ]}
        />
        {viewMode === "calendar" && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("shifts.addShift")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {viewMode === "table" && (
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
        )}
        <Select
          dir={locale === "ar" ? "rtl" : "ltr"}
          value={employeeFilter || "all"}
          onValueChange={(value) =>
            tableFilters.set({ employeeId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("shifts.allEmployees")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("shifts.allEmployees")}</SelectItem>
            {employees?.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TabPanel active={viewMode} id="table">
        <DataTable<EditShiftRow>
          columns={columns}
          apiEndpoint="/shifts"
          queryKeyPrefix="shifts-table"
          apiFilterKeys={["fromDate", "toDate", "employeeId"]}
          onAdd={openCreate}
          addLabel={t("shifts.addShift")}
          searchPlaceholder={t("shifts.searchPlaceholder")}
          deleteDescription={(row) =>
            t("shifts.deleteConfirm", { title: row.title || t("shifts.untitled") })
          }
          actions={{ onEdit: openEdit }}
          enableView={false}
        />
      </TabPanel>

      <TabPanel active={viewMode} id="calendar">
        <ShiftFlexibleCalendar
          anchor={calendarAnchor}
          span={calendarSpan}
          onAnchorChange={setCalendarAnchor}
          onSpanChange={setCalendarSpan}
          occurrences={occurrences}
          loading={calendarLoading}
          onSelectShift={openEdit}
        />
      </TabPanel>

      <CreateShiftDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditShiftDialog
        shift={editingShift}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingShift(null);
        }}
      />
    </div>
  );
}
