import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Receipt, ArrowLeft, Trash2, Download, Loader2, AlertCircle, Plus, ChevronDown, ChevronUp, Save } from "lucide-react";
import { APP_TITLE } from "@/const";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

interface ExpenseLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
  taxAmount: number;
}

function createEmptyItem(): ExpenseLineItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, taxRate: 0, amount: 0, taxAmount: 0 };
}

export default function EditExpense() {
  const { allowed, isLoading } = useRequireFeature("accounting:expenses:edit");
  const companyInfo = useCompanyInfo();
  
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const expenseId = params.id;
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedBudgetAllocation, setSelectedBudgetAllocation] = useState<any>(null);
  const [lineItemsData, setLineItemsData] = useState<ExpenseLineItem[]>([createEmptyItem()]);
  const [useLineItems, setUseLineItems] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [formData, setFormData] = useState({
    expenseNumber: "",
    category: "",
    vendor: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    description: "",
    status: "pending",
    chartOfAccountId: "",
    budgetAllocationId: "",
  });

  // Fetch expense data
  const { data: expense, isLoading: isLoadingExpenseData } = trpc.expenses.getById.useQuery(expenseId || "", {
    enabled: !!expenseId,
  });

  // Populate form when expense data loads
  useEffect(() => {
    if (expense) {
      setFormData({
        expenseNumber: expense.expenseNumber || "",
        category: expense.category || "",
        vendor: expense.vendor || "",
        amount: expense.amount ? (expense.amount / 100).toString() : "",
        expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        paymentMethod: expense.paymentMethod || "cash",
        description: expense.description || "",
        status: expense.status || "pending",
        chartOfAccountId: (expense as any).chartOfAccountId?.toString() || "",
        budgetAllocationId: expense.budgetAllocationId || "",
      });
      // Show description section if it has content
      if (expense.description) setShowAdditionalInfo(true);
    }
  }, [expense]);

  const updateExpenseMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated successfully!");
      utils.expenses.list.invalidate();
      utils.expenses.getById.invalidate(expenseId || "");
      navigate("/expenses");
    },
    onError: (error: any) => {
      toast.error(`Failed to update expense: ${error.message}`);
    },
  });

  const deleteExpenseMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully!");
      utils.expenses.list.invalidate();
      navigate("/expenses");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete expense: ${error.message}`);
    },
  });

  // Fetch available budget allocations
  const { data: budgetAllocations = [] } = trpc.expenses.getAvailableBudgetAllocations.useQuery();

  // Fetch Chart of Accounts
  const { data: chartOfAccounts = [] } = trpc.chartOfAccounts.list.useQuery();

  // Line item helpers
  const updateLineItem = (id: string, field: keyof ExpenseLineItem, value: any) => {
    setLineItemsData(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.amount = updated.quantity * updated.rate;
      updated.taxAmount = Math.round(updated.amount * (updated.taxRate / 100));
      return updated;
    }));
  };
  const addLineItem = () => setLineItemsData(prev => [...prev, createEmptyItem()]);
  const removeLineItem = (id: string) => setLineItemsData(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  const lineItemsTotal = lineItemsData.reduce((sum, item) => sum + item.amount + item.taxAmount, 0);

  // Update selectedBudgetAllocation when budgetAllocationId changes
  useEffect(() => {
    if (formData.budgetAllocationId && budgetAllocations.length > 0) {
      const selected = budgetAllocations.find((b: any) => b.id === formData.budgetAllocationId);
      setSelectedBudgetAllocation(selected || null);
    } else {
      setSelectedBudgetAllocation(null);
    }
  }, [formData.budgetAllocationId, budgetAllocations]);

  // Handle budget allocation selection
  const handleBudgetAllocationChange = (budgetId: string) => {
    const actualId = budgetId === "__none__" ? "" : budgetId;
    setFormData({ ...formData, budgetAllocationId: actualId });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!expenseId) {
      toast.error("Expense ID is missing");
      return;
    }

    updateExpenseMutation.mutate({
      id: expenseId,
      category: formData.category,
      vendor: formData.vendor || undefined,
      amount: Math.round(parseFloat(formData.amount) * 100),
      expenseDate: new Date(formData.expenseDate).toISOString().split("T")[0],
      paymentMethod: formData.paymentMethod as any,
      description: formData.description || undefined,
      status: formData.status as any,
      budgetAllocationId: formData.budgetAllocationId || undefined,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      deleteExpenseMutation.mutate(expenseId || "");
    }
  };

  const handleDownloadPDF = useCallback(async () => {
    setIsGeneratingPDF(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow popups to download PDF");
        setIsGeneratingPDF(false);
        return;
      }
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expense Report - ${formData.expenseNumber || expenseId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company-info { text-align: right; font-size: 12px; }
            .document-title { font-size: 28px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }
            .info-section { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #6b7280; }
            .value { }
            .amount { font-size: 24px; font-weight: bold; color: #dc2626; text-align: center; padding: 20px; background: #fef2f2; border-radius: 8px; margin: 20px 0; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-approved { background: #d1fae5; color: #065f46; }
            .status-rejected { background: #fee2e2; color: #991b1b; }
            .status-paid { background: #dbeafe; color: #1e40af; }
            .notes { margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="document-title">EXPENSE REPORT</div>
              <div><strong>${formData.expenseNumber || expenseId}</strong></div>
            </div>
            <div class="company-info">
              <strong>${APP_TITLE}</strong><br>
              ${companyInfo.address ? companyInfo.address + '<br>' : ''}
              ${companyInfo.email ? companyInfo.email + '<br>' : ''}
              ${companyInfo.phone || ''}
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="label">Category:</span>
              <span class="value">${formData.category || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Vendor:</span>
              <span class="value">${formData.vendor || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Expense Date:</span>
              <span class="value">${formData.expenseDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Payment Method:</span>
              <span class="value">${((formData.paymentMethod || 'cash').replace('_', ' ').toUpperCase())}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value"><span class="status status-${(formData.status || 'pending')}">${(formData.status || 'pending').toUpperCase()}</span></span>
            </div>
          </div>
          
          <div class="amount">
            Amount: KES ${parseFloat(formData.amount || '0').toLocaleString()}
          </div>
          
          ${formData.description ? `
            <div class="notes">
              <strong>Description:</strong><br>
              ${formData.description}
            </div>
          ` : ''}
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      toast.success("PDF download initiated");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [formData, expenseId]);

  if (isLoadingExpenseData) {
    return (
      <ModuleLayout
        title="Edit Expense"
        description="Loading expense details..."
        icon={<Receipt className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Accounting", href: "/accounting" },
          { label: "Expenses", href: "/expenses" },
          { label: "Edit Expense" },
        ]}
      >
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Expense"
      description="Update expense details"
      icon={<Receipt className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Expenses", href: "/expenses" },
        { label: "Edit Expense" },
      ]}
    >
      <div className={useLineItems ? "max-w-5xl" : "max-w-2xl"}>
        <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Number</Label>
                <Input
                  value={formData.expenseNumber}
                  readOnly
                  className="bg-muted cursor-not-allowed font-mono max-w-xs"
                />
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Rent">Rent</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Meals & Entertainment">Meals & Entertainment</SelectItem>
                    <SelectItem value="Professional Services">Professional Services</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Vendor</Label>
                <Input
                  placeholder="e.g., ABC Supplies Ltd"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="max-w-xs"
                />
              </div>

              {!useLineItems && (
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Amount (Ksh) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  step="0.01"
                  min="0"
                  className="max-w-xs"
                />
              </div>
              )}

              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Date *</Label>
                <Input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="max-w-xs"
                />
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Method *</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Account *</Label>
                <Select value={formData.chartOfAccountId} onValueChange={(value) => setFormData({ ...formData, chartOfAccountId: value })}>
                  <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {chartOfAccounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.accountCode} - {account.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetAllocationId">Budget Allocation (Optional)</Label>
                <Select
                  value={formData.budgetAllocationId}
                  onValueChange={handleBudgetAllocationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget allocation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {budgetAllocations.map((allocation: any) => (
                      <SelectItem key={allocation.id} value={allocation.id}>
                        {allocation.categoryName} - Ksh {(allocation.remaining / 100).toLocaleString('en-KE')} remaining
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBudgetAllocation && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                      {selectedBudgetAllocation.categoryName}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div>
                        <p className="text-blue-700 dark:text-blue-300">Allocated:</p>
                        <p className="font-mono font-bold">Ksh {(selectedBudgetAllocation.allocatedAmount / 100).toLocaleString('en-KE')}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 dark:text-blue-300">Spent:</p>
                        <p className="font-mono font-bold">Ksh {(selectedBudgetAllocation.spentAmount / 100).toLocaleString('en-KE')}</p>
                      </div>
                      <div>
                        <p className="text-blue-700 dark:text-blue-300">Remaining:</p>
                        <p className={`font-mono font-bold ${selectedBudgetAllocation.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Ksh {(selectedBudgetAllocation.remaining / 100).toLocaleString('en-KE')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedBudgetAllocation && formData.amount && parseFloat(formData.amount) > selectedBudgetAllocation.remaining / 100 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 rounded flex gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    This expense amount exceeds the remaining budget. It will overrun the allocation.
                  </p>
                </div>
              )}

              <Separator className="my-4" />

              {/* Line Items Toggle */}
              <div className="flex items-center gap-3 pt-2 border-t">
                <input
                  type="checkbox"
                  id="useLineItems"
                  checked={useLineItems}
                  onChange={(e) => setUseLineItems(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="useLineItems" className="text-sm font-medium cursor-pointer">
                  Use line items (multiple items in this expense)
                </Label>
              </div>

              {/* Line Items Section */}
              {useLineItems && (
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Line Items</CardTitle>
                      <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                        <Plus className="h-4 w-4 mr-1" /> Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                      <div className="col-span-4">Description</div>
                      <div className="col-span-1">Qty</div>
                      <div className="col-span-2">Rate (Ksh)</div>
                      <div className="col-span-1">Tax %</div>
                      <div className="col-span-2">Amount</div>
                      <div className="col-span-1">Tax</div>
                      <div className="col-span-1"></div>
                    </div>

                    {lineItemsData.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                          className="col-span-4 text-sm"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        />
                        <Input
                          className="col-span-1 text-sm"
                          type="number" min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                        />
                        <Input
                          className="col-span-2 text-sm"
                          type="number" step="0.01" min="0"
                          value={item.rate || ""}
                          onChange={(e) => updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                        />
                        <Input
                          className="col-span-1 text-sm"
                          type="number" min="0" max="100"
                          value={item.taxRate || ""}
                          onChange={(e) => updateLineItem(item.id, "taxRate", parseFloat(e.target.value) || 0)}
                        />
                        <div className="col-span-2 text-sm font-mono px-2">
                          {item.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                        </div>
                        <div className="col-span-1 text-sm font-mono text-muted-foreground px-1">
                          {item.taxAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                        </div>
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="col-span-1 h-8 w-8 p-0 text-destructive"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItemsData.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Totals */}
                    <div className="border-t pt-3 flex justify-end">
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          Subtotal: <span className="font-mono font-bold">
                            Ksh {lineItemsData.reduce((s, i) => s + i.amount, 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Tax: <span className="font-mono">
                            Ksh {lineItemsData.reduce((s, i) => s + i.taxAmount, 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-base font-bold">
                          Total: <span className="font-mono text-primary">
                            Ksh {lineItemsTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator className="my-4" />

              {/* Additional Information - Collapsible */}
              <Collapsible open={showAdditionalInfo} onOpenChange={setShowAdditionalInfo}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <span>Additional Information</span>
                    {showAdditionalInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  <div className="grid grid-cols-[140px_1fr] items-start gap-3">
                    <Label className="text-right text-sm pt-2">Description</Label>
                    <Textarea
                      placeholder="Enter expense description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator className="my-4" />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updateExpenseMutation.isPending}
                >
                  {updateExpenseMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  Update Expense
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download PDF
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteExpenseMutation.isPending}
                >
                  {deleteExpenseMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/expenses")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
        </Card>
      </div>
    </ModuleLayout>
  );
}
