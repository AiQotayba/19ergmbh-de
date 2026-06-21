/** Date filter normalization for list endpoints (kept in API to avoid stale @19er/shared dist in dev). */
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

type SortDirection = "asc" | "desc";

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

export function parseSortOrder(
  sortField: string | undefined,
  sortOrder: string | undefined,
  allowed: Record<string, Record<string, unknown>>,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  const direction: SortDirection = sortOrder === "desc" ? "desc" : "asc";
  if (!sortField || !allowed[sortField]) {
    return applySortDirection(fallback, direction) as Record<string, unknown>;
  }
  return applySortDirection(allowed[sortField], direction) as Record<string, unknown>;
}
