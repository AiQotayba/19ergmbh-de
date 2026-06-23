import type { PayrollRecord } from "@/features/payroll/types";
import { useI18n } from "@/core/i18n";

export function PayrollAmount({ record }: { record: PayrollRecord }) {
  const { t } = useI18n();

  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      <div className="flex justify-between text-sm">
        <span className="text-muted">{t("payroll.hourlyRate")}</span>
        <span className="font-semibold">€{record.hourlyRate.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">{t("payroll.salary")}</span>
        <span className="text-lg font-bold text-accent">€{record.salary.toFixed(2)}</span>
      </div>
      {record.paidAmount != null && record.paidAmount !== record.salary && (
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t("payroll.paidAmount")}</span>
          <span className="font-semibold">€{record.paidAmount.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
