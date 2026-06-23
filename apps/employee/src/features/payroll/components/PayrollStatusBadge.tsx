import { Badge } from "@/core/ui/badge";
import { useI18n } from "@/core/i18n";

export function PayrollStatusBadge({ isPaid }: { isPaid: boolean }) {
  const { t } = useI18n();
  return (
    <Badge variant={isPaid ? "success" : "warning"} className="mt-1">
      {isPaid ? t("payroll.paid") : t("payroll.pending")}
    </Badge>
  );
}
