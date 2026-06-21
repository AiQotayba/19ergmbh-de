import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layouts/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user, isLoading, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: PasswordForm) {
    setSaving(true);
    try {
      const res = await api.put(
        "/auth/change-password",
        { currentPassword: values.currentPassword, newPassword: values.newPassword },
        { showSuccessToast: true, successMessage: "Password changed" },
      );
      if (res.isError) throw new Error(res.message);
      form.reset();
      await refreshProfile();
    } catch (err) {
      form.setError("root", { message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full max-w-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account information" />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>My profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted">Name</span>
            <span className="font-medium">{user?.fullName}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted">Phone</span>
            <span className="font-medium">{user?.phone || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted">Role</span>
            <Badge variant="info">{user?.role}</Badge>
          </div>
          {user?.hourlyRate != null && (
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted">Hourly rate</span>
              <span className="font-medium">€{user.hourlyRate.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" {...form.register("currentPassword")} />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" {...form.register("newPassword")} />
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input type="password" {...form.register("confirmPassword")} />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-red-600">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            {form.formState.errors.root && (
              <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
