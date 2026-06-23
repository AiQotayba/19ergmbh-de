import { resolveDatabaseProvider } from "@19er/db";

/** Case-insensitive `contains` — `mode` is PostgreSQL-only; MySQL ignores it. */
export function icontains(value: string): { contains: string; mode?: "insensitive" } {
  const filter = { contains: value } as { contains: string; mode?: "insensitive" };
  if (isPostgresDatabase()) filter.mode = "insensitive";
  return filter;
}

function isPostgresDatabase() {
  return resolveDatabaseProvider() === "postgresql";
}
