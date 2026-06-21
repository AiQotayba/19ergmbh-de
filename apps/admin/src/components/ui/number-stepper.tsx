import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { Button } from "./button";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 0.5,
  className,
  disabled,
}: NumberStepperProps) {
  const decrement = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const increment = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={decrement}
        disabled={disabled || value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isNaN(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
        className="flex h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-4 text-center text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10 disabled:opacity-50"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={increment}
        disabled={disabled || value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
