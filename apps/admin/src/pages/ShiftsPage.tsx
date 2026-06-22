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
import { PageHeader } from "@/components/layouts/PageHeader";
import { AssignedEmployeesBadges } from "@/components/shifts/AssignedEmployeesBadges";
import { CreateShiftDialog } from "@/components/shifts/CreateShiftDialog";
import { EditShiftDialog, type EditShiftRow } from "@/components/shifts/EditShiftDialog";
import { ShiftDateBadges } from "@/components/shifts/ShiftDateBadges";
import { ShiftTimeBadges } from "@/components/shifts/ShiftTimeBadges";
import { resolveShiftFromApi } from "@/components/shifts/shift-form-utils";
import { DataTable, type TableColumn } from "@/components/tables/DataTable";
import { useTableUrlFilters } from "@/hooks/use-table-url-filters";
import { useI18n } from "@/i18n";
import { api, normalizePaginated } from "@/lib/api-client";
import type { PaginatedResponse } from "@19er/types";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

export function ShiftsPage() {
  const { t, locale } = useI18n();
  const tableFilters = useTableUrlFilters();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<EditShiftRow | null>(null);
  const [sendingScheduleId, setSendingScheduleId] = useState<string | null>(null);

  const fromDate = tableFilters.get("fromDate");
  const toDate = tableFilters.get("toDate");
  const employeeFilter = tableFilters.get("employeeId");

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
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
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
        }
      />

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
