import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";

interface AssignedEmployeesBadgesProps {
  names: string[];
  maxVisible?: number;
  emptyLabel?: string;
}

export function AssignedEmployeesBadges({
  names,
  maxVisible,
  emptyLabel = "—",
}: AssignedEmployeesBadgesProps) {
  const { t } = useI18n();

  if (names.length === 0) {
    return <span className="text-muted">{emptyLabel}</span>;
  }

  const limit = maxVisible ?? names.length;
  const visible = names.slice(0, limit);
  const remaining = names.length - limit;
  const hiddenNames = names.slice(limit);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((name, index) => (
        <Badge key={`${name}-${index}`} variant="outline">
          {name}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge
          variant="default"
          title={hiddenNames.join(", ")}
          className="cursor-default"
        >
          {t("shifts.moreEmployees", { count: remaining })}
        </Badge>
      )}
    </div>
  );
}
