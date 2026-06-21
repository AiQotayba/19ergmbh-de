import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-4 py-2 text-sm text-foreground",
        "placeholder:text-muted/70 transition-colors",
        "focus-visible:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
