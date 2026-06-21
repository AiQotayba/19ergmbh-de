import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../constants/index.js";

export function parsePagination(
  page?: string | number,
  limit?: string | number,
): { page: number; limit: number; skip: number } {
  const parsedPage = Math.max(1, Number(page) || DEFAULT_PAGE);
  const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
}

export function calculateWorkedHours(
  checkIn: Date,
  checkOut: Date,
  breakMinutes = 0,
): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const totalMinutes = diffMs / (1000 * 60) - breakMinutes;
  return Math.max(0, Math.round((totalMinutes / 60) * 100) / 100);
}

export function calculateSalary(totalHours: number, hourlyRate: number): number {
  return Math.round(totalHours * hourlyRate * 100) / 100;
}

export function shiftsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

export function omitPassword<T extends { password?: string }>(user: T): Omit<T, "password"> {
  const { password: _, ...rest } = user;
  return rest;
}

type SortDirection = "asc" | "desc";

export function parseSortOrder(
  sortField: string | undefined,
  sortOrder: string | undefined,
  allowed: Record<string, Record<string, unknown>>,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  const direction: SortDirection = sortOrder === "desc" ? "desc" : "asc";
  if (!sortField || !allowed[sortField]) return applySortDirection(fallback, direction) as Record<string, unknown>;
  return applySortDirection(allowed[sortField], direction) as Record<string, unknown>;
}

function applySortDirection(value: unknown, direction: SortDirection): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 1 && typeof record[keys[0]] !== "object") {
    return { [keys[0]]: direction };
  }
  const key = keys[0];
  return { [key]: applySortDirection(record[key], direction) };
}

export function parseDateRange(fromDate: string, toDate: string): { from: Date; to: Date } {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range");
  }
  if (from > to) {
    throw new Error("fromDate must be before toDate");
  }
  return { from, to };
}

/** Parses YYYY-MM-DD or ISO date strings into start/end-of-day boundaries. */
export function parseOptionalDateBoundary(
  value: string | undefined,
  boundary: "start" | "end",
): Date | undefined {
  if (!value) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    if (boundary === "start") return new Date(year, month - 1, day, 0, 0, 0, 0);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (boundary === "start") {
    date.setHours(0, 0, 0, 0);
    return date;
  }
  date.setHours(23, 59, 59, 999);
  return date;
}

export function buildDateRangeWhere(
  field: string,
  fromDate?: string,
  toDate?: string,
): Record<string, unknown> | undefined {
  const gte = parseOptionalDateBoundary(fromDate, "start");
  const lte = parseOptionalDateBoundary(toDate, "end");
  if (!gte && !lte) return undefined;

  if (gte && lte && gte > lte) {
    throw new Error("fromDate must be before toDate");
  }

  const range: Record<string, Date> = {};
  if (gte) range.gte = gte;
  if (lte) range.lte = lte;
  return { [field]: range };
}

/** Normalizes list query date filters from fromDate/toDate, from/to, or dateRange=YYYY-MM-DD,YYYY-MM-DD */
export function parseListDateRange(query: {
  fromDate?: string;
  toDate?: string;
  from?: string;
  to?: string;
  dateRange?: string;
}): { fromDate?: string; toDate?: string } {
  if (query.dateRange) {
    const [fromPart, toPart] = query.dateRange.split(",").map((part) => part.trim());
    return {
      fromDate: fromPart || undefined,
      toDate: toPart || undefined,
    };
  }

  const fromDate = (query.fromDate ?? query.from)?.trim();
  const toDate = (query.toDate ?? query.to)?.trim();

  return {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };
}
