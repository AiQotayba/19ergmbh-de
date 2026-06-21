"use client"
/**
 * @file data-table.tsx
 * @name nextvip-table
 * @description DataTable component for the frontend
 * @author 19er
 * @version 1.0.0
 * @since 1.0.0
 */

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Loader2,
  GripVertical,
  Check,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"

const DEFAULT_LIMIT = 10
const LIMIT_OPTIONS = [10, 25, 50, 100] as const

// Types
export interface TableColumn<T = object> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
}

export interface DataTableProps<T extends object> {
  columns: TableColumn<T>[]
  apiEndpoint: string
  enableActions?: boolean
  actions?: {
    onView?: (row: T) => void
    onEdit?: (row: T) => void
  }
  onAdd?: () => void
  addLabel?: string
  searchPlaceholder?: string
  emptyMessage?: string
  enableDelete?: boolean
  enableEdit?: boolean
  enableView?: boolean
  skeletonRows?: number
  deleteTitle?: string
  deleteDescription?: (row: T) => string
  onDeleteConfirm?: (row: T) => Promise<void>
  // For demo mode
  mockData?: T[]
  /** Page size options for limit selector (default: 10, 25, 50, 100) */
  limitOptions?: number[]
  /** تفعيل الترتيب بالسحب والإفلات (يتطلب endpoint PATCH .../reorder مع body: { order: [{ id, orderIndex }] }) */
  enableReorder?: boolean
  /** مسار إعادة الترتيب (افتراضي: apiEndpoint/reorder) */
  reorderEndpoint?: string
}

interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// Wrapper component that handles Suspense
export function DataTable<T extends object>(props: DataTableProps<T>) {
  return (
    <React.Suspense fallback={<DataTableSkeleton columns={props.columns} skeletonRows={props.skeletonRows} />}>
      <DataTableInner {...props} />
    </React.Suspense>
  )
}

