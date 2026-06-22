import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layouts/PageHeader";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneNumberInput } from "@/components/ui/phone-input";
import { Skeleton } from "@/components/ui/skeleton";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api-client";
import type { AuthUser } from "@/lib/auth-storage";
import { useAuth } from "@/providers/AuthProvider";
import type { UpdateProfileRequest } from "@19er/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type ProfileData = AuthUser & { createdAt?: string };

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-4 last:border-b-0">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <span className="text-end text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-20 rounded-card" />
      <Skeleton className="h-10 rounded-card" />
      <Skeleton className="h-56 rounded-card" />
    </div>
  );
}

export function ProfilePage() {
  const { user, isLoading: authLoading, refreshProfile } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("account");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const res = await api.get<ProfileData>("/me", { showErrorToast: false });
      if (res.isError || !res.data) throw new Error(res.message);
      return res.data;
    },
    enabled: !!user,
    initialData: user ?? undefined,
  });

  const profileSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
      }),
    [],
  );

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(6),
          newPassword: z.string().min(6),
          confirmPassword: z.string().min(6),
        })
        .refine((d) => d.newPassword === d.confirmPassword, {
          message: t("profile.passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  type ProfileForm = z.infer<typeof profileSchema>;
  type PasswordForm = z.infer<typeof passwordSchema>;

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", email: "", phone: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!profile) return;
    profileForm.reset({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone ?? "",
    });
  }, [profile, profileForm]);

  async function onProfileSubmit(values: ProfileForm) {
    setSavingProfile(true);
    try {
      const res = await api.put<ProfileData>("/me", values satisfies UpdateProfileRequest, {
        showSuccessToast: true,
        successMessage: t("profile.saved"),
      });
      if (res.isError || !res.data) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["me-profile"] });
      await refreshProfile();
    } catch (err) {
      profileForm.setError("root", { message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function onPasswordSubmit(values: PasswordForm) {
    setSavingPassword(true);
    try {
      const res = await api.put(
        "/auth/change-password",
        { currentPassword: values.currentPassword, newPassword: values.newPassword },
        { showSuccessToast: true, successMessage: t("profile.passwordChanged") },
      );
      if (res.isError) throw new Error(res.message);
      passwordForm.reset();
    } catch (err) {
      passwordForm.setError("root", { message: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSavingPassword(false);
    }
  }

  if (authLoading || profileLoading) {
    return <ProfileSkeleton />;
  }

  const roleLabel = profile?.role === "ADMIN" ? t("users.admin") : t("users.employee");
  const isActive = profile?.isActive !== false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("profile.title")} description={t("profile.description")} />

      <div className="flex items-center gap-4 rounded-card border border-border bg-surface px-5 py-4">
        {profile && <Avatar name={profile.fullName} className="h-14 w-14 text-base" />}
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">{profile?.fullName}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Badge variant="default">{roleLabel}</Badge>
            <Badge variant={isActive ? "success" : "destructive"}>
              {isActive ? t("common.active") : t("common.inactive")}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs
        className="flex w-full [&>button]:flex-1"
        tabs={[
          { id: "account", label: t("profile.accountDetails") },
          { id: "security", label: t("profile.security") },
        ]}
        value={tab}
        onChange={setTab}
      />

      <TabPanel active={tab} id="account">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("users.fullName")}</Label>
                <Input id="fullName" {...profileForm.register("fullName")} />
                {profileForm.formState.errors.fullName && (
                  <p className="text-sm text-red-600">
                    {profileForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("users.email")}</Label>
                <Input id="email" type="email" {...profileForm.register("email")} />
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t("users.phone")}</Label>
                <Controller
                  name="phone"
                  control={profileForm.control}
                  render={({ field }) => (
                    <PhoneNumberInput value={field.value} onChange={field.onChange} />
                  )}
                />
                {profileForm.formState.errors.phone && (
                  <p className="text-sm text-red-600">
                    {profileForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              {profileForm.formState.errors.root && (
                <p className="text-sm text-red-600">{profileForm.formState.errors.root.message}</p>
              )}

              <Button type="submit" disabled={savingProfile} className="w-full sm:w-auto">
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </form>
                
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel active={tab} id="security">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.changePassword")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("profile.currentPassword")}</Label>
                <PasswordInput id="currentPassword" {...passwordForm.register("currentPassword")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("profile.newPassword")}</Label>
                <PasswordInput id="newPassword" {...passwordForm.register("newPassword")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("profile.confirmPassword")}</Label>
                <PasswordInput id="confirmPassword" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {passwordForm.formState.errors.root && (
                <p className="text-sm text-red-600">{passwordForm.formState.errors.root.message}</p>
              )}

              <Button type="submit" disabled={savingPassword} className="w-full sm:w-auto">
                {savingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("profile.updatePassword")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
