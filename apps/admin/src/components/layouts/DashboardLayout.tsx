import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  UserCircle,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

const navItems: Array<{
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}> = [
    { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    { to: "/users", labelKey: "nav.users", icon: Users },
    { to: "/shifts", labelKey: "nav.shifts", icon: CalendarDays },
    { to: "/attendance", labelKey: "nav.attendance", icon: ClipboardList },
    { to: "/payroll", labelKey: "nav.payroll", icon: Wallet },
    { to: "/notifications", labelKey: "nav.notifications", icon: Bell },
  ];

const SIDEBAR_KEY = "19er-sidebar-collapsed";

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { t, dir } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  async function handleLogoutConfirm() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  }

  const sidebarSide = dir === "rtl" ? "right" : "left";
  const borderSide = dir === "rtl" ? "border-l" : "border-r";

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 z-50 flex h-full flex-col border-border/60 bg-sidebar py-5 shadow-[var(--shadow-soft)] transition-all duration-300 lg:static",
          borderSide,
          "border-border/60",
          collapsed ? "w-[72px]" : "w-64",
          mobileOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarSide === "right" ? "right-0" : "left-0",
        )}
      >
        <div className={cn("flex shrink-0 items-center px-4", collapsed ? "justify-center" : "justify-between gap-2")}>
          <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && "justify-center")}>
            <img
              src="/logo.png"
              alt="19er GmbH"
              className={cn("shrink-0 object-contain", collapsed ? "h-10 w-10" : "h-12 w-12")}
            />
            {!collapsed && (
              <div className="min-w-0">
                <p className="brand-title truncate text-base leading-tight">
                  <span className="brand-title-navy">19er </span>
                  <span className="brand-title-orange">GmbH</span>
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-muted">
                  Logistik & Transport
                </p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden shrink-0 text-muted lg:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {dir === "rtl" ? (
              collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-3">
          {navItems.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={t(labelKey)}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-primary text-white shadow-[var(--shadow-soft)]"
                    : "text-muted hover:bg-accent-soft hover:text-primary",
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{t(labelKey)}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={cn("mt-auto shrink-0 space-y-3 border-t border-border/60 px-3 pt-4", collapsed && "flex flex-col items-center")}>
          {!collapsed && <LanguageSwitcher className="px-1" />}
          {user && (
            <Link to="/profile" className={cn("flex items-center gap-3", collapsed && "justify-center")}>
              <Avatar name={user.fullName} size="md" />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{user.fullName}</p>
                  <p className="truncate text-xs text-muted">{user.role}</p>
                </div>
              )}
            </Link>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-muted hover:bg-red-50 hover:text-red-600",
              collapsed && "justify-center px-0",
            )}
            onClick={() => setLogoutOpen(true)}
            title={t("common.logout")}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t("common.logout")}</span>}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-surface/80 px-5 backdrop-blur-sm lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="ms-auto flex items-center gap-3">
            <LanguageSwitcher className="lg:hidden" />
            <Link to="/profile" className="hover:text-primary transition-colors duration-200 group hover:bg-primary rounded-xl p-2">
              <p className="hidden items-center gap-2 text-end sm:flex text-sm font-bold text-foreground group-hover:text-white">
                <User className="h-4 w-4 shrink-0" />
                {user?.fullName}</p>
            </Link>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent onClose={() => setLogoutOpen(false)} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("common.confirmLogout")}</DialogTitle>
            <DialogDescription>{t("common.confirmLogoutMessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)} disabled={loggingOut}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" disabled={loggingOut} onClick={() => void handleLogoutConfirm()}>
              {loggingOut ? t("common.loading") : t("common.logout")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
