import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDate } from "@/utils/format";

type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "converted";

interface FilterOptions {
  status?: QuoteStatus;
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export default function BulkExport() {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus | "all">("all");
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const { data: quotes = [] } = trpc.quotes.list.useQuery({
    limit: 1000,
  });

  const exportMutation = trpc.bulkOperations.exportQuotesToCSV.useQuery(
    { filters: selectedStatus !== "all" ? { status: selectedStatus as QuoteStatus } : {} },
    { enabled: false }
  );

  const handleExport = async () => {
    try {
      const result = await exportMutation.refetch();
      
      if (result.data?.success) {
        const blob = new Blob([result.data.data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.data.fileName || "quotes-export.csv";
        link.click();
        URL.revokeObjectURL(url);

        toast.success(`Exported ${result.data.count} quotes`);
      } else {
        toast.error("Failed to export quotes");
      }
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const statuses: QuoteStatus[] = ["draft", "sent", "accepted", "declined", "expired", "converted"];
  const statusCounts = statuses.reduce((acc, status) => {
    acc[status] = quotes.filter((q: any) => q.status === status).length;
    return acc;
  }, {} as Record<QuoteStatus, number>);

  const exportCount = selectedStatus === "all"
    ? quotes.length
    : statusCounts[selectedStatus as QuoteStatus] || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Export Quotes</h1>
        <p className="text-muted-foreground mt-2">
          Download quotes in CSV format for external use
        </p>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Settings</CardTitle>
          <CardDescription>
            Configure export filters and format options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Filter by Status</Label>
            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as QuoteStatus | "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses ({quotes.length})</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Columns */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Columns</Label>
            <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox id="col-quote" defaultChecked disabled />
                <label htmlFor="col-quote" className="text-sm cursor-pointer">
                  Quote Number (required)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="col-client" defaultChecked disabled />
                <label htmlFor="col-client" className="text-sm cursor-pointer">
                  Client ID (required)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="col-status" defaultChecked disabled />
                <label htmlFor="col-status" className="text-sm cursor-pointer">
                  Status (required)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="col-subject" defaultChecked disabled />
                <label htmlFor="col-subject" className="text-sm cursor-pointer">
                  Subject (required)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="col-amounts"
                  defaultChecked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <label htmlFor="col-amounts" className="text-sm cursor-pointer">
                  Financial Data (Subtotal, Tax, Total)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="col-dates" defaultChecked disabled />
                <label htmlFor="col-dates" className="text-sm cursor-pointer">
                  Dates (Valid From/Until, Created At)
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              Export Preview
            </p>
            <p className="text-sm text-blue-800">
              You will export <strong>{exportCount}</strong> quotes in CSV format
            </p>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            className="w-full gap-2 text-base h-10"
            disabled={exportCount === 0}
          >
            <Download className="w-4 h-4" />
            Download {exportCount} Quotes
          </Button>
        </CardContent>
      </Card>

      {/* Format Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV Format Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Included Columns:</h4>
            <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs space-y-1">
              <p>• Quote Number</p>
              <p>• Client ID</p>
              <p>• Status</p>
              <p>• Subject</p>
              {includeMetadata && (
                <>
                  <p>• Subtotal</p>
                  <p>• Tax Rate (%)  </p>
                  <p>• Tax Amount</p>
                  <p>• Total</p>
                </>
              )}
              <p>• Valid From</p>
              <p>• Valid Until</p>
              <p>• Created At</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Date Format:</h4>
            <p className="text-sm text-muted-foreground">
              All dates are in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Currency Format:</h4>
            <p className="text-sm text-muted-foreground">
              All amounts are in numeric format (no currency symbols)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Common Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Use Cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Generate Reports
            </h4>
            <p className="text-sm text-muted-foreground">
              Export all quotes to analyze conversion rates, revenue, and client distribution
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Backup Data
            </h4>
            <p className="text-sm text-muted-foreground">
              Create regular CSV backups of your quotes for archival purposes
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Third-Party Integration
            </h4>
            <p className="text-sm text-muted-foreground">
              Export quotes to spreadsheet software or accounting systems
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
