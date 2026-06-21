import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  className?: string;
}

export function ProgressBar({ label, value, max = 100, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("surface-card p-5", className)}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-sm font-bold text-primary">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-primary-soft">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
