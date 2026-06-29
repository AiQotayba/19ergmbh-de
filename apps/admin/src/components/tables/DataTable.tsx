import { api, normalizePaginated } from "@/lib/api-client";
import { useI18n } from "@/i18n";
import { readTableFilters, tableFilterValuesKey, tableQueryParamKey } from "@/lib/table-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import type { PaginatedResponse } from "@19er/types";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const DEFAULT_LIMIT = 10;
const LIMIT_OPTIONS = [10, 25, 50, 100] as const;
const SEARCH_DEBOUNCE_MS = 300;

export interface TableColumn<T = object> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T extends object> {
  columns: TableColumn<T>[];
  apiEndpoint: string;
  queryKeyPrefix?: string;
  enableActions?: boolean;
  actions?: {
    onView?: (row: T) => void;
    onEdit?: (row: T) => void;
  };
  onAdd?: () => void;
  addLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  enableDelete?: boolean;
  enableEdit?: boolean;
  enableView?: boolean;
  skeletonRows?: number;
  deleteTitle?: string;
  deleteDescription?: (row: T) => string;
  onDeleteConfirm?: (row: T) => Promise<void>;
  deleteEndpoint?: (row: T) => string;
  limitOptions?: number[];
  toolbar?: React.ReactNode;
  /** Prefix URL params when multiple tables share one page (e.g. "runs" → runs_page, runs_sort_field). */
  urlKeyPrefix?: string;
  /** URL query keys forwarded to the API on every request (e.g. ["status"]). */
  apiFilterKeys?: string[];
}

function queryParamKey(key: string, prefix?: string) {
  return tableQueryParamKey(key, prefix);
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

function DataTableSkeleton({
  columns,
  skeletonRows = 5,
}: {
  columns: Array<Pick<TableColumn<object>, "key" | "label">>;
  skeletonRows?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key}>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
              <TableHead className="w-32">
                <Skeleton className="h-4 w-16" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-6 w-full max-w-[200px]" />
                  </TableCell>
                ))}
                <TableCell>
                  <Skeleton className="h-8 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function DataTable<T extends object & { id?: string }>(props: DataTableProps<T>) {
  return (
    <React.Suspense fallback={<DataTableSkeleton columns={props.columns} skeletonRows={props.skeletonRows} />}>
      <DataTableInner {...props} />
    </React.Suspense>
  );
}

