import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import type { PaginatedResponse } from "@19er/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type EmployeePool = "all" | "unassigned" | "assigned" | "available";
type CreateEmployeePool = "all" | "unassigned" | "assigned";

const SHIFT_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

const shiftSchema = z.object({
  title: z.string().optional(),
  startDate: z.string().min(1),
  startTime: z.string().min(1),
  endDate: z.string().min(1),
  endTime: z.string().min(1),
  status: z.enum(SHIFT_STATUSES).optional(),
  breakMinutes: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

function splitDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

interface ShiftEmployee {
  id: string;
  employeeId: string;
  employee: { id: string; fullName: string; email: string };
}

interface ShiftRow {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
  status: string;
  employees: ShiftEmployee[];
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
}

export function ShiftsPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const tableFilters = useTableUrlFilters();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftRow | null>(null);
  const [assignShift, setAssignShift] = useState<ShiftRow | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeePool, setEmployeePool] = useState<EmployeePool>("all");
  const [createEmployeePool, setCreateEmployeePool] = useState<CreateEmployeePool>("all");
  const [createSelectedEmployees, setCreateSelectedEmployees] = useState<UserOption[]>([]);
  const [createPickEmployeeId, setCreatePickEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fromDate = tableFilters.get("fromDate");
  const toDate = tableFilters.get("toDate");
  const employeeFilter = tableFilters.get("employeeId");

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      title: "",
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "17:00",
      breakMinutes: 0,
      notes: "",
    },
  });

  function employeeQueryParams(pool: CreateEmployeePool | EmployeePool) {
    const params: Record<string, string | number> = {
      role: "EMPLOYEE",
      limit: 500,
      isActive: "true",
    };
    if (pool === "unassigned") params.assignment = "unassigned";
    else if (pool === "assigned") params.assignment = "assigned";
    return params;
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

  const { data: createFormEmployees } = useQuery({
    queryKey: ["employees-for-create-shift", createEmployeePool],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<UserOption>>("/admin/users", {
        params: employeeQueryParams(createEmployeePool),
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 500).items;
    },
    enabled: dialogOpen && !editing,
  });

  const { data: assignEmployees } = useQuery({
    queryKey: ["employees-for-assign", employeePool, assignShift?.id],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<UserOption>>("/admin/users", {
        params: employeeQueryParams(employeePool),
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 500).items;
    },
    enabled: assignOpen,
  });

  const createEmployeeOptions = useMemo(() => {
    const list = createFormEmployees ?? [];
    return list
      .filter((emp) => !createSelectedEmployees.some((selected) => selected.id === emp.id))
      .map((emp) => ({
        value: emp.id,
        label: `${emp.fullName} (${emp.email})`,
      }));
  }, [createFormEmployees, createSelectedEmployees]);

  const assignEmployeeOptions = useMemo(() => {
    let list = assignEmployees ?? [];
    if (employeePool === "available" && assignShift) {
      list = list.filter((emp) => !assignShift.employees?.some((e) => e.employeeId === emp.id));
    }
    return list.map((emp) => ({
      value: emp.id,
      label: `${emp.fullName} (${emp.email})`,
    }));
  }, [assignEmployees, assignShift, employeePool]);

  const columns: TableColumn<ShiftRow>[] = [
    { key: "title", label: t("shifts.shiftTitle"), sortable: true, render: (v) => String(v || "—") },
    {
      key: "start",
      label: t("shifts.start"),
      sortable: true,
      render: (_, row) => format(new Date(row.startTime), "MMM d, yyyy HH:mm"),
    },
    {
      key: "end",
      label: t("shifts.end"),
      sortable: true,
      render: (_, row) => format(new Date(row.endTime), "MMM d, yyyy HH:mm"),
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
      render: (_, row) =>
        row.employees?.length
          ? row.employees.map((e) => e.employee.fullName).join(", ")
          : "—",
    },
  ];

  function openCreate() {
    setEditing(null);
    setCreateEmployeePool("all");
    setCreateSelectedEmployees([]);
    setCreatePickEmployeeId("");
    form.reset({
      title: "",
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "17:00",
      breakMinutes: 0,
      notes: "",
    });
    setDialogOpen(true);
  }

  function openEdit(row: ShiftRow) {
    setEditing(row);
    const start = splitDatetime(row.startTime);
    const end = splitDatetime(row.endTime);
    form.reset({
      title: row.title ?? "",
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
      status: (SHIFT_STATUSES.includes(row.status as (typeof SHIFT_STATUSES)[number])
        ? row.status
        : "SCHEDULED") as ShiftFormValues["status"],
      breakMinutes: row.breakMinutes,
      notes: row.notes ?? "",
    });
    setDialogOpen(true);
  }

  function openAssign(row: ShiftRow) {
    setAssignShift(row);
    setSelectedEmployeeId("");
    setEmployeePool("all");
    setAssignOpen(true);
  }

  function addCreateEmployee(employeeId: string) {
    const employee = createFormEmployees?.find((emp) => emp.id === employeeId);
    if (!employee || createSelectedEmployees.some((emp) => emp.id === employeeId)) return;
    setCreateSelectedEmployees((prev) => [...prev, employee]);
    setCreatePickEmployeeId("");
  }

  function removeCreateEmployee(employeeId: string) {
    setCreateSelectedEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
  }

  async function onSubmit(values: ShiftFormValues) {
    setSaving(true);
    try {
      const payload = {
        title: values.title || undefined,
        startTime: combineDateTime(values.startDate, values.startTime),
        endTime: combineDateTime(values.endDate, values.endTime),
        breakMinutes: values.breakMinutes,
        notes: values.notes || undefined,
        ...(editing ? { status: values.status } : {}),
        ...(!editing && createSelectedEmployees.length > 0
          ? { employeeIds: createSelectedEmployees.map((emp) => emp.id) }
          : {}),
      };

      const res = editing
        ? await api.put(`/shifts/${editing.id}`, payload, {
          showSuccessToast: true,
          successMessage: "Shift updated",
        })
        : await api.post("/shifts", payload, {
          showSuccessToast: true,
          successMessage: "Shift created",
        });

      if (res.isError) throw new Error(res.message);
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["shifts-table"] });
    } catch (err) {
      form.setError("root", { message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    if (!assignShift || !selectedEmployeeId) return;
    setAssigning(true);
    try {
      const res = await api.post(
        "/shifts/assign",
        { shiftId: assignShift.id, employeeId: selectedEmployeeId },
        { showSuccessToast: true, successMessage: "Employee assigned" },
      );
      if (res.isError) throw new Error(res.message);
      setAssignOpen(false);
      queryClient.invalidateQueries({ queryKey: ["shifts-table"] });
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(shiftId: string, employeeId: string) {
    const res = await api.request(
      "DELETE",
      "/shifts/unassign",
      { shiftId, employeeId },
      { showSuccessToast: true, successMessage: "Employee unassigned" },
    );
    if (res.isError) throw new Error(res.message);
    queryClient.invalidateQueries({ queryKey: ["shifts-table"] });
    if (assignShift) {
      const refresh = await api.get<ShiftRow>(`/shifts/${assignShift.id}`);
      if (!refresh.isError && refresh.data) setAssignShift(refresh.data);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("shifts.title")} description={t("shifts.description")} />

      <DataTable<ShiftRow>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="max-w-md max-h-[90vh] overflow-y-auto  ">
          <DialogHeader>
            <DialogTitle>{editing ? t("shifts.editShift") : t("shifts.createShift")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("shifts.shiftTitle")}</Label>
              <Input {...form.register("title")} placeholder="Morning shift" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("shifts.startDate")}</Label>
                <Controller
                  name="startDate"
                  control={form.control}
                  render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("shifts.startTime")}</Label>
                <Input type="time" {...form.register("startTime")} />
              </div>
              <div className="space-y-2">
                <Label>{t("shifts.endDate")}</Label>
                <Controller
                  name="endDate"
                  control={form.control}
                  render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("shifts.endTime")}</Label>
                <Input type="time" {...form.register("endTime")} />
              </div>
            </div>
            {editing && (
              <div className="space-y-2">
                <Label>{t("shifts.status")}</Label>
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      dir={locale === "ar" ? "rtl" : "ltr"}
                      value={field.value ?? "SCHEDULED"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
            {!editing && (
              <div className="space-y-2">
                <Label>{t("shifts.assignEmployees")}</Label>
                <SearchableSelect
                  value={createPickEmployeeId}
                  onValueChange={(value) => {
                    setCreatePickEmployeeId(value);
                    addCreateEmployee(value);
                  }}
                  options={createEmployeeOptions}
                  placeholder={t("attendance.selectEmployee")}
                  searchPlaceholder={t("shifts.searchEmployees")}
                  emptyLabel={t("common.noData")}
                />
                {createSelectedEmployees.length > 0 && (
                  <ul className="space-y-1">
                    {createSelectedEmployees.map((emp) => (
                      <li
                        key={emp.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        {emp.fullName}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => removeCreateEmployee(emp.id)}
                        >
                          {t("common.delete")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("shifts.break")}</Label>
              <Input type="number" {...form.register("breakMinutes")} />
            </div>
            <div className="space-y-2">
              <Label>{t("attendance.notes")}</Label>
              <Input {...form.register("notes")} />
            </div>
            {form.formState.errors.root && (
              <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
            )}
            <DialogFooter className="flex-wrap gap-2">
              {editing && (
                <Button type="button" variant="secondary" onClick={() => openAssign(editing)}>
                  <UserPlus className="h-4 w-4" />
                  {t("shifts.assignEmployees")}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent onClose={() => setAssignOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("shifts.assignEmployees")}</DialogTitle>
          </DialogHeader>
          {assignShift && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                {assignShift.title || t("shifts.untitled")} —{" "}
                {format(new Date(assignShift.startTime), "MMM d, HH:mm")}
              </p>

              {assignShift.employees?.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("shifts.assigned")}</Label>
                  <ul className="space-y-1">
                    {assignShift.employees.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        {e.employee.fullName}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => void handleUnassign(assignShift.id, e.employeeId)}
                        >
                          {t("common.delete")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("users.employee")}</Label>
                <SearchableSelect
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  options={assignEmployeeOptions}
                  placeholder={t("attendance.selectEmployee")}
                  searchPlaceholder={t("shifts.searchEmployees")}
                  emptyLabel={t("common.noData")}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignOpen(false)}>
                  {t("common.close")}
                </Button>
                <Button disabled={!selectedEmployeeId || assigning} onClick={() => void handleAssign()}>
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {t("shifts.assignEmployees")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
