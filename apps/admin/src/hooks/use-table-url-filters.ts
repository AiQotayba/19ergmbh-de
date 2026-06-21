import { tableQueryParamKey } from "@/lib/table-url";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useTableUrlFilters(prefix?: string) {
  const [searchParams, setSearchParams] = useSearchParams();

  const get = useCallback(
    (key: string) => searchParams.get(tableQueryParamKey(key, prefix)) ?? "",
    [searchParams, prefix],
  );

  const set = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        const paramKey = tableQueryParamKey(key, prefix);
        if (value === null || value === "") params.delete(paramKey);
        else params.set(paramKey, value);
      }
      params.set(tableQueryParamKey("page", prefix), "1");
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, prefix],
  );

  return { get, set };
}
