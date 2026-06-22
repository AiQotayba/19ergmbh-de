import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface ShiftTimeBadgesProps {
  dailyStartTime: string;
  dailyEndTime: string;
}

export function ShiftTimeBadges({ dailyStartTime, dailyEndTime }: ShiftTimeBadgesProps) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="success" className="gap-1">
        <Clock className="h-3 w-3 shrink-0" aria-hidden />
        <span>{dailyStartTime}</span>
      </Badge>
      <Badge variant="info" className="gap-1">
        <Clock className="h-3 w-3 shrink-0" aria-hidden />
        <span>{dailyEndTime}</span>
      </Badge>
    </div>
  );
}
