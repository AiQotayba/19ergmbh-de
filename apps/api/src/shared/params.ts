export function paramId(
  params: Record<string, string | string[] | undefined>,
  key = "id",
): string {
  const value = params[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`Missing route parameter: ${key}`);
  }
  return value;
}
