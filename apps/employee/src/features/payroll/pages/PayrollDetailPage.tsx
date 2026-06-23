import { HoursBreakdown } from "@/features/payroll/components/HoursBreakdown";
import { PayrollAmount } from "@/features/payroll/components/PayrollAmount";
import { PayrollStatusBadge } from "@/features/payroll/components/PayrollStatusBadge";
import { usePayrollRecord } from "@/features/payroll/hooks/useMyPayroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { Skeleton } from "@/core/ui/skeleton";
import { useI18n } from "@/core/i18n";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { data: record, isLoading, error } = usePayrollRecord(id);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-card" />;

  if (error || !record) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-600">{error?.message ?? t("common.error")}</p>
        <Link to="/payroll" className="text-sm font-semibold text-accent">{t("common.back")}</Link>
      </div>
    );
  }

  const period = `${format(new Date(record.fromDate), "PP")} – ${format(new Date(record.toDate), "PP")}`;

  return (
    <div className="space-y-4">
      <Link to="/payroll" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{t("payroll.detailTitle")}</CardTitle>
            <PayrollStatusBadge isPaid={record.isPaid} />
          </div>
          <p className="text-sm text-muted">{period}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <HoursBreakdown totalHours={record.totalHours} absenceHours={record.absenceHours} />
          <PayrollAmount record={record} />
          {record.isPaid && record.paidAt && (
            <p className="text-sm text-muted">
              {t("payroll.paidAt")}: {format(new Date(record.paidAt), "PPp")}
            </p>
          )}
          <p className="rounded-xl bg-primary-soft/50 p-3 text-xs text-muted">{t("payroll.hoursHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
