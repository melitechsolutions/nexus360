import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { ModuleLayout } from "@/components/ModuleLayout";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  Store,
  UserCheck,
  Tag,
  FileText,
  PieChart,
  Paperclip,
  Upload,
  List,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useUserLookup } from "@/hooks/useUserLookup";
import mutateAsync from "@/lib/mutationHelpers";
import { toast } from "sonner";

export default function ExpensesDetails() {
  const { getUserName } = useUserLookup();
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch expense from backend
  const { data: expenseData, isLoading } = trpc.expenses.getById.useQuery(id || "");
  // Fetch available budget allocations
  const { data: budgetAllocations = [] } = trpc.expenses.getAvailableBudgetAllocations.useQuery();

  const utils = trpc.useUtils();

  const deleteExpenseMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      utils.expenses.list.invalidate();
      setLocation("/expenses");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete expense");
    },
  });

  const updateBudgetMutation = trpc.expenses.updateBudgetAllocation.useMutation({
    onSuccess: () => {
      toast.success("Budget allocation updated successfully");
      utils.expenses.getById.invalidate(id);
      setShowBudgetDialog(false);
      setSelectedBudgetId("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update budget allocation");
    },
  });

  const updateExpenseMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Receipt uploaded successfully");
      utils.expenses.getById.invalidate(id);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload receipt");
    },
  });

  // Extract line items from expense data
  const lineItems: any[] = expenseData ? ((expenseData as any).items || []) : [];

  const expense = expenseData ? {
    id: expenseData.id || id,
    description: (expenseData as any).description || "Unknown Expense",
    category: (expenseData as any).category || "General",
    amount: ((expenseData as any).amount || 0) / 100,
    date: (expenseData as any).expenseDate ? new Date((expenseData as any).expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    vendor: (expenseData as any).vendor || "Unknown",
    paymentMethod: (expenseData as any).paymentMethod || "cash",
    status: (expenseData as any).status || "pending",
    approvedBy: (expenseData as any).approvedBy || "",
    budgetAllocationId: (expenseData as any).budgetAllocationId || null,
    receiptUrl: (expenseData as any).receiptUrl || null,
    notes: (expenseData as any).notes || "",
  } : null;

  const currentBudgetAllocation = budgetAllocations.find((b: any) => b.id === expense?.budgetAllocationId);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteExpenseMutation, id || "");
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleUpdateBudget = () => {
    if (!id) return;
    updateBudgetMutation.mutate({
      expenseId: id,
      budgetAllocationId:
        selectedBudgetId === "none" ? null : selectedBudgetId || null,
    });
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateExpenseMutation.mutate(
        { id, receiptUrl: dataUrl },
        { onSettled: () => setIsUploading(false) }
      );
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const statusColor: Record<string, string> = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Expense Details"
        icon={<DollarSign className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/accounting" },
          { label: "Expenses", href: "/expenses" },
          { label: "Details" },
        ]}
        backLink={{ label: "Expenses", href: "/expenses" }}
      >
        <div className="flex items-center justify-center h-64">
          <p>Loading expense...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!expense) {
    return (
      <ModuleLayout
        title="Expense Details"
        icon={<DollarSign className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Finance", href: "/accounting" },
          { label: "Expenses", href: "/expenses" },
          { label: "Details" },
        ]}
        backLink={{ label: "Expenses", href: "/expenses" }}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Expense not found</p>
          <Button onClick={() => setLocation("/expenses")}>Back to Expenses</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Expense Details"
      icon={<DollarSign className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Finance", href: "/accounting" },
        { label: "Expenses", href: "/expenses" },
        { label: "Details" },
      ]}
      backLink={{ label: "Expenses", href: "/expenses" }}
    >
      <div className="space-y-4">
        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                {/* Category + Status */}
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Tag className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold">{expense.category}</h2>
                  <Badge className={statusColor[expense.status] || "bg-gray-100 text-gray-800"}>
                    {expense.status.toUpperCase()}
                  </Badge>
                </div>

                <Separator />

                {/* Key fields */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">{expense.date || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Amount</p>
                      <p className="font-medium">KES {expense.amount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Store className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Vendor / Payee</p>
                      <p className="font-medium">{expense.vendor || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">Payment Method</p>
                      <p className="font-medium capitalize">{expense.paymentMethod || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Approval info */}
                {expense.approvedBy && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-2 text-sm">
                      <UserCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Approved By</p>
                        <p className="font-medium">{getUserName(expense.approvedBy)}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Description / Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description & Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{expense.description || "No description provided."}</p>
                {expense.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Additional Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{expense.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            {lineItems.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Line Items ({lineItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item: any, idx: number) => (
                        <TableRow key={item.id || idx}>
                          <TableCell className="text-sm">{item.description || "—"}</TableCell>
                          <TableCell className="text-sm text-right">{item.quantity ?? 0}</TableCell>
                          <TableCell className="text-sm text-right">KES {((item.rate || 0) / 100).toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-right">KES {((item.taxAmount || 0) / 100).toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-right font-medium">KES {((item.amount || 0) / 100).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Separator className="my-3" />
                  <div className="flex justify-end gap-6 text-sm">
                    <div className="text-muted-foreground">
                      Subtotal: <span className="font-medium text-foreground">KES {(lineItems.reduce((sum: number, i: any) => sum + ((i.amount || 0) - (i.taxAmount || 0)), 0) / 100).toLocaleString()}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Tax: <span className="font-medium text-foreground">KES {(lineItems.reduce((sum: number, i: any) => sum + (i.taxAmount || 0), 0) / 100).toLocaleString()}</span>
                    </div>
                    <div className="font-medium">
                      Total: KES {(lineItems.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) / 100).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Allocation */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Budget Allocation
                  </CardTitle>
                  <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        {currentBudgetAllocation ? "Change" : "Assign"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Budget Allocation</DialogTitle>
                        <DialogDescription>
                          Select a budget allocation to link this expense to, or leave empty to remove.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select value={selectedBudgetId} onValueChange={setSelectedBudgetId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a budget allocation..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (Remove allocation)</SelectItem>
                            {budgetAllocations.map((allocation: any) => (
                              <SelectItem key={allocation.id} value={allocation.id}>
                                {allocation.categoryName} ({((allocation.allocatedAmount - (allocation.spentAmount || 0)) / 100).toLocaleString()} KES remaining)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleUpdateBudget}
                          disabled={updateBudgetMutation.isPending}
                        >
                          {updateBudgetMutation.isPending ? "Updating..." : "Update Allocation"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {currentBudgetAllocation ? (
                  <div className="space-y-2">
                    <p className="font-medium text-sm">{currentBudgetAllocation.categoryName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Spent: KES {((currentBudgetAllocation.spentAmount || 0) / 100).toLocaleString()}</span>
                      <span>/</span>
                      <span>Budget: KES {(currentBudgetAllocation.allocatedAmount / 100).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{
                          width: `${Math.min(((currentBudgetAllocation.spentAmount || 0) / currentBudgetAllocation.allocatedAmount) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No budget allocation assigned.</p>
                )}
              </CardContent>
            </Card>

            {/* Receipt / Attachment */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Receipt / Attachment
                  </CardTitle>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleReceiptUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {isUploading ? "Uploading..." : expense.receiptUrl ? "Replace" : "Upload"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {expense.receiptUrl ? (
                  <div className="border rounded-md p-3 space-y-2">
                    {expense.receiptUrl.startsWith("data:image/") ? (
                      <img
                        src={expense.receiptUrl}
                        alt="Receipt"
                        className="max-h-64 rounded-md object-contain"
                      />
                    ) : (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View Receipt
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No receipt attached.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          title="Delete Expense"
          description="Are you sure you want to delete this expense? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={isDeleting}
        />
      </div>
    </ModuleLayout>
  );
}
