import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { PasswordInput } from "@/components/ui/password-input";
import { useI18n } from "@/i18n";
import { useAuth } from "@/providers/AuthProvider";
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
    <div className="flex min-h-screen bg-app">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[#0f1d35]" />
        <div className="absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -left-10 bottom-1/4 h-48 w-48 rounded-full bg-accent/10 blur-2xl" />

        <div className="relative z-10">
          <img src="/logo.png" alt="19er GmbH" className="h-28 w-32 object-contain p-4 bg-amber-50 rounded-2xl" />
          <h1 className="mt-10 text-4xl leading-tight">
            {t("login.heroTitle")}
            <br />
            <span className="text-accent">{t("login.heroSubtitle")}</span>
          </h1>
          <p className="mt-4 max-w-sm text-white/75">{t("login.heroDesc")}</p>
          <div className="mt-8 flex items-center gap-3">
            <div className="h-px w-8 bg-accent" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              {t("login.tagline")}
            </p>
            <div className="h-px w-8 bg-accent" />
          </div>
        </div>
        <p className="relative z-10 text-sm text-white/50">© 19er GmbH</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="mb-6 w-full max-w-md">
          <LanguageSwitcher className="justify-end" />
        </div>
        <Card className="w-full max-w-md border-0 shadow-[var(--shadow-float)]">
          <CardHeader className="text-center">
            <img
              src="/logo.png"
              alt="19er GmbH"
              className="mx-auto mb-4 h-16 w-16 object-contain lg:hidden"
            />
            <CardTitle className="brand-title text-2xl">
              <span className="brand-title-navy">{t("login.title")}</span>
            </CardTitle>
            <CardDescription>{t("login.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
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
