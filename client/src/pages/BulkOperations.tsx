import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { FormField } from "@/components/FormField";
import BulkProgressTracker from "@/components/BulkProgressTracker";
import {
  FileUp,
  Download,
  Copy,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/format";
import { StatsCard } from "@/components/ui/stats-card";

type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "converted";

interface SelectedQuote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
}

export default function BulkOperations() {
  // State management
  const [selectedQuotes, setSelectedQuotes] = useState<SelectedQuote[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus | "">("sent");
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [generateCount, setGenerateCount] = useState("5");
  const [templateId, setTemplateId] = useState("");

  // Data fetching
  const { data: quotes = [] } = trpc.quotes.list.useQuery({
    limit: 1000,
  });

  const { data: templates = [] } = trpc.quotes.listTemplates.useQuery({});

  // Mutations
  const updateStatusMutation = trpc.bulkOperations.updateQuoteStatus.useMutation();
  const deleteQuotesMutation = trpc.bulkOperations.deleteQuotes.useMutation();
  const generateBulkMutation = trpc.bulkOperations.generateBulkQuotes.useMutation();
  const exportMutation = trpc.bulkOperations.exportQuotesToCSV.useQuery(
    { filters: {} },
    { enabled: false }
  );

  // Handlers
  const handleSelectQuote = (quote: SelectedQuote) => {
    const isSelected = selectedQuotes.find(q => q.id === quote.id);
    if (isSelected) {
      setSelectedQuotes(selectedQuotes.filter(q => q.id !== quote.id));
    } else {
      setSelectedQuotes([...selectedQuotes, quote]);
    }
  };

  const handleSelectAll = () => {
    if (selectedQuotes.length === quotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(
        quotes.map(q => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          status: q.status as QuoteStatus,
        }))
      );
    }
  };

  const handleUpdateStatus = async () => {
    if (selectedQuotes.length === 0 || !selectedStatus) {
      toast.error("Please select quotes and a status");
      return;
    }

    setOperationInProgress(true);
    try {
      const result = await updateStatusMutation.mutateAsync({
        ids: selectedQuotes.map(q => q.id),
        status: selectedStatus,
      });

      if (result.success) {
        toast.success(`Updated ${result.updated} quotes to ${selectedStatus}`);
        setSelectedQuotes([]);
        setSelectedStatus("");
      } else {
        toast.error(`Updated ${result.updated} quotes. ${result.failed?.length || 0} failed`);
      }
    } catch (error) {
      toast.error("Failed to update quotes");
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleDeleteQuotes = async () => {
    if (selectedQuotes.length === 0) {
      toast.error("Please select quotes to delete");
      return;
    }

    setOperationInProgress(true);
    try {
      const result = await deleteQuotesMutation.mutateAsync({
        ids: selectedQuotes.map(q => q.id),
      });

      if (result.success) {
        toast.success(`Deleted ${result.deleted} quotes`);
        setSelectedQuotes([]);
      }
    } catch (error) {
      toast.error("Failed to delete quotes");
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleGenerateBulk = async () => {
    if (!templateId || !generateCount) {
      toast.error("Please select a template and quantity");
      return;
    }

    setOperationInProgress(true);
    try {
      const clientIds = quotes.slice(0, Math.min(parseInt(generateCount), 50)).map(q => q.clientId);
      
      const result = await generateBulkMutation.mutateAsync({
        templateId,
        quantity: Math.min(parseInt(generateCount), 100),
        clientIds,
        startDate: new Date(),
        expirationDays: 30,
      });

      if (result.success) {
        toast.success(`Generated ${result.created} quotes from template`);
        setTemplateId("");
        setGenerateCount("5");
      } else {
        toast.error(`Generated ${result.created} quotes. ${result.failed?.length || 0} failed`);
      }
    } catch (error) {
      toast.error("Failed to generate quotes");
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleExportCSV = async () => {
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
      }
    } catch (error) {
      toast.error("Failed to export quotes");
    }
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) { toast.error("Could not read file"); return; }
      const lines = text.trim().split("\n");
      if (lines.length < 2) { toast.error("CSV file is empty or has no data rows"); return; }
      toast.success(`Loaded ${lines.length - 1} rows from ${file.name}. Use the Generate tab to process.`);
    };
    reader.readAsText(file);
  };

  const statusStats = {
    draft: quotes.filter(q => q.status === "draft").length,
    sent: quotes.filter(q => q.status === "sent").length,
    accepted: quotes.filter(q => q.status === "accepted").length,
    declined: quotes.filter(q => q.status === "declined").length,
    expired: quotes.filter(q => q.status === "expired").length,
    converted: quotes.filter(q => q.status === "converted").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bulk Operations</h1>
        <p className="text-muted-foreground mt-2">
          Manage multiple quotes efficiently with batch operations
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatsCard label="Draft" value={statusStats.draft} color="border-l-pink-500" />
        <StatsCard label="Sent" value={statusStats.sent} color="border-l-emerald-500" />
        <StatsCard label="Accepted" value={statusStats.accepted} color="border-l-orange-500" />
        <StatsCard label="Declined" value={statusStats.declined} color="border-l-purple-500" />
        <StatsCard label="Expired" value={statusStats.expired} color="border-l-green-500" />
        <StatsCard label="Converted" value={statusStats.converted} color="border-l-blue-500" />
      </div>

      {/* Operation Progress */}
      {operationInProgress && <BulkProgressTracker />}

      {/* Tabs */}
      <Tabs defaultValue="status-update" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status-update">Update Status</TabsTrigger>
          <TabsTrigger value="generate">Generate Bulk</TabsTrigger>
          <TabsTrigger value="import">Import CSV</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        {/* Status Update Tab */}
        <TabsContent value="status-update">
          <Card>
            <CardHeader>
              <CardTitle>Update Quote Status</CardTitle>
              <CardDescription>
                Select quotes and update their status in bulk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  New Status
                </label>
                <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as QuoteStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quote List */}
              {quotes.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedQuotes.length === quotes.length}
                            onChange={handleSelectAll}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.slice(0, 20).map((q: any) => (
                        <TableRow key={q.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedQuotes.some(sq => sq.id === q.id)}
                              onChange={() =>
                                handleSelectQuote({
                                  id: q.id,
                                  quoteNumber: q.quoteNumber,
                                  status: q.status,
                                })
                              }
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              q.status === "sent" ? "bg-blue-100 text-blue-800" :
                              q.status === "accepted" ? "bg-green-100 text-green-800" :
                              q.status === "declined" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {q.status}
                            </span>
                          </TableCell>
                          <TableCell>{formatCurrency(q.total || 0)}</TableCell>
                          <TableCell>{formatDate(q.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState
                  title="No quotes found"
                  description="Create some quotes first"
                  icon={<AlertCircle />}
                />
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpdateStatus}
                  disabled={operationInProgress || selectedQuotes.length === 0}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Update Status ({selectedQuotes.length})
                </Button>
                <Button
                  onClick={handleDeleteQuotes}
                  variant="destructive"
                  disabled={operationInProgress || selectedQuotes.length === 0}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedQuotes.length})
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Bulk Tab */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Generate Bulk Quotes</CardTitle>
              <CardDescription>
                Create multiple quotes from a template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Template
                </label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quantity (1-100)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(e.target.value)}
                  placeholder="5"
                />
              </div>

              <Button
                onClick={handleGenerateBulk}
                disabled={operationInProgress || !templateId}
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Generate {generateCount} Quotes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Quotes from CSV</CardTitle>
              <CardDescription>
                Upload CSV file to bulk import quotes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("csv-import-input")?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.name.endsWith(".csv")) {
                    handleCsvFile(file);
                  } else {
                    toast.error("Please drop a CSV file");
                  }
                }}
              >
                <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop CSV file or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV should contain columns: quoteNumber, clientId, subject, subtotal, taxRate
                </p>
              </div>

              <input
                id="csv-import-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvFile(file);
                  e.target.value = "";
                }}
              />
              <Button className="w-full gap-2" onClick={() => document.getElementById("csv-import-input")?.click()}>
                <FileUp className="w-4 h-4" />
                Select CSV File
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Quotes</CardTitle>
              <CardDescription>
                Download quotes as CSV for external use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Export format: Quote Number, Client ID, Status, Subject, Subtotal, Tax Rate, Tax Amount, Total, Valid From, Valid Until, Created At
                </p>
              </div>

              <Button
                onClick={handleExportCSV}
                className="w-full gap-2"
                disabled={quotes.length === 0}
              >
                <Download className="w-4 h-4" />
                Download {quotes.length} Quotes as CSV
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
