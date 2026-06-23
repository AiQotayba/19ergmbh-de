import { PayrollCard } from "@/features/payroll/components/PayrollCard";
import { useMyPayroll } from "@/features/payroll/hooks/useMyPayroll";
import { Skeleton } from "@/core/ui/skeleton";
import { useI18n } from "@/core/i18n";

export function PayrollPage() {
  const { t } = useI18n();
  const { data, isLoading } = useMyPayroll();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("payroll.title")}</h1>
      <p className="text-sm text-muted">{t("payroll.hoursHint")}</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
      ) : data?.length ? (
        <div className="space-y-3">
          {data.map((record) => (
            <PayrollCard key={record.id} record={record} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted">{t("payroll.noRecords")}</p>
      )}
    </div>
  );
}
