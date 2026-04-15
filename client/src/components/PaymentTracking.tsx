import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCurrencySettings } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Plus,
  Trash2,
  Edit,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import mutateAsync from "@/lib/mutationHelpers";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

interface PaymentTrackingProps {
  invoiceId: string;
  invoiceTotal: number;
  invoiceStatus: string;
  readonly?: boolean;
}

export default function PaymentTracking({
  invoiceId,
  invoiceTotal,
  invoiceStatus,
  readonly = false,
}: PaymentTrackingProps) {
  const { code: currencyCode } = useCurrencySettings();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [bulkSelectedPayments, setBulkSelectedPayments] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    paymentAmount: "",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    paymentMethod: "bank_transfer" as const,
    reference: "",
    notes: "",
    receiptId: "",
    accountId: "", // Chart of Accounts ID
  });

  const { data: payments = [], isLoading: isLoadingPayments, refetch: refetchPayments } =
    trpc.invoices.payments.list.useQuery({ invoiceId });

  const { data: paymentSummary } = trpc.invoices.payments.getSummary.useQuery({
    invoiceId,
  });

  const { data: chartOfAccounts = [] } = trpc.chartOfAccounts.list.useQuery({
    limit: 1000,
  });

  const createPaymentMutation = trpc.invoices.payments.create.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      setIsDialogOpen(false);
      resetForm();
      refetchPayments();
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  const updatePaymentMutation = trpc.invoices.payments.update.useMutation({
    onSuccess: () => {
      toast.success("Payment updated successfully");
      setIsEditDialogOpen(false);
      setSelectedPayment(null);
      refetchPayments();
    },
    onError: (error) => {
      toast.error(`Failed to update payment: ${error.message}`);
    },
  });

  const deletePaymentMutation = trpc.invoices.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("Payment deleted successfully");
      setIsDeleteOpen(false);
      setSelectedPayment(null);
      refetchPayments();
    },
    onError: (error) => {
      toast.error(`Failed to delete payment: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      paymentAmount: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "bank_transfer",
      reference: "",
      notes: "",
      receiptId: "",
      accountId: "",
    });
  };

  const togglePaymentSelection = (paymentId: string) => {
    const newSelected = new Set(bulkSelectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setBulkSelectedPayments(newSelected);
  };

  const toggleSelectAll = () => {
    if (bulkSelectedPayments.size === payments.length) {
      setBulkSelectedPayments(new Set());
    } else {
      setBulkSelectedPayments(new Set(payments.map((p: any) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (bulkSelectedPayments.size === 0) {
      toast.error("Please select payments to delete");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${bulkSelectedPayments.size} payment(s)?`
    );

    if (!confirmDelete) return;

    let successCount = 0;
    let failureCount = 0;

    for (const paymentId of bulkSelectedPayments) {
      try {
        await mutateAsync(deletePaymentMutation, { id: paymentId });
        successCount++;
      } catch (error) {
        failureCount++;
      }
    }

    toast.success(
      `Deleted ${successCount} payment(s)${failureCount > 0 ? ` (${failureCount} failed)` : ""}`
    );
    setBulkSelectedPayments(new Set());
    refetchPayments();
  };

  const handleBulkExport = () => {
    if (bulkSelectedPayments.size === 0) {
      toast.error("Please select payments to export");
      return;
    }

    const selectedPaymentsList = payments.filter((p: any) => bulkSelectedPayments.has(p.id));

    const headers = ["Date", "Amount (KES)", "Method", "Reference", "Notes"];
    const rows = selectedPaymentsList.map((p: any) => [
      new Date(p.paymentDate).toLocaleDateString(),
      (p.paymentAmount / 100).toFixed(2),
      p.paymentMethod,
      p.reference || "",
      p.notes || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${bulkSelectedPayments.size} payment(s)`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100);
  };

  const handleAddPayment = async () => {
    if (!formData.paymentAmount) {
      toast.error("Please enter a payment amount");
      return;
    }

    const paymentAmountCents = Math.round(parseFloat(formData.paymentAmount) * 100);
    
    if (paymentAmountCents > invoiceTotal - (paymentSummary?.totalPaid || 0)) {
      toast.error("Payment amount exceeds remaining balance");
      return;
    }

    try {
      await mutateAsync(createPaymentMutation, {
        invoiceId,
        paymentAmount: paymentAmountCents,
        paymentDate: new Date(formData.paymentDate).toISOString(),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        receiptId: formData.receiptId || undefined,
        accountId: formData.accountId || undefined,
      });
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedPayment) return;

    if (!formData.paymentAmount) {
      toast.error("Please enter a payment amount");
      return;
    }

    const paymentAmountCents = Math.round(parseFloat(formData.paymentAmount) * 100);

    try {
      await mutateAsync(updatePaymentMutation, {
        id: selectedPayment.id,
        paymentAmount: paymentAmountCents,
        paymentDate: new Date(formData.paymentDate).toISOString(),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        accountId: formData.accountId || undefined,
      });
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;

    try {
      await mutateAsync(deletePaymentMutation, {
        id: selectedPayment.id,
      });
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  const openEditDialog = (payment: any) => {
    setSelectedPayment(payment);
    setFormData({
      paymentAmount: (payment.paymentAmount / 100).toString(),
      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().split("T")[0]
        : format(new Date(), "yyyy-MM-dd"),
      paymentMethod: payment.paymentMethod || "bank_transfer",
      reference: payment.reference || "",
      notes: payment.notes || "",
      receiptId: payment.receiptId || "",
      accountId: payment.accountId || "",
    });
    setIsEditDialogOpen(true);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500";
      case "partial":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <div>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>Track and manage payments received for this invoice</CardDescription>
            </div>
          </div>
          {!readonly && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment received for this invoice. Remaining balance:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        (paymentSummary?.remainingBalance || invoiceTotal) -
                          Math.round(parseFloat(formData.paymentAmount || "0") * 100)
                      )}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Invoice Total</label>
                      <Input disabled value={formatCurrency(invoiceTotal)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Total Paid</label>
                      <Input disabled value={formatCurrency(paymentSummary?.totalPaid || 0)} />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Payment Amount *</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={formData.paymentAmount}
                      onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Payment Date</label>
                      <Input
                        type="date"
                        value={formData.paymentDate}
                        onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Payment Method</label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            paymentMethod: value as any,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Reference (Optional)</label>
                    <Input
                      placeholder="e.g., Check #, Transfer reference"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Chart of Accounts (Optional)</label>
                    <Select
                      value={formData.accountId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, accountId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a chart of accounts..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chartOfAccounts && chartOfAccounts.map((coa: any) => (
                          <SelectItem key={coa.id} value={coa.id}>
                            {coa.accountCode} - {coa.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                    <Textarea
                      placeholder="Additional payment notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddPayment} disabled={createPaymentMutation.isPending}>
                      {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Payment Summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Invoice Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(invoiceTotal)}</div>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(paymentSummary?.totalPaid || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(paymentSummary?.remainingBalance || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={getPaymentStatusColor(paymentSummary?.paymentStatus || "pending")}>
                {(paymentSummary?.paymentStatus || "pending").replace("_", " ").toUpperCase()}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Toolbar */}
        {!readonly && bulkSelectedPayments.size > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg mb-4 flex items-center justify-between">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {bulkSelectedPayments.size} payment(s) selected
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkExport}
                className="text-blue-600 hover:text-blue-700"
              >
                Export
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Payments List */}
        {isLoadingPayments ? (
          <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No payments recorded yet
          </div>
        ) : (
          <>
            {payments.length > 1 && !readonly && (
              <div className="flex items-center gap-3 p-3 border-b mb-3">
                <input
                  type="checkbox"
                  checked={bulkSelectedPayments.size === payments.length && payments.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                  title="Select all payments"
                />
                <span className="text-xs text-muted-foreground">
                  {bulkSelectedPayments.size > 0 ? `${bulkSelectedPayments.size} selected` : "Select all"}
                </span>
              </div>
            )}
            <div className="space-y-3">
              {payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg hover:bg-accent transition ${
                    bulkSelectedPayments.has(payment.id) ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300" : ""
                  }`}
                >
                  {!readonly && (
                    <input
                      type="checkbox"
                      checked={bulkSelectedPayments.has(payment.id)}
                      onChange={() => togglePaymentSelection(payment.id)}
                      className="h-4 w-4 rounded border-gray-300 mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">{formatCurrency(payment.paymentAmount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.paymentMethod.replace("_", " ").toUpperCase()}
                          {payment.reference && ` • ${payment.reference}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {payment.paymentDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(payment.paymentDate), "MMM dd, yyyy")}
                        </div>
                      )}
                      {payment.notes && <div className="italic">{payment.notes}</div>}
                    </div>
                  </div>
                  {!readonly && (
                    <div className="flex gap-2 ml-4">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(payment)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>Update payment details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formData.paymentAmount}
                onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Date</label>
                <Input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Method</label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMethod: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Reference (Optional)</label>
              <Input
                placeholder="e.g., Check #, Transfer reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Chart of Accounts (Optional)</label>
              <Select
                value={formData.accountId}
                onValueChange={(value) =>
                  setFormData({ ...formData, accountId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a chart of accounts..." />
                </SelectTrigger>
                <SelectContent>
                  {chartOfAccounts && chartOfAccounts.map((coa: any) => (
                    <SelectItem key={coa.id} value={coa.id}>
                      {coa.accountCode} - {coa.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <Textarea
                placeholder="Additional payment notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePayment} disabled={updatePaymentMutation.isPending}>
                {updatePaymentMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Payment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this payment record? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeletePayment}
              disabled={deletePaymentMutation.isPending}
            >
              {deletePaymentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
