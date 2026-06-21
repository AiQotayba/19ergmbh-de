import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberStepper } from "@/components/ui/number-stepper";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layouts/PageHeader";
import { DataTable, type TableColumn } from "@/components/tables/DataTable";
import { useTableUrlFilters } from "@/hooks/use-table-url-filters";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api-client";
import type { CreateUserRequest, UpdateUserRequest, UserRole } from "@19er/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  hourlyRate: number;
  isActive: boolean;
}

const createUserSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  hourlyRate: z.coerce.number().min(0),
  isActive: z.boolean(),
});

const editUserSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  hourlyRate: z.coerce.number().min(0),
  isActive: z.boolean(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

const USER_IS_ACTIVE_FILTERS = new Set(["true", "false"]);

export function UsersPage() {
  const { t , locale } = useI18n();
  const queryClient = useQueryClient();
  const tableFilters = useTableUrlFilters();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const rawIsActiveFilter = tableFilters.get("isActive");
  const isActiveFilter = USER_IS_ACTIVE_FILTERS.has(rawIsActiveFilter) ? rawIsActiveFilter : "";

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "EMPLOYEE",
      hourlyRate: 15,
      isActive: true,
    },
  });

  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "EMPLOYEE",
      hourlyRate: 15,
      isActive: true,
    },
  });

  const columns: TableColumn<UserRow>[] = useMemo(
    () => [
      { key: "name", label: t("users.name"), sortable: true, render: (_, row) => row.fullName },
      { key: "email", label: t("users.email"), sortable: true },
      { key: "phone", label: t("users.phone") },
      {
        key: "role",
        label: t("users.role"),
        sortable: true,
        render: (v) => (
          <Badge variant={v === "ADMIN" ? "info" : "outline"}>
            {v === "ADMIN" ? t("users.admin") : t("users.employee")}
          </Badge>
        ),
      },
      {
        key: "hourlyRate",
        label: t("users.hourlyRate"),
        sortable: true,
        render: (v) => `€${Number(v).toFixed(2)}`,
      },
      {
        key: "isActive",
        label: t("users.status"),
        sortable: true,
        render: (_, row) => (
          <Badge variant={row.isActive ? "success" : "destructive"}>
            {row.isActive ? t("common.active") : t("common.inactive")}
          </Badge>
        ),
      },
    ],
    [t],
  );

  function openCreate() {
    setEditing(null);
    createForm.reset({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "EMPLOYEE",
      hourlyRate: 15,
      isActive: true,
    });
    setDialogOpen(true);
  }

  function openEdit(row: UserRow) {
    setEditing(row);
    editForm.reset({
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      role: row.role,
      hourlyRate: row.hourlyRate,
      isActive: row.isActive,
    });
    setDialogOpen(true);
  }

  async function onCreateSubmit(values: CreateUserFormValues) {
    setSaving(true);
    try {
      const payload: CreateUserRequest = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: values.role,
        hourlyRate: values.hourlyRate,
        isActive: values.isActive,
      };
      const res = await api.post("/admin/users", payload, {
        showSuccessToast: true,
        successMessage: "User created",
      });
      if (res.isError) throw new Error(res.message);
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users-table"] });
    } catch (err) {
      createForm.setError("root", { message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onEditSubmit(values: EditUserFormValues) {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: UpdateUserRequest = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        role: values.role,
        hourlyRate: values.hourlyRate,
        isActive: values.isActive,
      };
      const res = await api.put(`/admin/users/${editing.id}`, payload, {
        showSuccessToast: true,
        successMessage: "User updated",
      });
      if (res.isError) throw new Error(res.message);
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users-table"] });
    } catch (err) {
      editForm.setError("root", { message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("users.title")} description={t("users.description")} />

      <DataTable<UserRow>
        columns={columns}
        apiEndpoint="/admin/users"
        queryKeyPrefix="users-table"
        apiFilterKeys={["isActive"]}
        onAdd={openCreate}
        addLabel={t("users.addUser")}
        searchPlaceholder={t("users.searchPlaceholder")}
        deleteDescription={(row) => t("users.deleteConfirm", { name: row.fullName })}
        actions={{ onEdit: openEdit }}
        enableView={false}
        toolbar={
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted whitespace-nowrap">{t("users.status")}</Label>
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={isActiveFilter || "all"}
              onValueChange={(value) => tableFilters.set({ isActive: value === "all" ? null : value })}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("users.allStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.allStatus")}</SelectItem>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("users.editUser") : t("users.createUser")}</DialogTitle>
          </DialogHeader>

          {editing ? (
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("users.fullName")}</Label>
                  <Input {...editForm.register("fullName")} />
                  {editForm.formState.errors.fullName && (
                    <p className="text-xs text-red-600">{editForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("users.email")}</Label>
                  <Input type="email" {...editForm.register("email")} />
                  {editForm.formState.errors.email && (
                    <p className="text-xs text-red-600">{editForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("users.phone")}</Label>
                  <Controller
                    name="phone"
                    control={editForm.control}
                    render={({ field }) => (
                      <PhoneNumberInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("users.role")}</Label>
                  <Controller
                    name="role"
                    control={editForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">{t("users.employee")}</SelectItem>
                          <SelectItem value="ADMIN">{t("users.admin")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("users.hourlyRateLabel")}</Label>
                  <Controller
                    name="hourlyRate"
                    control={editForm.control}
                    render={({ field }) => (
                      <NumberStepper value={field.value} onChange={field.onChange} step={0.5} />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 sm:col-span-2">
                  <Label htmlFor="edit-active">{t("users.activeAccount")}</Label>
                  <Controller
                    name="isActive"
                    control={editForm.control}
                    render={({ field }) => (
                      <Switch id="edit-active" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
              {editForm.formState.errors.root && (
                <p className="text-sm text-red-600">{editForm.formState.errors.root.message}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("users.fullName")}</Label>
                  <Input {...createForm.register("fullName")} />
                  {createForm.formState.errors.fullName && (
                    <p className="text-xs text-red-600">{createForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("users.email")}</Label>
                  <Input type="email" {...createForm.register("email")} />
                  {createForm.formState.errors.email && (
                    <p className="text-xs text-red-600">{createForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("users.phone")}</Label>
                  <Controller
                    name="phone"
                    control={createForm.control}
                    render={({ field }) => (
                      <PhoneNumberInput value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("users.password")}</Label>
                  <PasswordInput {...createForm.register("password")} />
                  {createForm.formState.errors.password && (
                    <p className="text-xs text-red-600">{createForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("users.role")}</Label>
                  <Controller
                    name="role"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">{t("users.employee")}</SelectItem>
                          <SelectItem value="ADMIN">{t("users.admin")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("users.hourlyRateLabel")}</Label>
                  <Controller
                    name="hourlyRate"
                    control={createForm.control}
                    render={({ field }) => (
                      <NumberStepper value={field.value} onChange={field.onChange} step={0.5} />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 sm:col-span-2">
                  <Label htmlFor="create-active">{t("users.activeAccount")}</Label>
                  <Controller
                    name="isActive"
                    control={createForm.control}
                    render={({ field }) => (
                      <Switch id="create-active" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
              {createForm.formState.errors.root && (
                <p className="text-sm text-red-600">{createForm.formState.errors.root.message}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.create")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
