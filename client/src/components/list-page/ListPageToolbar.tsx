import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  BarChart3,
  Download,
  Upload,
  Filter,
  Printer,
  Plus,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListPageToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onCreateClick?: () => void;
  createLabel?: string;
  onExportClick?: () => void;
  onImportClick?: () => void;
  onFilterClick?: () => void;
  onPrintClick?: () => void;
  onChartClick?: () => void;
  onGridViewClick?: () => void;
  showGridView?: boolean;
  showChart?: boolean;
  showExport?: boolean;
  showImport?: boolean;
  showFilter?: boolean;
  showPrint?: boolean;
  showCreate?: boolean;
  filterContent?: React.ReactNode;
  className?: string;
}

export function ListPageToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  onCreateClick,
  createLabel = "Create",
  onExportClick,
  onImportClick,
  onFilterClick,
  onPrintClick,
  onChartClick,
  onGridViewClick,
  filterContent,
  showGridView = false,
  showChart = !!onChartClick,
  showExport = !!onExportClick,
  showImport = !!onImportClick,
  showFilter = !!filterContent || !!onFilterClick,
  showPrint = true,
  showCreate = true,
  className,
}: ListPageToolbarProps) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {showGridView && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onGridViewClick}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          )}
          {showChart && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onChartClick}
              title="Analytics"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          )}
          {showImport && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onImportClick}
              title="Import"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {showExport && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onExportClick}
              title="Export"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
          {showFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowFilterPanel(!showFilterPanel);
                onFilterClick?.();
              }}
              title="Filter"
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
          {showPrint && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onPrintClick ?? (() => window.print())}
              title="Print"
            >
              <Printer className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Create Button */}
        {showCreate && onCreateClick && (
          <Button
            onClick={onCreateClick}
            size="icon"
            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-lg ml-1"
            title={createLabel}
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && filterContent && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-muted/30">
          {filterContent}
        </div>
      )}
    </div>
  );
}
