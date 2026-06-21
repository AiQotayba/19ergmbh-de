/** Coerce Express query values to a plain string. */
export function queryParam(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export function pickQueryParams(
  query: Record<string, unknown>,
  keys: string[],
): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, queryParam(query[key])]));
}
