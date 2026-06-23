import { Navigate } from "react-router-dom";
import { useAuth } from "@/core/providers/AuthProvider";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/core/i18n";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
