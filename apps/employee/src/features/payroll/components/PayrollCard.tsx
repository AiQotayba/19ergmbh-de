import { PayrollStatusBadge } from "@/features/payroll/components/PayrollStatusBadge";
import type { PayrollRecord } from "@/features/payroll/types";
import { useI18n } from "@/core/i18n";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export function PayrollCard({ record }: { record: PayrollRecord }) {
  const { t } = useI18n();
  const period = `${format(new Date(record.fromDate), "MMM d")} – ${format(new Date(record.toDate), "MMM d, yyyy")}`;

  return (
    <Link to={`/payroll/${record.id}`} className="surface-card block p-4 hover:border-accent/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{period}</p>
          <p className="mt-1 text-sm text-muted">
            {record.totalHours}h
            {record.absenceHours > 0 ? ` · ${record.absenceHours}h ${t("payroll.absenceHours").toLowerCase()}` : ""}
          </p>
        </div>
        <div className="text-end">
          <p className="font-bold text-accent">€{record.salary.toFixed(2)}</p>
          <PayrollStatusBadge isPaid={record.isPaid} />
        </div>
      </div>
    </Link>
  );
}
