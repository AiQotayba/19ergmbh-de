import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { AttendanceStatus, PaginatedResponse } from "@19er/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface AttendanceRow {
  id: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
  employee: { id: string; fullName: string; email: string };
  shift: { id: string; title: string | null; startTime: string };
}

const statusVariant: Record<string, "success" | "destructive" | "warning" | "outline"> = {
  PRESENT: "success",
  ABSENT: "destructive",
  LATE: "warning",
};

const ATTENDANCE_STATUS_FILTERS = new Set(["PRESENT", "ABSENT", "LATE"]);

export function AttendancePage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const tableFilters = useTableUrlFilters();
  const [absentOpen, setAbsentOpen] = useState(false);
  const [shiftId, setShiftId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rawStatusFilter = tableFilters.get("status");
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

  const { data: shifts } = useQuery({
    queryKey: ["shifts-for-absent"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<{ id: string; title: string | null; startTime: string }>>(
        "/shifts",
        { params: { limit: 50 } },
      );
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 50).items;
    },
    enabled: absentOpen,
  });

  const { data: absentEmployees } = useQuery({
    queryKey: ["employees-for-absent"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<{ id: string; fullName: string }>>("/admin/users", {
        params: { role: "EMPLOYEE", limit: 100 },
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 100).items;
    },
    enabled: absentOpen,
  });

  const columns: TableColumn<AttendanceRow>[] = [
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
      render: (_, row) => format(new Date(row.shift.startTime), "MMM d, yyyy"),
    },
    {
      key: "shift",
      label: t("attendance.shift"),
      render: (_, row) =>
        `${row.shift.title || t("shifts.untitled")} — ${format(new Date(row.shift.startTime), "HH:mm")}`,
    },
    {
      key: "status",
      label: t("attendance.status"),
      render: (v) => (
        <Badge variant={statusVariant[String(v)] ?? "outline"}>{String(v)}</Badge>
      ),
    },
    {
      key: "checkin",
      label: t("attendance.checkIn"),
      sortable: true,
      render: (_, row) => (row.checkIn ? format(new Date(row.checkIn), "MMM d, HH:mm") : "—"),
    },
    {
      key: "checkout",
      label: t("attendance.checkOut"),
      sortable: true,
      render: (_, row) => (row.checkOut ? format(new Date(row.checkOut), "MMM d, HH:mm") : "—"),
    },
    { key: "notes", label: t("attendance.notes"), render: (v) => String(v || "—") },
  ];

  async function markAbsent() {
    if (!shiftId || !employeeId) return;
    setSubmitting(true);
    try {
      const res = await api.post(
        "/attendance/absent",
        { shiftId, employeeId, notes: notes || undefined },
        { showSuccessToast: true, successMessage: "Marked absent" },
      );
      if (res.isError) throw new Error(res.message);
      setAbsentOpen(false);
      setShiftId("");
      setEmployeeId("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["attendance-table"] });
    } finally {
      setSubmitting(false);
    }
  }

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

      <DataTable<AttendanceRow>
        columns={columns}
        apiEndpoint="/attendance"
        queryKeyPrefix="attendance-table"
        apiFilterKeys={["status", "fromDate", "toDate", "employeeId"]}
        enableActions={false}
        searchPlaceholder={t("attendance.searchPlaceholder")}
        toolbar={
          <>
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={statusFilter || "all"}
              onValueChange={(value) => tableFilters.set({ status: value === "all" ? null : value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t("attendance.allStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("attendance.allStatus")}</SelectItem>
                <SelectItem value="PRESENT">{t("attendance.present")}</SelectItem>
                <SelectItem value="ABSENT">{t("attendance.absent")}</SelectItem>
                <SelectItem value="LATE">{t("attendance.late")}</SelectItem>
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
            <Button onClick={() => setAbsentOpen(true)}>{t("attendance.markAbsent")}</Button>
          </>
        }
      />

      <Dialog open={absentOpen} onOpenChange={setAbsentOpen}>
        <DialogContent onClose={() => setAbsentOpen(false)}>
          <DialogHeader>
            <DialogTitle>{t("attendance.markEmployeeAbsent")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("attendance.shift")}</Label>
              <Select
                dir={locale === "ar" ? "rtl" : "ltr"}
                value={shiftId || "none"}
                onValueChange={(value) => setShiftId(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("attendance.selectShift")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("attendance.selectShift")}</SelectItem>
                  {shifts?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title || t("shifts.untitled")} — {format(new Date(s.startTime), "MMM d, yyyy HH:mm")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("attendance.employee")}</Label>
              <Select
                dir={locale === "ar" ? "rtl" : "ltr"}
                value={employeeId || "none"}
                onValueChange={(value) => setEmployeeId(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("attendance.selectEmployee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("attendance.selectEmployee")}</SelectItem>
                  {absentEmployees?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("attendance.notesOptional")}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsentOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!shiftId || !employeeId || submitting} onClick={() => void markAbsent()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("attendance.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