// Skeleton loader for the table (only needs key/label for layout)
function DataTableSkeleton({
  columns,
  skeletonRows = 5,
}: {
  columns: Array<Pick<TableColumn<object>, "key" | "label">>
  skeletonRows?: number
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-16"><Skeleton className="h-4 w-8" /></TableHead>
              {columns.map((col) => (
                <TableHead key={col.key}><Skeleton className="h-4 w-24" /></TableHead>
              ))}
              <TableHead className="w-32"><Skeleton className="h-4 w-16" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key}><Skeleton className="h-6 w-full max-w-[200px]" /></TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function DataTableInner<T extends object>({
  columns,
  apiEndpoint,
  enableActions = true,
  actions,
  onAdd,
  addLabel = "إضافة جديد",
  searchPlaceholder = "بحث...",
  emptyMessage = "لا توجد بيانات",
  enableDelete = true,
  enableEdit = true,
  enableView = true,
  skeletonRows = 5,
  deleteTitle = "تأكيد الحذف",
  deleteDescription,
  onDeleteConfirm,
  mockData,
  limitOptions = [...LIMIT_OPTIONS],
  enableReorder = false,
  reorderEndpoint,
}: DataTableProps<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  const page = Math.max(1, Number(searchParams?.get("page")) || 1)
  const limit = Math.max(1, Number(searchParams?.get("limit")) || DEFAULT_LIMIT)

  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc" | null>(null)
  const [searchValue, setSearchValue] = React.useState(searchParams?.get("search") || "")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [selectedRow, setSelectedRow] = React.useState<T | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isReorderMode, setIsReorderMode] = React.useState(false)
  const [reorderedData, setReorderedData] = React.useState<T[]>([])
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [isSavingOrder, setIsSavingOrder] = React.useState(false)

  const resolvedReorderEndpoint = React.useMemo(
    () => reorderEndpoint ?? `${apiEndpoint.replace(/\?.*$/, "")}/reorder`,
    [apiEndpoint, reorderEndpoint]
  )

  // Build query params
  const queryKey = React.useMemo(() => {
    const params = Object.fromEntries(searchParams?.entries() || [])
    return ["table-data", apiEndpoint, params]
  }, [apiEndpoint, searchParams])

  // Fetch data
  const { data: queryData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (mockData) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        const search = searchParams?.get("search")?.toLowerCase()

        let filtered = [...mockData]
        if (search) {
          filtered = filtered.filter((item) =>
            Object.values(item).some((val) =>
              String(val).toLowerCase().includes(search)
            )
          )
        }

        const total = filtered.length
        const start = (page - 1) * limit
        const paginated = filtered.slice(start, start + limit)

        return {
          data: paginated,
          meta: {
            current_page: page,
            last_page: Math.ceil(total / limit) || 1,
            per_page: limit,
            total,
          },
        }
      }

      const params = Object.fromEntries(searchParams?.entries() || [])
      const apiParams = {
        ...params,
        limit,
        offset: (page - 1) * limit,
      }
      const response = await api.get(apiEndpoint, { params: apiParams })
      if (response.isError) throw new Error(response.message)

      // Normalize: support API response with { data, total, limit, offset }
      const raw = response as {
        data?: T[]
        total?: number
        limit?: number
        offset?: number
        meta?: PaginationMeta
      }
      if (
        raw.total !== undefined &&
        raw.limit !== undefined &&
        raw.offset !== undefined &&
        !raw.meta
      ) {
        const total = raw.total
        const perPage = raw.limit
        return {
          ...response,
          data: raw.data ?? [],
          meta: {
            current_page: Math.floor(raw.offset / perPage) + 1,
            last_page: Math.ceil(total / perPage) || 1,
            per_page: perPage,
            total,
          },
        }
      }
      return response
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const data = React.useMemo(() => {
    const apiData = queryData?.data
    if (Array.isArray(apiData)) return apiData as T[]
    return []
  }, [queryData])

  // عند تفعيل وضع الترتيب، نُهيئ القائمة من البيانات الحالية
  React.useEffect(() => {
    if (isReorderMode && data.length > 0) {
      setReorderedData([...data])
    }
  }, [isReorderMode, data.length])

  const displayData =
    isReorderMode ? (reorderedData.length > 0 ? reorderedData : data) : data

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return
    setReorderedData((prev) => {
      const next = [...prev]
      const [removed] = next.splice(draggedIndex, 1)
      next.splice(dropIndex, 0, removed)
      return next
    })
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSaveOrder = async () => {
    try {
      setIsSavingOrder(true)
      const order = displayData.map((row, i) => ({
        id: (row as { id: number }).id,
        orderIndex: (page - 1) * limit + i,
      }))
      const response = await api.patch(resolvedReorderEndpoint, { order })
      if (response.isError) throw new Error(response.message)
      toast.success("تم حفظ الترتيب بنجاح")
      queryClient.invalidateQueries({ queryKey: ["table-data", apiEndpoint] })
      setIsReorderMode(false)
    } catch {
      toast.error("فشل حفظ الترتيب")
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleCancelReorder = () => {
    setIsReorderMode(false)
    setDraggedIndex(null)
  }

  const pagination: PaginationMeta = React.useMemo(() => {
    return (
      queryData?.meta || {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
      }
    )
  }, [queryData])

  // Update URL params
  const updateParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString() || "")
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // Handle search
  const handleSearch = React.useCallback(
    (value: string) => {
      setSearchValue(value)
      updateParams({ search: value || null, page: "1" })
    },
    [updateParams]
  )

  // Handle sort
  const handleSort = (columnKey: string) => {
    let newDirection: "asc" | "desc" | null = null
    let newColumn: string | null = columnKey

    if (sortColumn === columnKey) {
      if (sortDirection === null || sortDirection === "asc") {
        newDirection = sortDirection === null ? "asc" : "desc"
      } else {
        newDirection = null
        newColumn = null
      }
    } else {
      newDirection = "asc"
    }

    setSortColumn(newColumn)
    setSortDirection(newDirection)

    if (newDirection === null) {
      updateParams({ sort_field: null, sort_order: null })
    } else {
      updateParams({ sort_field: columnKey, sort_order: newDirection })
    }
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage.toString() })
  }

  // Handle limit (page size) change — reset to page 1
  const handleLimitChange = (newLimit: string) => {
    updateParams({ limit: newLimit, page: "1" })
  }

  // Handle delete
  const handleDeleteClick = (row: T) => {
    setSelectedRow(row)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedRow) return

    try {
      setIsDeleting(true)
      if (onDeleteConfirm) {
        await onDeleteConfirm(selectedRow)
      } else {
        const baseEndpoint = apiEndpoint.replace(/\?.*$/, "")
        const response = await api.delete(`${baseEndpoint}/${(selectedRow as { id: number }).id}`)
        if (response.message) {
          toast.success(response.message)
        } else {
          toast.success("تم الحذف بنجاح")
        }
      }
      queryClient.invalidateQueries({ queryKey: ["table-data", apiEndpoint] })
      setDeleteDialogOpen(false)
      setSelectedRow(null)
    } catch {
      toast.error("فشل الحذف")
    } finally {
      setIsDeleting(false)
    }
  }

  // Default columns with ID
  const allColumns: TableColumn<T>[] = React.useMemo(() => {
    const idColumn: TableColumn<T> = {
      key: "id",
      label: "#",
      sortable: true,
      width: "w-16",
      render: (value) => (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {String(value)}
        </span>
      ),
    }
    return [idColumn, ...columns]
  }, [columns])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pr-10 bg-secondary"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => handleSearch("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {enableReorder && !isReorderMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsReorderMode(true)}
            >
              <GripVertical className="h-4 w-4" />
              ترتيب بالسحب والإفلات
            </Button>
          )}
          {enableReorder && isReorderMode && (
            <>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
              >
                {isSavingOrder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSavingOrder ? "جاري الحفظ..." : "حفظ الترتيب"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelReorder}
                disabled={isSavingOrder}
              >
                إلغاء
              </Button>
            </>
          )}
          {onAdd && !isReorderMode && (
            <Button onClick={onAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              {enableReorder && isReorderMode && (
                <TableHead className="w-10 text-muted-foreground font-medium" />
              )}
              {allColumns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "text-muted-foreground font-medium",
                    column.width,
                    column.sortable && "cursor-pointer select-none"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <>
                        {sortDirection === "asc" && (
                          <ChevronUp className="h-4 w-4" />
                        )}
                        {sortDirection === "desc" && (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </>
                    )}
                  </div>
                </TableHead>
              ))}
              {enableActions && (
                <TableHead className="w-32 text-muted-foreground font-medium">
                  الإجراءات
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {Array.from({ length: skeletonRows }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {allColumns.map((column) => (
                      <TableCell key={column.key}>
                        <Skeleton className="h-6 w-full max-w-[200px]" />
                      </TableCell>
                    ))}
                    {enableActions && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </>
            ) : displayData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    allColumns.length +
                    (enableActions ? 1 : 0) +
                    (enableReorder && isReorderMode ? 1 : 0)
                  }
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Filter className="h-8 w-8 text-muted-foreground/50" />
                    {emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((row, rowIndex) => (
                <TableRow
                  key={String((row as { id: number }).id)}
                  draggable={enableReorder && isReorderMode}
                  onDragStart={() => enableReorder && isReorderMode && handleDragStart(rowIndex)}
                  onDragOver={enableReorder && isReorderMode ? handleDragOver : undefined}
                  onDrop={(e) => enableReorder && isReorderMode && handleDrop(e, rowIndex)}
                  onDragEnd={enableReorder && isReorderMode ? handleDragEnd : undefined}
                  className={cn(
                    "border-b border-border/50 hover:bg-secondary/30",
                    enableReorder && isReorderMode && "cursor-grab active:cursor-grabbing",
                    draggedIndex === rowIndex && "opacity-50 bg-primary/5"
                  )}
                >
                  {enableReorder && isReorderMode && (
                    <TableCell className="w-10 p-2 text-muted-foreground">
                      <div className="flex cursor-grab active:cursor-grabbing touch-none" aria-hidden>
                        <GripVertical className="h-4 w-4" />
                      </div>
                    </TableCell>
                  )}
                  {allColumns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render
                        ? column.render((row as Record<string, unknown>)[column.key], row)
                        : String((row as Record<string, unknown>)[column.key] ?? "")}
                    </TableCell>
                  ))}
                  {enableActions && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {enableView && actions?.onView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => actions.onView?.(row)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {enableEdit && actions?.onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => actions.onEdit?.(row)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {enableDelete && (
                          <Button
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-destructive!"
                            onClick={() => handleDeleteClick(row)}
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

      {/* Pagination + limit selector */}
      {pagination.total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              عرض {(pagination.current_page - 1) * pagination.per_page + 1} -{" "}
              {Math.min(
                pagination.current_page * pagination.per_page,
                pagination.total
              )}{" "}
              من {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                عدد العرض:
              </span>
              <Select
                value={String(pagination.per_page)}
                onValueChange={handleLimitChange}
              >
                <SelectTrigger size="sm" className="w-[72px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {limitOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {pagination.last_page > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    pagination.current_page > 1 &&
                    handlePageChange(pagination.current_page - 1)
                  }
                  className={cn(
                    pagination.current_page === 1 &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                .filter((page) => {
                  const current = pagination.current_page
                  return (
                    page === 1 ||
                    page === pagination.last_page ||
                    Math.abs(page - current) <= 1
                  )
                })
                .map((page, i, arr) => (
                  <React.Fragment key={page}>
                    {i > 0 && arr[i - 1] !== page - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={page === pagination.current_page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </React.Fragment>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    pagination.current_page < pagination.last_page &&
                    handlePageChange(pagination.current_page + 1)
                  }
                  className={cn(
                    pagination.current_page === pagination.last_page &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTitle}</DialogTitle>
            <DialogDescription>
              {selectedRow && deleteDescription
                ? deleteDescription(selectedRow)
                : "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "جاري الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
