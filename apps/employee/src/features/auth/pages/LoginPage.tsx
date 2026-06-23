import { Button } from "@/core/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { LanguageSwitcher } from "@/core/ui/language-switcher";
import { PasswordInput } from "@/core/ui/password-input";
import { useI18n } from "@/core/i18n";
import { useAuth } from "@/core/providers/AuthProvider";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-app lg:flex-row">
      <div className="relative hidden flex-1 flex-col justify-between bg-primary p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-[#0f1d35]" />
        <div className="relative z-10">
          <img
            src="/logo.png"
            alt="19er GmbH"
            className="h-28 w-32 rounded-2xl bg-accent-soft object-contain p-4"
          />
          <h1 className="mt-10 text-3xl font-bold leading-tight">
            {t("login.heroTitle")}
            <br />
            <span className="text-accent">{t("login.heroSubtitle")}</span>
          </h1>
          <p className="mt-4 max-w-sm text-white/75">{t("login.heroDesc")}</p>
        </div>
        <p className="relative z-10 text-sm text-white/50">{t("login.tagline")}</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="mb-4 w-full max-w-md">
          <LanguageSwitcher className="justify-end" />
        </div>
        <Card className="w-full max-w-md border-0 shadow-[var(--shadow-float)]">
          <CardHeader className="text-center">
            <img
              src="/logo.png"
              alt="19er GmbH"
              className="mx-auto mb-4 h-16 w-16 object-contain lg:hidden"
            />
            <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
            <CardDescription>{t("login.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
