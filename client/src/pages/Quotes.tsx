import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Copy, 
  ExternalLink,
  LogIn,
  FileText,
  Send,
  DollarSign,
  Clock,
  CheckCircle2
} from "lucide-react";
import { trpc } from "../utils/trpc";
import { EmptyState } from "../components/EmptyState";
import { formatDate } from "../utils/format";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkSendAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { StatsCard } from "@/components/ui/stats-card";

type QuoteStatus = "draft" | "sent" | "accepted" | "expired" | "declined" | "converted";

interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  subject: string;
  status: QuoteStatus;
  total: number;
  sentDate?: Date;
  acceptedDate?: Date;
  createdAt: Date;
}

export function Quotes() {
  const [, navigate] = useLocation();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());

  const quoteColumns: ColumnConfig[] = [
    { key: "quoteNumber", label: "Quote Number" },
    { key: "subject", label: "Subject" },
    { key: "status", label: "Status" },
    { key: "total", label: "Total" },
    { key: "created", label: "Created" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(quoteColumns, "quotes");

  const listQuery = trpc.quotes.list.useQuery(
    { limit: 100 },
    { enabled: true }
  );

  const deleteQuoteMutation = trpc.quotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Quote deleted");
      listQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete quote");
    },
  });

  const sendQuoteMutation = trpc.quotes.send.useMutation({
    onSuccess: () => {
      toast.success("Quote sent");
      listQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send quote");
    },
  });

  useEffect(() => {
    if (listQuery.data) {
      setQuotes(listQuery.data);
      setLoading(false);
    }
  }, [listQuery.data]);

  // Filter quotes
  useEffect(() => {
    let filtered = quotes;

    if (statusFilter !== "all") {
      filtered = filtered.filter((q) => q.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredQuotes(filtered);
  }, [quotes, statusFilter, searchTerm]);

  const handleSelectAll = () => {
    if (selectedQuotes.size === filteredQuotes.length) {
      setSelectedQuotes(new Set());
    } else {
      setSelectedQuotes(new Set(filteredQuotes.map((q) => q.id)));
    }
  };

  const handleSelectQuote = (id: string) => {
    const newSelected = new Set(selectedQuotes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuotes(newSelected);
  };

  const getStatusColor = (status: QuoteStatus) => {
    const statusColors: Record<QuoteStatus, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
      expired: "bg-orange-100 text-orange-800",
      converted: "bg-purple-100 text-purple-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: QuoteStatus) => {
    const labels: Record<QuoteStatus, string> = {
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      declined: "Declined",
      expired: "Expired",
      converted: "Converted to Invoice",
    };
    return labels[status] || status;
  };

  const handleExport = () => {
    const data = filteredQuotes.map((q) => ({
      "Quote #": q.quoteNumber,
      Subject: q.subject,
      Status: getStatusLabel(q.status),
      Total: `$${q.total.toFixed(2)}`,
      "Created": formatDate(new Date(q.createdAt)),
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading quotes...</p>
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <ModuleLayout
        title="Quotes & Estimates"
        description="Create and manage client quotes"
        icon={<FileText className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Sales", href: "/sales-pipeline" },
          { label: "Quotes" },
        ]}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div />
            <Button onClick={() => navigate("/quotes/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Quote
            </Button>
          </div>
          <EmptyState
            title="No Quotes Yet"
            description="Create your first quote to get started"
            actionLabel="Create Quote"
            onAction={() => navigate("/quotes/new")}
          />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Quotes & Estimates"
      description="Create and manage client quotes"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Sales", href: "/sales-pipeline" },
        { label: "Quotes" },
      ]}
    >
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard label="Total Quotes" value={quotes.length} icon={<FileText className="h-5 w-5" />} color="border-l-blue-500" />
        <StatsCard label="Total Value" value={`$${quotes.reduce((s, q) => s + q.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={<DollarSign className="h-5 w-5" />} color="border-l-green-500" />
        <StatsCard label="Accepted" value={quotes.filter(q => q.status === "accepted").length} icon={<CheckCircle2 className="h-5 w-5" />} color="border-l-emerald-500" />
        <StatsCard label="Pending" value={quotes.filter(q => q.status === "sent" || q.status === "draft").length} icon={<Clock className="h-5 w-5" />} color="border-l-yellow-500" />
      </div>

      {/* Toolbar */}
      <ListPageToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search quotes..."
        onCreateClick={() => navigate("/quotes/new")}
        createLabel="New Quote"
        onExportClick={handleExport}
        onPrintClick={() => window.print()}
        filterContent={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as QuoteStatus | "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Bulk Actions */}
      <EnhancedBulkActions
          selectedCount={selectedQuotes.size}
          onClear={() => setSelectedQuotes(new Set())}
          actions={[
            bulkSendAction(selectedQuotes, (ids) => { ids.forEach((id) => sendQuoteMutation.mutate({ id })); setSelectedQuotes(new Set()); }),
            bulkExportAction(selectedQuotes, quotes, quoteColumns, "quotes"),
            bulkCopyIdsAction(selectedQuotes),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedQuotes, (ids) => { ids.forEach((id) => deleteQuoteMutation.mutate(id)); setSelectedQuotes(new Set()); }),
          ]}
        />

      {/* Quotes Table */}
      {filteredQuotes.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredQuotes.length} quotes</span>
              <TableColumnSettings columns={quoteColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={selectedQuotes.size === filteredQuotes.length && filteredQuotes.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                    {isVisible("quoteNumber") && <TableHead>Quote Number</TableHead>}
                    {isVisible("subject") && <TableHead>Subject</TableHead>}
                    {isVisible("status") && <TableHead>Status</TableHead>}
                    {isVisible("total") && <TableHead className="text-right">Total</TableHead>}
                    {isVisible("created") && <TableHead>Created</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id} className={selectedQuotes.has(quote.id) ? "bg-primary/5" : ""}>
                      <TableCell><Checkbox checked={selectedQuotes.has(quote.id)} onCheckedChange={() => handleSelectQuote(quote.id)} /></TableCell>
                      {isVisible("quoteNumber") && <TableCell className="font-medium font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/quotes/${quote.id}`)}>{quote.quoteNumber}</TableCell>}
                      {isVisible("subject") && <TableCell>{quote.subject}</TableCell>}
                      {isVisible("status") && <TableCell><Badge className={getStatusColor(quote.status)}>{getStatusLabel(quote.status)}</Badge></TableCell>}
                      {isVisible("total") && <TableCell className="text-right font-semibold">${quote.total.toFixed(2)}</TableCell>}
                      {isVisible("created") && <TableCell className="text-muted-foreground">{formatDate(new Date(quote.createdAt))}</TableCell>}
                      <TableCell className="text-right">
                        <RowActionsMenu
                          primaryActions={[
                            { label: "View", icon: actionIcons.view, onClick: () => navigate(`/quotes/${quote.id}`) },
                          ]}
                          menuActions={[
                            { label: "Edit Quote", icon: actionIcons.edit, onClick: () => navigate(`/quotes/${quote.id}/edit`) },
                            { label: "Duplicate", icon: actionIcons.copy, onClick: () => navigate(`/quotes/${quote.id}/duplicate`) },
                            { label: "Send to Client", icon: <Send className="h-4 w-4" />, onClick: () => sendQuoteMutation.mutate({ id: quote.id }), separator: true },
                            { label: "Convert to Invoice", icon: <LogIn className="h-4 w-4" />, onClick: () => navigate(`/quotes/${quote.id}/convert`) },
                            { label: "Download PDF", icon: actionIcons.download, onClick: () => { navigate(`/quotations/${quote.id}`); setTimeout(() => window.print(), 500); } },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No Quotes Found"
          description="Try adjusting your filters to find what you're looking for"
          actionLabel="Create New Quote"
          onAction={() => navigate("/quotes/new")}
        />
      )}
    </div>
    </ModuleLayout>
  );
}
