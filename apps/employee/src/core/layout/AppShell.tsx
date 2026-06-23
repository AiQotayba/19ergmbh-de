import { useI18n } from "@/core/i18n";
import { useAuth } from "@/core/providers/AuthProvider";
import { cn } from "@/core/lib/utils";
import { CalendarDays, Home, LogOut, User, Wallet } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { LanguageSwitcher } from "@/core/ui/language-switcher";

const navItems = [
  { to: "/", icon: Home, labelKey: "nav.home" },
  { to: "/schedule", icon: CalendarDays, labelKey: "nav.schedule" },
  { to: "/payroll", icon: Wallet, labelKey: "nav.payroll" },
  { to: "/profile", icon: User, labelKey: "nav.profile" },
] as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <img src="/icon-192.png" alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
              <p className="truncate text-sm font-bold text-foreground">19er GmbH</p>
            </div>
            <p className="truncate text-xs text-muted">{user?.fullName}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-accent-soft/50"
              aria-label={t("common.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-surface/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors",
                  isActive ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground",
                )
              }
            >
              <Icon className="h-5 w-5" />
              {t(labelKey)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
