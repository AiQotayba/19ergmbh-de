import { useI18n, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

const locales: { code: Locale; label: string }[] = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
];

interface LanguageSwitcherProps {
  className?: string;
  variant?: "compact" | "full";
}

export function LanguageSwitcher({ className, variant = "compact" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {variant === "full" && (
        <Globe className="h-4 w-4 text-muted" aria-hidden />
      )}
      <div className="flex rounded-[var(--radius-button)] border border-border bg-surface p-0.5">
        {locales.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors",
              locale === code
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
