import { cn } from "@/core/lib/utils";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn("inline-flex rounded-[var(--radius-button)] border border-border bg-surface p-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
            value === tab.id
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:bg-primary-soft/40 hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ active, id, children }: { active: string; id: string; children: ReactNode }) {
  if (active !== id) return null;
  return <>{children}</>;
}
