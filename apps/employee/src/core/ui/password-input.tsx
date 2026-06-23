import { cn } from "@/core/lib/utils";
import { forwardRef, type InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(
            "flex h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-4 py-2 pe-11 text-sm text-foreground",
            "placeholder:text-muted focus-visible:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/10",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
