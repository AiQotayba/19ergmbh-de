import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useMemo, useState } from "react";

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ value, onChange, className, placeholder }: DatePickerProps) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }, [value]);

  const label = selected ? format(selected, "MMM d, yyyy") : placeholder ?? t("common.selectDate");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          dir={dir}
          className={cn(
            "h-11 w-full justify-start gap-2 px-3 font-normal",
            !value && "text-muted",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              className="ms-auto inline-flex rounded-sm p-0.5 hover:bg-accent-soft/60"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              aria-label={t("common.clear")}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" dir={dir}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          defaultMonth={selected}
        />
      </PopoverContent>
    </Popover>
  );
}
