import { useI18n } from "@/core/i18n";

export function HoursBreakdown({
  totalHours,
  absenceHours,
}: {
  totalHours: number;
  absenceHours: number;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-emerald-50 p-3 text-center">
        <p className="text-xs text-muted">{t("payroll.hours")}</p>
        <p className="text-xl font-bold text-emerald-700">{totalHours}h</p>
      </div>
      <div className="rounded-xl bg-amber-50 p-3 text-center">
        <p className="text-xs text-muted">{t("payroll.absenceHours")}</p>
        <p className="text-xl font-bold text-amber-700">{absenceHours}h</p>
      </div>
    </div>
  );
}
