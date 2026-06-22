import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface ChoiceCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  warning?: boolean;
}

export function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
  children,
  className,
  warning = false,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[var(--radius-card)] border p-4 text-left transition-colors",
        warning && !selected && "border-red-500/70 bg-red-50/50 hover:border-red-500",
        warning && selected && "border-red-500 bg-red-50 ring-2 ring-red-500/25",
        !warning &&
          (selected
            ? "border-primary bg-primary-soft/25 ring-2 ring-primary/20"
            : "border-border bg-surface hover:border-primary/40"),
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
            selected ? "border-primary bg-primary text-white" : "border-border bg-white",
          )}
          aria-hidden
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          {description && <p className="text-sm text-muted">{description}</p>}
          {children}
        </div>
      </div>
    </button>
  );
}
