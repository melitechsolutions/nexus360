import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useUserLookup } from "@/hooks/useUserLookup";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Eye, Edit, Trash2, ArrowUpDown, Loader2, Mail, Link2, Copy, CreditCard, RotateCcw, FolderOpen, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { PaginationControls, usePagination } from "@/components/ui/data-table-controls";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { SummaryStatCards, type SummaryCard } from "@/components/list-page/SummaryStatCards";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { RowActionsMenu, actionIcons, type RowAction } from "@/components/list-page/RowActionsMenu";

interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  client: string;
  clientEmail?: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "draft" | "sent";
  issueDate: string;
  dueDate: string;
  project?: string;
  createdBy?: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

type SortField = "invoiceNumber" | "client" | "amount" | "issueDate" | "dueDate" | "status";
type SortOrder = "asc" | "desc";

const INVOICE_COLUMNS: ColumnConfig[] = [
  { key: "id", label: "ID", defaultVisible: true },
  { key: "date", label: "Date", defaultVisible: true },
  { key: "dueDate", label: "Due Date", defaultVisible: true },
  { key: "client", label: "Company Name", defaultVisible: true },
  { key: "createdBy", label: "Created By", defaultVisible: true },
  { key: "amount", label: "Amount", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "project", label: "Project", defaultVisible: false },
  { key: "approvedBy", label: "Approved By", defaultVisible: false },
  { key: "approvalDate", label: "Approval Date", defaultVisible: false },
  { key: "contact", label: "Contact", defaultVisible: false },
  { key: "tax", label: "Tax", defaultVisible: false },
  { key: "balance", label: "Balance", defaultVisible: false },
];

