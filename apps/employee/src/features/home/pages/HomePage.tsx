import { useHomeData } from "@/features/home/hooks/useHomeData";
import { ShiftCard } from "@/features/schedule/components/ShiftCard";
import { resolveShiftFromApi } from "@/features/schedule/lib/shift-display";
import { PayrollStatusBadge } from "@/features/payroll/components/PayrollStatusBadge";
import { useAuth } from "@/core/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { Skeleton } from "@/core/ui/skeleton";
import { useI18n } from "@/core/i18n";
import { CalendarDays, Clock, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

export function HomePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { shifts, latestPayroll, isLoading } = useHomeData();

  const firstName = user?.fullName?.split(" ")[0] ?? "";
  const nextShift = shifts[0];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("home.greeting", { name: firstName })}</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-accent" />
            {t("home.nextShift")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextShift ? (
            <NextShiftSummary assignment={nextShift} />
          ) : (
            <p className="text-sm text-muted">{t("home.noUpcoming")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-semibold">{t("home.hoursSummary")}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {latestPayroll ? `${latestPayroll.totalHours}h` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted">
              <Wallet className="h-4 w-4" />
              <span className="text-xs font-semibold">{t("home.latestPayroll")}</span>
            </div>
            {latestPayroll ? (
              <>
                <p className="mt-2 text-2xl font-bold text-accent">€{latestPayroll.salary.toFixed(2)}</p>
                <PayrollStatusBadge isPaid={latestPayroll.isPaid} />
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{t("home.noPayroll")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {shifts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{t("home.upcoming")}</h2>
            <Link to="/schedule" className="text-sm font-semibold text-accent">
              {t("common.viewAll")}
            </Link>
          </div>
          {shifts.slice(0, 3).map((assignment) => (
            <ShiftCard key={assignment.id} assignment={assignment} />
          ))}
        </section>
      )}
    </div>
  );
}

function NextShiftSummary({ assignment }: { assignment: import("@/features/schedule/types").ShiftAssignment }) {
  const schedule = resolveShiftFromApi(assignment.shift);
  return (
    <Link to={`/schedule/${assignment.id}`} className="block rounded-xl bg-accent-soft/40 p-3">
      <p className="font-semibold">{assignment.shift.title || "—"}</p>
      <p className="mt-1 text-sm text-muted">
        {schedule.fromDate} · {schedule.dailyStartTime}–{schedule.dailyEndTime}
      </p>
    </Link>
  );
}
