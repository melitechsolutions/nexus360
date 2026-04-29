import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Search, X, Filter } from "lucide-react";
import { getPaymentMethodOptions } from "@/const/paymentMethods";

interface ReceiptSearchFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: ReceiptFilters) => void;
  isLoading?: boolean;
}

export interface ReceiptFilters {
  paymentMethod?: "cash" | "bank" | "mpesa" | "card" | "all";
  sortBy?: "date" | "amount" | "client";
  sortOrder?: "asc" | "desc";
}

export function ReceiptSearchFilter({
  onSearch,
  onFilter,
  isLoading = false,
}: ReceiptSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ReceiptFilters>({
    paymentMethod: "all",
    sortBy: "date",
    sortOrder: "desc",
  });
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      onSearch(value);
    },
    [onSearch]
  );

  const handleFilterChange = useCallback(
    (key: keyof ReceiptFilters, value: string) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFilter(newFilters);
    },
    [filters, onFilter]
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    const defaultFilters: ReceiptFilters = {
      paymentMethod: "all",
      sortBy: "date",
      sortOrder: "desc",
    };
    setFilters(defaultFilters);
    onFilter(defaultFilters);
    onSearch("");
  }, [onFilter, onSearch]);

  const hasActiveFilters =
    searchQuery ||
    filters.paymentMethod !== "all" ||
    filters.sortBy !== "date" ||
    filters.sortOrder !== "desc";

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search receipts..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-8"
          disabled={isLoading}
        />
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(hasActiveFilters && "bg-blue-50 text-blue-600")}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={filters.paymentMethod || "all"}
                onValueChange={(value) =>
                  handleFilterChange("paymentMethod", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {getPaymentMethodOptions().map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={filters.sortBy || "date"}
                onValueChange={(value) =>
                  handleFilterChange("sortBy", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Order</label>
              <Select
                value={filters.sortOrder || "desc"}
                onValueChange={(value) =>
                  handleFilterChange("sortOrder", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="flex-1"
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
