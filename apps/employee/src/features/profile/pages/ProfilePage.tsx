import { InstallAppCard } from "@/core/pwa/InstallAppCard";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { PasswordInput } from "@/core/ui/password-input";
import { PhoneNumberInput } from "@/core/ui/phone-input";
import { Skeleton } from "@/core/ui/skeleton";
import { TabPanel, Tabs } from "@/core/ui/tabs";
import { api } from "@/core/lib/api-client";
import type { AuthUser } from "@/core/lib/auth-storage";
import { useI18n } from "@/core/i18n";
import { useAuth } from "@/core/providers/AuthProvider";
import type { UpdateProfileRequest } from "@19er/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("account");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const res = await api.get<AuthUser>("/me", { showErrorToast: false });
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
      const res = await api.put<AuthUser>("/me", values satisfies UpdateProfileRequest, {
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

  if (isLoading) return <Skeleton className="h-64 w-full rounded-card" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("profile.title")}</h1>

      <InstallAppCard />

      {profile?.hourlyRate != null && (
        <Card>
          <CardContent className="flex justify-between py-4 text-sm">
            <span className="text-muted">{t("profile.hourlyRate")}</span>
            <span className="font-bold">€{profile.hourlyRate.toFixed(2)}</span>
          </CardContent>
        </Card>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "account", label: t("profile.account") },
          { id: "password", label: t("profile.password") },
        ]}
      />

      <TabPanel active={tab} id="account">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("profile.account")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void profileForm.handleSubmit(onProfileSubmit)(e)} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("profile.fullName")}</Label>
                <Input {...profileForm.register("fullName")} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.email")}</Label>
                <Input type="email" {...profileForm.register("email")} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.phone")}</Label>
                <Controller
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneNumberInput value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
              {profileForm.formState.errors.root && (
                <p className="text-sm text-red-600">{profileForm.formState.errors.root.message}</p>
              )}
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel active={tab} id="password">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("profile.changePassword")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void passwordForm.handleSubmit(onPasswordSubmit)(e)} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("profile.currentPassword")}</Label>
                <PasswordInput {...passwordForm.register("currentPassword")} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.newPassword")}</Label>
                <PasswordInput {...passwordForm.register("newPassword")} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.confirmPassword")}</Label>
                <PasswordInput {...passwordForm.register("confirmPassword")} />
              </div>
              {passwordForm.formState.errors.root && (
                <p className="text-sm text-red-600">{passwordForm.formState.errors.root.message}</p>
              )}
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : t("profile.changePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
