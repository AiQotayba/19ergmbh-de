import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { useMemo, useState } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  noneValue?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  className,
  noneValue = "none",
}: SearchableSelectProps) {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Select
      dir={locale === "ar" ? "rtl" : "ltr"}
      value={value || noneValue}
      onValueChange={(next) => {
        onValueChange(next === noneValue ? "" : next);
        setQuery("");
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2 pb-0">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <SelectItem value={noneValue}>{placeholder}</SelectItem>
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted">{emptyLabel}</div>
        ) : (
          filtered.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
