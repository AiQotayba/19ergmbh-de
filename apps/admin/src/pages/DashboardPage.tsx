import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/layouts/PageHeader";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import type { DashboardStats } from "@19er/types";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Bell,
  CalendarDays,
  Clock,
  Coffee,
  ClipboardCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

interface OverviewShift {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  status: string;
  employees: Array<{ employee: { fullName: string } }>;
}

interface OverviewPayroll {
  id: string;
  salary: number;
  isPaid: boolean;
  totalHours: number;
  createdAt: string;
  employee: { fullName: string };
}

interface DashboardOverview {
  stats: DashboardStats;
  recentShifts: OverviewShift[];
  recentPayrolls: OverviewPayroll[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get<DashboardStats>("/dashboard/stats");
      if (res.isError) throw new Error(res.message);
      return res.data;
    },
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const res = await api.get<DashboardOverview>("/dashboard/overview");
      if (res.isError) throw new Error(res.message);
      return res.data;
    },
  });

  const paidCount = overview?.recentPayrolls.filter((p) => p.isPaid).length ?? 0;
  const totalRecent = overview?.recentPayrolls.length ?? 0;
  const attendanceRate =
    stats && stats.totalEmployees > 0
      ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("dashboard.greeting", { name: user?.fullName?.split(" ")[0] ?? "Admin" })}
        description={t("dashboard.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statsLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[88px]" />)
          : (
            <>
              <StatCard label={t("dashboard.employees")} value={stats?.totalEmployees ?? 0} icon={Users} accent="navy" />
              <StatCard label={t("dashboard.active")} value={stats?.activeEmployees ?? 0} icon={ClipboardCheck} accent="orange" />
              <StatCard label={t("dashboard.upcomingShifts")} value={stats?.upcomingShifts ?? 0} icon={CalendarDays} accent="navy" />
              <StatCard label={t("dashboard.pendingPayrolls")} value={stats?.pendingPayrolls ?? 0} icon={Wallet} accent="orange" />
              <StatCard label={t("dashboard.notifications")} value={stats?.pendingNotifications ?? 0} icon={Bell} accent="navy" />
            </>
          )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-1 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden border-border/80">
          <CardContent className="p-0">
            <div className="border-b border-border/60 bg-primary px-5 py-4 text-white">
              <h2 className="font-bold">{t("dashboard.todayTimeline")}</h2>
              <p className="text-xs text-white/70">{t("dashboard.recentShifts")}</p>
            </div>
            <div className="relative px-5 py-4">
              {overview?.recentShifts && overview.recentShifts.length > 1 && (
                <div className="timeline-line" aria-hidden />
              )}
              {overviewLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-2xl" />
                  ))}
                </div>
              ) : overview?.recentShifts?.length ? (
                <ul className="space-y-3">
                  {overview.recentShifts.slice(0, 5).map((shift, i) => (
                    <li
                      key={shift.id}
                      className={`relative flex items-start gap-3 rounded-2xl p-3 transition-colors ${i === 0
                          ? "border-2 border-accent/40 bg-accent-soft/60"
                          : "hover:bg-accent-soft/30"
                        }`}
                    >
                      <div
                        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${i === 0 ? "bg-accent text-white" : "bg-primary-soft text-primary"
                          }`}
                      >
                        {i === 0 ? <Clock className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {shift.title || t("shifts.untitled")}
                        </p>
                        <p className="text-xs text-muted">
                          {format(new Date(shift.startTime), "HH:mm")} –{" "}
                          {format(new Date(shift.endTime), "HH:mm")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted">{t("dashboard.noShifts")}</p>
              )}
            </div>
            <div className="border-t border-border/60 p-4">
              <Link
                to="/shifts"
                className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-accent text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgb(244_121_32/0.45)] transition-all hover:bg-accent-hover"
              >
                {t("dashboard.manageShifts")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-6">
          <div className="surface-card relative overflow-hidden p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">{t("dashboard.payrollReminder")}</p>
                <p className="mt-1 text-sm text-muted">
                  {t("dashboard.payrollAwaiting", { count: stats?.pendingPayrolls ?? 0 })}
                </p>
              </div>
              <Link
                to="/payroll"
                className="inline-flex h-11 items-center justify-center rounded-[var(--radius-button)] bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                {t("dashboard.viewPayroll")}
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="mb-4 text-base font-bold text-foreground">{t("dashboard.upcomingAssignments")}</h2>
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
              {overviewLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 w-full rounded-[var(--radius-card)]" />
                ))
              ) : overview?.recentShifts?.length ? (
                overview.recentShifts.map((shift, i) => (
                  <div
                    key={shift.id}
                    className={`surface-card flex min-w-0 flex-col p-4 transition-transform hover:-translate-y-1 ${
                      i === 0 ? "ring-2 ring-accent/40" : ""
                    }`}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="truncate text-sm font-bold text-foreground">
                      {shift.employees[0]?.employee.fullName ?? t("dashboard.unassigned")}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted">{shift.title || t("shifts.untitled")}</p>
                    <p className="mt-auto pt-3 text-xs font-semibold text-accent">
                      {format(new Date(shift.startTime), "MMM d · HH:mm")}
                    </p>
                    {i === 0 && (
                      <Badge variant="default" className="mt-2 w-fit">
                        {t("dashboard.next")}
                      </Badge>
                    )}
                  </div>
                ))
              ) : (
                <p className="col-span-full text-sm text-muted">{t("dashboard.noAssignments")}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ProgressBar label={t("dashboard.activeEmployees")} value={attendanceRate} max={100} />
            <ProgressBar
              label={t("dashboard.recentPayrollsPaid")}
              value={totalRecent > 0 ? (paidCount / totalRecent) * 100 : 0}
              max={100}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
