import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";

interface ShiftDateBadgesProps {
  fromDate: string;
  toDate: string;
}

function formatShiftDate(date: string) {
  return format(parseISO(date.slice(0, 10)), "MMM d, yyyy");
}

export function ShiftDateBadges({ fromDate, toDate }: ShiftDateBadgesProps) {
  const start = fromDate.slice(0, 10);
  const end = toDate.slice(0, 10);
  const sameDay = start === end;

  if (sameDay) {
    return (
      <Badge variant="outline" className="gap-1">
        <Calendar className="h-3 w-3 shrink-0" aria-hidden />
        <span>{formatShiftDate(start)}</span>
      </Badge>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="outline" className="gap-1">
        <Calendar className="h-3 w-3 shrink-0" aria-hidden />
        <span>{formatShiftDate(start)}</span>
      </Badge>
      <Badge variant="accent" className="gap-1">
        <Calendar className="h-3 w-3 shrink-0" aria-hidden />
        <span>{formatShiftDate(end)}</span>
      </Badge>
    </div>
  );
}
