import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

export type CalendarProps = DayPickerProps;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute start-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface hover:bg-accent-soft/50",
        ),
        button_next: cn(
          "absolute end-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface hover:bg-accent-soft/50",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.8rem] font-medium text-muted",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal transition-colors",
          "hover:bg-accent-soft aria-selected:bg-accent aria-selected:text-white",
        ),
        selected: "bg-accent text-white hover:bg-accent hover:text-white focus:bg-accent focus:text-white",
        today: "bg-primary-soft text-primary font-semibold",
        outside: "text-muted opacity-50",
        disabled: "text-muted opacity-50",
        range_middle: "rounded-none bg-accent-soft text-accent aria-selected:bg-accent-soft aria-selected:text-accent",
        range_start: "rounded-s-md",
        range_end: "rounded-e-md",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> : <ChevronRight className="h-4 w-4 rtl:rotate-180" />,
      }}
      {...props}
    />
  );
}
