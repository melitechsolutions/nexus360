import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Search,
  Plus,
  Download,
  Eye,
  Pencil,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Banknote,
  Trash2,
  Check,
  BarChart3,
  Copy,
  Mail,
  Link,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { buildCommunicationComposePath } from "@/lib/communications";
import mutateAsync from '@/lib/mutationHelpers';
import { format } from "date-fns";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/export-utils";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkApproveAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatsCard } from "@/components/ui/stats-card";

interface Payment {
  id: string;
  receiptNumber: string;
  client: string;
  amount: number;
  method: "cash" | "mpesa" | "bank_transfer" | "cheque" | "card";
  status: "completed" | "pending" | "failed";
  date: string;
  invoice: string;
  reference: string;
}

export default function Payments() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("accounting:payments:view");
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());

  const paymentColumns: ColumnConfig[] = [
    { key: "receiptNumber", label: "Receipt #" },
    { key: "client", label: "Client" },
    { key: "amount", label: "Amount" },
    { key: "method", label: "Method" },
    { key: "status", label: "Status" },
    { key: "date", label: "Date" },
    { key: "reference", label: "Reference" },
    { key: "invoice", label: "Invoice" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(paymentColumns, "payments");

  // Fetch real data from backend
  const { data: paymentsData = [], isLoading: isLoadingPayments } = trpc.payments.list.useQuery();
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  
  // Delete mutation
  const deletePaymentMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("Payment deleted successfully");
      utils.payments.list.invalidate();
      setDeleteDialogOpen(false);
      setSelectedPaymentId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete payment");
    },
  });

  // Approve mutation
  const approvePaymentMutation = trpc.approvals.approvePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment approved successfully");
      utils.payments.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve payment");
    },
  });

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  // Transform backend data to display format
  const payments: Payment[] = (paymentsData as any[]).map((payment: any) => ({
    id: payment.id,
    receiptNumber: payment.receiptNumber || `REC-${payment.id.slice(0, 8)}`,
    client: (clientsData as any[]).find((c: any) => c.id === payment.clientId)?.companyName || "Unknown Client",
    amount: (payment.amount || 0) / 100,
    method: payment.paymentMethod || "cash",
    status: payment.status || "pending",
    date: payment.date ? format(new Date(payment.date), "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
    invoice: payment.invoiceId ? "INV" : "N/A",
    reference: payment.reference || "",
  }));

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const completedAmount = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const toggleSelectPayment = (id: string) => {
    setSelectedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPayments.size === filteredPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(filteredPayments.map((p) => p.id)));
    }
  };

  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Payments", href: "/payments" },
      ]}
      title="Payments"
      description="Track and manage all payment transactions"
      icon={<DollarSign className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            label="Total Payments"
            value={<>Ksh {totalAmount.toLocaleString()}</>}
            description={<>{payments.length} transactions</>}
            color="border-l-purple-500"
          />

          <StatsCard
            label="Completed"
            value={<>Ksh {completedAmount.toLocaleString()}</>}
            description={<>{payments.filter((p) => p.status === "completed").length} completed</>}
            color="border-l-green-500"
          />

          <StatsCard
            label="Pending"
            value={<>Ksh {pendingAmount.toLocaleString()}</>}
            description={<>{payments.filter((p) => p.status === "pending").length} pending</>}
            color="border-l-blue-500"
          />
        </div>

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by client or receipt..."
          onCreateClick={() => navigate("/payments/create")}
          createLabel="Record Payment"
          onExportClick={() => downloadCSV(payments.map(p => ({ "Receipt #": p.receiptNumber, Client: p.client, Amount: p.amount, Method: p.method, Status: p.status, Date: p.date, Reference: p.reference })), "payments")}
          onImportClick={() => toast.info("CSV import is available in Settings > Data Management")}
          onPrintClick={() => window.print()}
          filterContent={
            <>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => navigate("/payments/reconciliation")} variant="outline" size="sm" className="gap-1">
                <BarChart3 className="h-3.5 w-3.5" /> Reconciliation
              </Button>
            </>
          }
        />

        {/* Bulk Actions Bar */}
        <EnhancedBulkActions
          selectedCount={selectedPayments.size}
          onClear={() => setSelectedPayments(new Set())}
          actions={[
            bulkApproveAction(selectedPayments, (ids) => ids.forEach(id => approvePaymentMutation.mutate({ id }))),
            bulkExportAction(selectedPayments, payments, paymentColumns, "payments"),
            bulkCopyIdsAction(selectedPayments),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedPayments, (ids) => ids.forEach(id => deletePaymentMutation.mutate(id))),
          ]}
        />

        {/* Payments Table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredPayments.length} of {payments.length} payments</span>
              <TableColumnSettings columns={paymentColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    {isVisible("receiptNumber") && <TableHead>Receipt #</TableHead>}
                    {isVisible("client") && <TableHead>Client</TableHead>}
                    {isVisible("amount") && <TableHead>Amount</TableHead>}
                    {isVisible("method") && <TableHead>Method</TableHead>}
                    {isVisible("status") && <TableHead>Status</TableHead>}
                    {isVisible("date") && <TableHead>Date</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading payments...
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className={selectedPayments.has(payment.id) ? "bg-primary/5" : ""}>
                        <TableCell><Checkbox checked={selectedPayments.has(payment.id)} onCheckedChange={() => toggleSelectPayment(payment.id)} /></TableCell>
                        {isVisible("receiptNumber") && <TableCell className="font-medium">{payment?.receiptNumber || "N/A"}</TableCell>}
                        {isVisible("client") && <TableCell>{payment?.client || "N/A"}</TableCell>}
                        {isVisible("amount") && <TableCell>Ksh {(payment?.amount || 0).toLocaleString()}</TableCell>}
                        {isVisible("method") && (
                          <TableCell>
                            <Badge variant="outline">
                              {(payment?.method || "N/A").replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                        )}
                        {isVisible("status") && (
                          <TableCell>
                            <Badge
                              variant={
                                payment?.status === "completed"
                                  ? "default"
                                  : payment?.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                              className="gap-1"
                            >
                              {payment?.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                              {payment?.status === "pending" && <Clock className="h-3 w-3" />}
                              {((payment?.status || "pending") as string).charAt(0).toUpperCase() +
                                ((payment?.status || "pending") as string).slice(1)}
                            </Badge>
                          </TableCell>
                        )}
                        {isVisible("date") && <TableCell>{payment?.date ? new Date(payment.date).toLocaleDateString() : "N/A"}</TableCell>}
                        <TableCell className="text-right">
                          <RowActionsMenu
                            primaryActions={[
                              { label: "View", icon: actionIcons.view, onClick: () => navigate(`/payments/${payment.id}`) },
                              { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => navigate(`/payments/${payment.id}/edit`) },
                              { label: "Delete", icon: actionIcons.delete, onClick: () => { setSelectedPaymentId(payment.id); setDeleteDialogOpen(true); }, variant: "destructive" },
                            ]}
                            menuActions={[
                              ...(payment.status === "pending" ? [{ label: "Approve Payment", icon: <Check className="h-4 w-4" />, onClick: () => approvePaymentMutation.mutate({ id: payment.id }) }] : []),
                              { label: "Download Receipt", icon: actionIcons.download, onClick: () => { navigate(`/payments/${payment.id}`); setTimeout(() => window.print(), 500); } },
                              { label: "Email Receipt", icon: actionIcons.email, onClick: () => navigate(buildCommunicationComposePath(location, payment.clientEmail || "", `Payment Receipt ${payment.receiptNumber || payment.id}`)) },
                              { label: "Duplicate Payment", icon: actionIcons.copy, onClick: () => navigate("/payments/create"), separator: true },
                              { label: "Link to Invoice", icon: <Link className="h-4 w-4" />, onClick: () => navigate(`/payments/${payment.id}/edit`) },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (selectedPaymentId) {
                    await mutateAsync(deletePaymentMutation, selectedPaymentId);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleLayout>
  );
}

