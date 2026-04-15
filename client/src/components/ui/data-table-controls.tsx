import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 500, 1000] as const;
export type PageSize = typeof PAGE_SIZE_OPTIONS[number];

/* ─── Pagination Controls ─────────────────────────────────────── */
interface PaginationControlsProps {
  total: number;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  className?: string;
}

export function PaginationControls({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className={cn("flex items-center justify-between gap-4 py-3 px-1", className)}>
      {/* Rows per page */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">Rows per page:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            onPageSizeChange(Number(v) as PageSize);
            onPageChange(1);
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-48 overflow-y-auto">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Page info + navigation */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span className="hidden sm:inline mr-2">
          {start}–{end} of {total}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-2 text-sm font-medium">
          {page} / {totalPages}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Bulk Actions Bar ─────────────────────────────────────────── */
interface BulkActionsBarProps<T extends string> {
  selectedIds: T[];
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  someSelected: boolean;
  actions: {
    label: string;
    icon?: React.ReactNode;
    variant?: "default" | "destructive" | "outline" | "secondary";
    onClick: (ids: T[]) => void;
  }[];
  className?: string;
}

export function BulkActionsBar<T extends string>({
  selectedIds,
  totalCount,
  onSelectAll,
  allSelected,
  someSelected,
  actions,
  className,
}: BulkActionsBarProps<T>) {
  const count = selectedIds.length;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
        count > 0
          ? "bg-primary/5 border-primary/20"
          : "bg-muted/50 border-transparent",
        className
      )}
    >
      <Checkbox
        checked={allSelected ? true : someSelected ? "indeterminate" : false}
        onCheckedChange={(v) => onSelectAll(!!v)}
        aria-label="Select all"
      />
      <span className="text-sm text-muted-foreground">
        {count > 0 ? (
          <span className="text-primary font-medium">{count} selected</span>
        ) : (
          <span>Select all ({totalCount})</span>
        )}
      </span>

      {count > 0 && (
        <div className="flex items-center gap-2 ml-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant || "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => action.onClick(selectedIds)}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Hook: useTableSelection ──────────────────────────────────── */
export function useTableSelection<T extends string>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const toggle = (id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(items) : new Set());
  };

  const clear = () => setSelectedIds(new Set());

  return {
    selectedIds: Array.from(selectedIds),
    selectedSet: selectedIds,
    toggle,
    selectAll,
    clear,
    allSelected: items.length > 0 && selectedIds.size === items.length,
    someSelected: selectedIds.size > 0 && selectedIds.size < items.length,
  };
}

/* ─── Hook: usePagination ──────────────────────────────────────── */
export function usePagination(defaultPageSize: PageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(defaultPageSize);

  const paginate = <T,>(items: T[]): T[] => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const resetPage = () => setPage(1);

  return {
    page,
    pageSize,
    setPage,
    setPageSize: (size: PageSize) => {
      setPageSize(size);
      setPage(1);
    },
    paginate,
    resetPage,
  };
}


