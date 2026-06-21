import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "navy" | "orange" | "blue" | "teal" | "amber" | "rose" | "violet";
  className?: string;
}

const accents = {
  navy: { icon: "bg-primary-soft text-primary", ring: "ring-primary/10" },
  orange: { icon: "bg-accent-soft text-accent", ring: "ring-accent/20" },
  blue: { icon: "bg-primary-soft text-primary", ring: "ring-primary/10" },
  teal: { icon: "bg-accent-soft text-accent", ring: "ring-accent/20" },
  amber: { icon: "bg-amber-50 text-amber-600", ring: "ring-amber-200/50" },
  rose: { icon: "bg-rose-50 text-rose-500", ring: "ring-rose-200/50" },
  violet: { icon: "bg-violet-50 text-violet-600", ring: "ring-violet-200/50" },
};

export function StatCard({ label, value, icon: Icon, accent = "blue", className }: StatCardProps) {
  const style = accents[accent];
  return (
    <div
      className={cn(
        "surface-card flex items-center gap-4 p-5 ring-1 transition-transform hover:-translate-y-0.5",
        style.ring,
        className,
      )}
    >
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", style.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted">{label}</p>
      </div>
    </div>
  );
}