function DataTableInner<T extends object & { id?: string }>({
  columns,
  apiEndpoint,
  queryKeyPrefix,
  enableActions = true,
  actions,
  onAdd,
  addLabel = "Add new",
  searchPlaceholder = "Search...",
  emptyMessage = "No data found",
  enableDelete = true,
  enableEdit = true,
  enableView = false,
  skeletonRows = 5,
  deleteTitle = "Confirm delete",
  deleteDescription,
  onDeleteConfirm,
  deleteEndpoint,
  limitOptions = [...LIMIT_OPTIONS],
  toolbar,
  urlKeyPrefix,
  apiFilterKeys,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get(queryParamKey("page", urlKeyPrefix))) || 1);
  const limit = Math.max(1, Number(searchParams.get(queryParamKey("limit", urlKeyPrefix))) || DEFAULT_LIMIT);
  const search = searchParams.get(queryParamKey("search", urlKeyPrefix)) || "";
  const sortField = searchParams.get(queryParamKey("sort_field", urlKeyPrefix));
  const sortOrder = searchParams.get(queryParamKey("sort_order", urlKeyPrefix));

  const apiFilterValuesKey = React.useMemo(
    () => tableFilterValuesKey(searchParams, apiFilterKeys ?? [], urlKeyPrefix),
    [apiFilterKeys, searchParams, urlKeyPrefix],
  );

  const [searchValue, setSearchValue] = React.useState(search);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<T | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const queryKey = React.useMemo(
    () => [
      queryKeyPrefix ?? "table-data",
      apiEndpoint,
      urlKeyPrefix ?? "",
      Object.fromEntries(searchParams.entries()),
      apiFilterValuesKey,
    ],
    [apiEndpoint, queryKeyPrefix, urlKeyPrefix, searchParams, apiFilterValuesKey],
  );

  const { data: queryData, isLoading, isFetching, isError, error } = useQuery({
    queryKey,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const apiFilters = readTableFilters(searchParams, apiFilterKeys ?? [], urlKeyPrefix);

      const params: Record<string, string | number | undefined> = {
        page,
        limit,
        search: search || undefined,
        sort_field: sortField || undefined,
        sort_order: sortOrder || undefined,
        ...apiFilters,
      };

      const response = await api.get<PaginatedResponse<T>>(apiEndpoint, { params });
      if (response.isError) throw new Error(response.message);

      const normalized = normalizePaginated(response.data, page, limit);
      return {
        data: normalized.items,
        meta: normalized.meta as PaginationMeta,
      };
    },
  });

  const data = queryData?.data ?? [];
  const pagination: PaginationMeta = queryData?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: limit,
    total: 0,
  };

  const updateParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        const paramKey = queryParamKey(key, urlKeyPrefix);
        if (value === null) params.delete(paramKey);
        else params.set(paramKey, value);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams, urlKeyPrefix],
  );

  React.useEffect(() => {
    setSearchValue(search);
  }, [search]);

  React.useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  const applySearch = React.useCallback(
    (value: string) => {
      updateParams({ search: value || null, page: "1" });
    },
    [updateParams],
  );

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => applySearch(value), SEARCH_DEBOUNCE_MS);
  };

  const handleSearchClear = () => {
    setSearchValue("");
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    applySearch("");
  };

  const skipFilterPageReset = React.useRef(true);
  React.useEffect(() => {
    if (skipFilterPageReset.current) {
      skipFilterPageReset.current = false;
      return;
    }
    updateParams({ page: "1" });
  }, [apiFilterValuesKey, updateParams]);

  const handleSort = (columnKey: string) => {
    if (sortField === columnKey) {
      if (sortOrder === "asc") {
        updateParams({ sort_field: columnKey, sort_order: "desc", page: "1" });
      } else {
        updateParams({ sort_field: null, sort_order: null, page: "1" });
      }
    } else {
      updateParams({ sort_field: columnKey, sort_order: "asc", page: "1" });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRow) return;
    try {
      setIsDeleting(true);
      if (onDeleteConfirm) {
        await onDeleteConfirm(selectedRow);
      } else {
        const endpoint = deleteEndpoint
          ? deleteEndpoint(selectedRow)
          : `${apiEndpoint.replace(/\?.*$/, "")}/${(selectedRow as { id: string }).id}`;
        const response = await api.delete(endpoint, {
          showSuccessToast: true,
          successMessage: t("common.deleted"),
        });
        if (response.isError) throw new Error(response.message);
      }
      toast.success(t("common.deleted"));
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix ?? "table-data"] });
      setDeleteDialogOpen(false);
      setSelectedRow(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const isInitialLoad = isLoading && !queryData;

  if (isInitialLoad) {
    return <DataTableSkeleton columns={columns} skeletonRows={skeletonRows} />;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        {error instanceof Error ? error.message : "Failed to load data"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="ps-9 pe-9"
          />
          {searchValue && (
            <button
              type="button"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={handleSearchClear}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {toolbar}
          {onAdd && (
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-card)] border border-border/80 bg-surface shadow-[var(--shadow-card)] transition-opacity",
          isFetching && "opacity-60",
        )}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-primary-soft/20">
              {columns.map((col) => (
                <TableHead key={col.key} style={{ width: col.width }} className={col.className}>
                  {col.sortable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortField === col.key ? (
                        sortOrder === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              {enableActions && (enableEdit || enableDelete || enableView) && (
                <TableHead className="w-28 text-end">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableActions ? 1 : 0)}
                  className="h-24 text-center text-muted"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={(row as { id?: string }).id ?? index}>
                  {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[col.key];
                    return (
                      <TableCell key={col.key} className={col.className}>
                        {col.render ? col.render(value, row) : String(value ?? "—")}
                      </TableCell>
                    );
                  })}
                  {enableActions && (enableEdit || enableDelete || enableView) && (
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {enableEdit && actions?.onEdit && (
                          <Button variant="ghost" size="icon" onClick={() => actions.onEdit?.(row)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {enableDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedRow(row);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Showing {data.length === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1}–
          {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Rows</span>
            <NativeSelect
              value={String(limit)}
              onChange={(e) => updateParams({ limit: e.target.value, page: "1" })}
              className="w-20"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.current_page <= 1}
              onClick={() => updateParams({ page: String(pagination.current_page - 1) })}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
            <span className="min-w-[80px] text-center text-sm">
              {pagination.current_page} / {pagination.last_page}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => updateParams({ page: String(pagination.current_page + 1) })}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>{deleteTitle}</DialogTitle>
            <DialogDescription>
              {selectedRow && deleteDescription
                ? deleteDescription(selectedRow)
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={() => void handleDeleteConfirm()}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
