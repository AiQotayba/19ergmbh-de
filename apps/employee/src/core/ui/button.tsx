import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/core/lib/utils";

const variants = {
  default:
    "bg-accent text-white shadow-[0_4px_14px_-2px_rgb(244_121_32/0.45)] hover:bg-accent-hover hover:shadow-[0_6px_20px_-2px_rgb(244_121_32/0.5)]",
  outline:
    "border border-border bg-surface text-foreground hover:bg-accent-soft/50 hover:border-accent-muted",
  ghost: "text-muted hover:bg-accent-soft/60 hover:text-foreground",
  destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
  secondary: "bg-accent-soft text-primary hover:bg-accent-muted/40",
  soft: "bg-accent-soft text-accent hover:bg-accent-muted/30",
};

const sizes = {
  default: "h-11 px-5 py-2",
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-7 text-base",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] text-sm font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