export default function Invoices() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { getUserName } = useUserLookup();
  const { allowed, isLoading } = useRequireFeature("accounting:invoices:view");
  const { allowed: canEmail, isLoading: emailLoading } = useRequireFeature("communications:email");
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("issueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(25);
  const { visibleColumns, toggleColumn, isVisible, pageSize: colPageSize, updatePageSize, reset } = useColumnVisibility(INVOICE_COLUMNS, "invoices");

  // Fetch real data from backend
  const { data: invoicesData = [], isLoading: isLoadingInvoices } = trpc.invoices.list.useQuery();
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  
  // Delete mutation
  const deleteInvoiceMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success("Invoice deleted successfully");
      setSelectedInvoices(new Set());
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  const bulkDeleteInvoicesMutation = trpc.invoices.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} invoice(s) deleted`);
      utils.invoices.list.invalidate();
      setSelectedInvoices(new Set());
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete invoices");
    },
  });

  // email reminder mutation
  const sendReminderMutation = trpc.email.sendPaymentReminder.useMutation({
    onSuccess: () => {
      toast.success("Payment reminder sent");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send reminder");
    },
  });

  // Update (status/category) mutation
  const updateInvoiceMutation = trpc.invoices.update.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success("Invoice updated");
    },
    onError: (err) => toast.error(err.message || "Failed to update invoice"),
  });

  // Download PDF mutation
  const downloadPDFMutation = trpc.invoices.downloadPDF.useMutation({
    onSuccess: (data) => {
      if (data?.success && data.data) {
        const byteChars = atob(data.data);
        const byteNumbers = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.fileName || "invoice.pdf";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to download PDF"),
  });

  // Clone invoice mutation
  const cloneInvoiceMutation = trpc.invoices.create.useMutation({
    onSuccess: (data) => {
      utils.invoices.list.invalidate();
      toast.success("Invoice cloned");
      if (data?.id) navigate(`/invoices/${data.id}/edit`);
    },
    onError: (err) => toast.error(err.message || "Failed to clone invoice"),
  });

  // Create recurring mutation
  const createRecurringMutation = trpc.invoices.payments.createRecurring.useMutation({
    onSuccess: () => {
      toast.success("Recurring invoice created");
    },
    onError: (err) => toast.error(err.message || "Failed to create recurring invoice"),
  });

  const handleCloneInvoice = (inv: any) => {
    if (!inv.clientId) {
      toast.error("Cannot clone invoice without a client");
      return;
    }
    cloneInvoiceMutation.mutate({
      clientId: inv.clientId,
      title: `${inv.title || inv.invoiceNumber} (Copy)`,
      status: "draft",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      subtotal: inv.subtotal || inv.amount || 0,
      taxAmount: inv.taxAmount || 0,
      discountAmount: inv.discountAmount || 0,
      total: inv.amount || 0,
      notes: inv.notes || "",
      terms: inv.terms || "",
    });
  };

  const handleDownloadPDF = (invId: string) => {
    downloadPDFMutation.mutate(invId);
  };

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading || emailLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  // Safely convert frozen Drizzle objects to plain JS objects
  const plainInvoicesData = (() => {
    if (!Array.isArray(invoicesData)) return [];
    return invoicesData.map(inv => {
      try {
        return JSON.parse(JSON.stringify(inv));
      } catch {
        return inv;
      }
    });
  })();

  const plainClientsData = (() => {
    if (!Array.isArray(clientsData)) return [];
    return clientsData.map(client => {
      try {
        return JSON.parse(JSON.stringify(client));
      } catch {
        return client;
      }
    });
  })();

  // Transform backend data to display format
  const invoices: InvoiceDisplay[] = (() => {
    if (!Array.isArray(plainInvoicesData)) return [];
    
    return plainInvoicesData.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber || `INV-${inv.id.slice(0, 8)}`,
      client: (plainClientsData as any[]).find((c: any) => c.id === inv.clientId)?.companyName || "Unknown Client",
      clientEmail: (plainClientsData as any[]).find((c: any) => c.id === inv.clientId)?.email,
      amount: (inv.total || 0) / 100,
      status: inv.status || "draft",
      issueDate: inv.issueDate ? format(new Date(inv.issueDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      dueDate: inv.dueDate ? format(new Date(inv.dueDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      project: inv.projectId ? "Project" : undefined,
      createdBy: inv.createdBy || "System",
      createdAt: inv.createdAt ? format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm") : undefined,
      approvedBy: inv.approvedBy || undefined,
      approvedAt: inv.approvedAt ? format(new Date(inv.approvedAt), "yyyy-MM-dd HH:mm") : undefined,
    }));
  })();

  // Filter and sort invoices
  const filteredAndSortedInvoices = (() => {
    let result = invoices.filter((invoice) => {
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.project?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "amount") {
        aVal = parseFloat(String(aVal));
        bVal = parseFloat(String(bVal));
      } else if (sortField === "issueDate" || sortField === "dueDate") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  })();

  const pagedInvoices = paginate(filteredAndSortedInvoices);

  const stats: SummaryCard[] = (() => {
    const total = (invoices || []).reduce((sum, inv) => sum + inv.amount, 0);
    const paid = (invoices || []).filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
    const pending = (invoices || []).filter((inv) => inv.status === "pending" || inv.status === "sent").reduce((sum, inv) => sum + inv.amount, 0);
    const overdue = (invoices || []).filter((inv) => inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0);
    const paidCount = (invoices || []).filter((inv) => inv.status === "paid").length;
    const pendingCount = (invoices || []).filter((inv) => inv.status === "pending" || inv.status === "sent").length;
    const overdueCount = (invoices || []).filter((inv) => inv.status === "overdue").length;
    const fmt = (v: number) => `Ksh ${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    return [
      { label: "Invoices", value: fmt(total), count: invoices.length, color: "blue" as const, progress: 100 },
      { label: "Payments", value: fmt(paid), count: paidCount, color: "green" as const, progress: total > 0 ? (paid / total) * 100 : 0 },
      { label: "Due", value: fmt(pending), count: pendingCount, color: "orange" as const, progress: total > 0 ? (pending / total) * 100 : 0 },
      { label: "Overdue", value: fmt(overdue), count: overdueCount, color: "red" as const, progress: total > 0 ? (overdue / total) * 100 : 0 },
    ];
  })();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending":
      case "sent": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "overdue": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <ModuleLayout
      title="Invoices"
      breadcrumbs={[
        { label: "App", href: "/crm-home" },
        { label: "Sales" },
        { label: "Invoices" },
      ]}
      actions={
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search"
          onCreateClick={() => navigate("/invoices/create")}
          createLabel="Create Invoice"
          onExportClick={() => {
            const csv = [
              ["Invoice #", "Client", "Amount", "Date", "Due Date", "Status"].join(","),
              ...filteredAndSortedInvoices.map(inv => [inv.invoiceNumber, inv.client, inv.amount, inv.issueDate, inv.dueDate, inv.status].join(","))
            ].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "invoices.csv"; a.click();
            URL.revokeObjectURL(url);
            toast.success("Exported invoices");
          }}
          onPrintClick={() => window.print()}
        />
      }
    >
      <div className="space-y-4">
        {/* Bulk Actions Bar */}
        <EnhancedBulkActions
          selectedCount={selectedInvoices.size}
          onClear={() => setSelectedInvoices(new Set())}
          actions={[
            { id: "sendReminders", label: "Send Reminders", icon: <Mail className="h-3.5 w-3.5" />, onClick: () => { selectedInvoices.forEach((invId) => { const inv = pagedInvoices.find((i) => i.id === invId); if (inv && inv.clientEmail && canEmail) sendReminderMutation.mutate({ invoiceId: invId, recipientEmail: inv.clientEmail }); }); } },
            bulkExportAction(selectedInvoices, pagedInvoices, INVOICE_COLUMNS, "invoices"),
            bulkCopyIdsAction(selectedInvoices),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedInvoices, (ids) => bulkDeleteInvoicesMutation.mutate(ids)),
          ]}
        />

        {/* Summary Stat Cards */}
        <SummaryStatCards cards={stats} />

        {/* Filter Row */}
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedInvoices.size === pagedInvoices.length && pagedInvoices.length > 0}
                      onCheckedChange={(checked) => {
                        setSelectedInvoices(checked ? new Set(pagedInvoices.map(i => i.id)) : new Set());
                      }}
                    />
                  </TableHead>
                  {isVisible("id") && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("invoiceNumber")}>
                      <span className="inline-flex items-center gap-1 text-primary">ID <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("date") && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("issueDate")}>
                      <span className="inline-flex items-center gap-1 text-primary">Date <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("dueDate") && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("dueDate")}>
                      <span className="inline-flex items-center gap-1 text-primary">Due Date <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("client") && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("client")}>
                      <span className="inline-flex items-center gap-1 text-primary">Company Name <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("createdBy") && (
                    <TableHead className="cursor-pointer select-none">
                      <span className="inline-flex items-center gap-1 text-primary">Created By <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("amount") && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("amount")}>
                      <span className="inline-flex items-center gap-1 text-primary">Amount <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("status") && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                      <span className="inline-flex items-center gap-1 text-primary">Status <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                  )}
                  {isVisible("project") && <TableHead>Project</TableHead>}
                  {isVisible("approvedBy") && <TableHead>Approved By</TableHead>}
                  {isVisible("approvalDate") && <TableHead>Approval Date</TableHead>}
                  {isVisible("contact") && <TableHead>Contact</TableHead>}
                  {isVisible("tax") && <TableHead>Tax</TableHead>}
                  {isVisible("balance") && <TableHead>Balance</TableHead>}
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      Action
                      <TableColumnSettings
                        columns={INVOICE_COLUMNS}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                        onReset={reset}
                        pageSize={pageSize}
                        onPageSizeChange={updatePageSize}
                      />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInvoices ? (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoices.has(inv.id)}
                          onCheckedChange={(checked) => {
                            const s = new Set(selectedInvoices);
                            checked ? s.add(inv.id) : s.delete(inv.id);
                            setSelectedInvoices(s);
                          }}
                        />
                      </TableCell>
                      {isVisible("id") && (
                        <TableCell>
                          <button className="text-primary hover:underline font-medium" onClick={() => navigate(`/invoices/${inv.id}`)}>
                            {inv.invoiceNumber}
                          </button>
                        </TableCell>
                      )}
                      {isVisible("date") && <TableCell>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "-"}</TableCell>}
                      {isVisible("dueDate") && <TableCell>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</TableCell>}
                      {isVisible("client") && (
                        <TableCell>
                          <button className="text-primary hover:underline" onClick={() => {/* navigate to client */}}>
                            {inv.client}
                          </button>
                        </TableCell>
                      )}
                      {isVisible("createdBy") && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {getUserName(inv.createdBy).charAt(0)}
                            </div>
                            {getUserName(inv.createdBy)}
                          </div>
                        </TableCell>
                      )}
                      {isVisible("amount") && (
                        <TableCell className="font-semibold">
                          Ksh {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      )}
                      {isVisible("status") && (
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(inv.status)}>
                            {(inv.status || "draft").charAt(0).toUpperCase() + (inv.status || "draft").slice(1)}
                          </Badge>
                        </TableCell>
                      )}
                      {isVisible("project") && <TableCell>{inv.project || "---"}</TableCell>}
                      {isVisible("approvedBy") && <TableCell className="text-sm text-muted-foreground">{getUserName(inv.approvedBy)}</TableCell>}
                      {isVisible("approvalDate") && <TableCell className="text-sm text-muted-foreground">{inv.approvedAt || "---"}</TableCell>}
                      {isVisible("contact") && <TableCell>---</TableCell>}
                      {isVisible("tax") && <TableCell>---</TableCell>}
                      {isVisible("balance") && <TableCell>---</TableCell>}
                      <TableCell>
                        <RowActionsMenu
                          primaryActions={[
                            { label: "Delete", icon: actionIcons.delete, onClick: () => { if (confirm("Delete this invoice?")) deleteInvoiceMutation.mutate(inv.id); }, variant: "destructive" },
                            { label: "Edit", icon: actionIcons.edit, onClick: () => navigate(`/invoices/${inv.id}/edit`) },
                            { label: "View", icon: actionIcons.view, onClick: () => navigate(`/invoices/${inv.id}`) },
                          ]}
                          menuActions={[
                            { label: "Invoice URL", icon: <Link2 className="h-4 w-4" />, onClick: () => { navigator.clipboard.writeText(`${window.location.origin}/invoices/${inv.id}`); toast.success("URL copied"); } },
                            { label: "Email To Client", icon: actionIcons.email, onClick: () => { if (inv.clientEmail && canEmail) sendReminderMutation.mutate({ invoiceId: inv.id, recipientEmail: inv.clientEmail }); }, hidden: !inv.clientEmail },
                            { label: "Mark as Sent", icon: <Tag className="h-4 w-4" />, onClick: () => updateInvoiceMutation.mutate({ id: inv.id, status: "sent" }) },
                            { label: "Mark as Paid", icon: <Tag className="h-4 w-4" />, onClick: () => updateInvoiceMutation.mutate({ id: inv.id, status: "paid" }) },
                            { label: "Mark as Cancelled", icon: <Tag className="h-4 w-4" />, onClick: () => updateInvoiceMutation.mutate({ id: inv.id, status: "cancelled" }) },
                            { label: "Add A New Payment", icon: <CreditCard className="h-4 w-4" />, onClick: () => navigate("/payments/create") },
                            { label: "Clone Invoice", icon: <Copy className="h-4 w-4" />, onClick: () => handleCloneInvoice(inv) },
                            { label: "Attach To A Project", icon: <FolderOpen className="h-4 w-4" />, onClick: () => navigate(`/invoices/${inv.id}/edit`) },
                            { label: "Set Recurring", icon: <RotateCcw className="h-4 w-4" />, onClick: () => { if (!inv.clientId) { toast.error("Cannot set recurring without a client"); return; } createRecurringMutation.mutate({ clientId: inv.clientId, templateInvoiceId: inv.id, frequency: "monthly", startDate: new Date().toISOString() }); } },
                            { label: "View Payments", icon: actionIcons.view, onClick: () => navigate(`/payments`) },
                            { label: "Download", icon: actionIcons.download, onClick: () => handleDownloadPDF(inv.id), separator: true },
                          ]}
                          showStar
                          showDownload
                          onDownload={() => handleDownloadPDF(inv.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="px-2">
              <PaginationControls
                total={filteredAndSortedInvoices.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
