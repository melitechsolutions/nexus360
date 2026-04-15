import { useState, useEffect, useCallback, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings2, X, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";

export interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

export interface TableColumnSettingsProps {
  columns: ColumnConfig[];
  visibleColumns: Set<string>;
  onToggleColumn: (key: string) => void;
  onReset?: () => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export function TableColumnSettings({
  columns,
  visibleColumns,
  onToggleColumn,
  onReset,
  pageSize,
  onPageSizeChange,
}: TableColumnSettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Table Settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[380px]">
        <SheetHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <SheetTitle>Table Settings</SheetTitle>
          </div>
        </SheetHeader>
        <div className="mt-6 space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-3 mb-2">Column Visibility</p>
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={visibleColumns.has(col.key)}
                onCheckedChange={() => onToggleColumn(col.key)}
              />
              <span className="text-sm">{col.label}</span>
            </label>
          ))}
        </div>
        {onPageSizeChange && (
          <div className="mt-4 px-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Rows Per Page</p>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={pageSize || 25}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-6 flex gap-2">
          {onReset && (
            <Button
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => {
                onReset();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Hook to manage column visibility state with optional backend persistence.
 * @param columns Column config definitions
 * @param tableName Optional table identifier for backend persistence. When provided,
 *   preferences are synced to the userTablePreferences table via tRPC.
 */
export function useColumnVisibility(columns: ColumnConfig[], tableName?: string) {
  const getDefaults = useCallback(() => {
    const s = new Set<string>();
    columns.forEach((col) => {
      if (col.defaultVisible !== false) s.add(col.key);
    });
    return s;
  }, [columns]);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(getDefaults);
  const [pageSize, setPageSize] = useState(25);
  const initialLoadDone = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load preferences from backend
  const { data: savedPrefs } = trpc.tablePreferences.get.useQuery(
    { tableName: tableName || "" },
    { enabled: !!tableName }
  );

  // Save mutation
  const saveMutation = trpc.tablePreferences.save.useMutation();
  const resetMutation = trpc.tablePreferences.reset.useMutation();

  // Apply saved preferences once loaded
  useEffect(() => {
    if (savedPrefs && !initialLoadDone.current) {
      initialLoadDone.current = true;
      if (savedPrefs.visibleColumns) {
        setVisibleColumns(new Set(savedPrefs.visibleColumns));
      }
      if (savedPrefs.pageSize) {
        setPageSize(savedPrefs.pageSize);
      }
    }
  }, [savedPrefs]);

  // Debounced save to backend
  const debouncedSave = useCallback(
    (cols: Set<string>, ps: number) => {
      if (!tableName) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveMutation.mutate({
          tableName,
          visibleColumns: Array.from(cols),
          pageSize: ps,
        });
      }, 800);
    },
    [tableName, saveMutation]
  );

  const toggleColumn = useCallback(
    (key: string) => {
      setVisibleColumns((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        debouncedSave(next, pageSize);
        return next;
      });
    },
    [debouncedSave, pageSize]
  );

  const updatePageSize = useCallback(
    (size: number) => {
      setPageSize(size);
      debouncedSave(visibleColumns, size);
    },
    [debouncedSave, visibleColumns]
  );

  const isVisible = useCallback(
    (key: string) => visibleColumns.has(key),
    [visibleColumns]
  );

  const reset = useCallback(() => {
    const defaults = getDefaults();
    setVisibleColumns(defaults);
    setPageSize(25);
    if (tableName) {
      resetMutation.mutate({ tableName });
    }
  }, [getDefaults, tableName, resetMutation]);

  return { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset };
}
