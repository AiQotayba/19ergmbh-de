import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";

function isIncompleteRange(range?: DateRange): boolean {
  return Boolean(range?.from && !range?.to);
}

function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseDateString(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function rangeFromStrings(from?: string, to?: string): DateRange | undefined {
  const fromDate = parseDateString(from);
  const toDate = parseDateString(to);
  if (!fromDate && !toDate) return undefined;
  return { from: fromDate, to: toDate };
}

export interface DateRangePickerProps {
  from?: string;
  to?: string;
  onChange: (from: string, to: string) => void;
  className?: string;
  placeholder?: string;
}

export function DateRangePicker({ from, to, onChange, className, placeholder }: DateRangePickerProps) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const allowDismissRef = useRef(false);
  const draftRef = useRef<DateRange | undefined>(undefined);

  const committed = useMemo(() => rangeFromStrings(from, to), [from, to]);

  function setDraftRange(range: DateRange | undefined) {
    draftRef.current = range;
    setDraft(range);
  }

  const label = useMemo(() => {
    const fromDate = parseDateString(from);
    const toDate = parseDateString(to);
    if (fromDate && toDate) {
      return `${format(fromDate, "MMM d, yyyy")} – ${format(toDate, "MMM d, yyyy")}`;
    }
    return placeholder ?? t("common.dateRange");
  }, [from, to, placeholder, t]);

  function closePopover() {
    allowDismissRef.current = false;
    setOpen(false);
    setDraftRange(undefined);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      allowDismissRef.current = false;
      setDraftRange(committed);
      setOpen(true);
      return;
    }

    if (isIncompleteRange(draftRef.current) && !allowDismissRef.current) {
      return;
    }

    closePopover();
  }

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from) {
      setDraftRange(undefined);
      return;
    }

    const draftFrom = draftRef.current?.from;

    // v10: first click sets from and to to the same day — wait for a second click
    if (
      range.to &&
      isSameDay(range.from, range.to) &&
      (!draftFrom || !isSameDay(draftFrom, range.from))
    ) {
      setDraftRange({ from: range.from, to: undefined });
      return;
    }

    if (!range.to) {
      setDraftRange({ from: range.from, to: undefined });
      return;
    }

    const nextFrom = toDateString(range.from);
    const nextTo = toDateString(range.to);
    onChange(nextFrom, nextTo);
    allowDismissRef.current = true;
    setDraftRange(range);
    setOpen(false);
  }

  function clearRange(event: React.MouseEvent) {
    event.stopPropagation();
    onChange("", "");
    allowDismissRef.current = true;
    closePopover();
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          dir={dir}
          className={cn(
            "h-11 min-w-[240px] justify-start gap-2 px-3 font-normal",
            !from && !to && "text-muted",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
          {(from || to) && (
            <span
              role="button"
              tabIndex={0}
              className="ms-auto inline-flex rounded-sm p-0.5 hover:bg-accent-soft/60"
              onClick={clearRange}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  clearRange(e as unknown as React.MouseEvent);
                }
              }}
              aria-label={t("common.clear")}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        dir={dir}
        onInteractOutside={(event) => {
          const originalType = event.detail.originalEvent.type;
          if (originalType === "focusin" && isIncompleteRange(draftRef.current)) {
            event.preventDefault();
            return;
          }
          allowDismissRef.current = true;
        }}
        onEscapeKeyDown={(event) => {
          if (isIncompleteRange(draftRef.current)) {
            event.preventDefault();
            return;
          }
          allowDismissRef.current = true;
        }}
      >
        <Calendar
          mode="range"
          selected={draft}
          onSelect={handleSelect}
          numberOfMonths={2}
          defaultMonth={draft?.from ?? committed?.from}
        />
      </PopoverContent>
    </Popover>
  );
}
