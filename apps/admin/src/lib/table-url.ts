export function tableQueryParamKey(key: string, prefix?: string) {
  return prefix ? `${prefix}_${key}` : key;
}

export function readTableFilters(
  searchParams: URLSearchParams,
  keys: string[],
  prefix?: string,
): Record<string, string> {
  const filters = Object.fromEntries(
    keys
      .map((key) => {
        const value = searchParams.get(tableQueryParamKey(key, prefix)) ?? "";
        return [key, value] as const;
      })
      .filter(([, value]) => Boolean(value)),
  ) as Record<string, string>;

  if (filters.fromDate && filters.toDate) {
    filters.dateRange = `${filters.fromDate},${filters.toDate}`;
  }

  return filters;
}

export function tableFilterValuesKey(
  searchParams: URLSearchParams,
  keys: string[],
  prefix?: string,
) {
  return JSON.stringify(keys.map((key) => searchParams.get(tableQueryParamKey(key, prefix)) ?? ""));
}
