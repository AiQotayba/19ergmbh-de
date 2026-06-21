import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

/** Native HTML select — used where Radix Select is not yet migrated. */
export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-11 w-full appearance-none rounded-[var(--radius-button)] border border-border bg-surface px-4 py-2 pe-10 text-sm text-foreground",
          "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  ),
);
NativeSelect.displayName = "NativeSelect";
