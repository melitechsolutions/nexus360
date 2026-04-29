import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DollarSign, Loader2 } from "lucide-react";
import { getPaymentMethodOptions } from "@/const/paymentMethods";

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export function ExpenseForm({ onSuccess, onCancel, initialData }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    expenseDate: initialData?.expenseDate || new Date().toISOString().split("T")[0],
    category: initialData?.category || "",
    description: initialData?.description || "",
    amount: initialData?.amount || "",
    paymentMethod: initialData?.paymentMethod || "cash",
    status: initialData?.status || "pending",
    chartOfAccountId: initialData?.chartOfAccountId || "",
    budgetAllocationId: initialData?.budgetAllocationId || "",
  });

  // Fetch Chart of Accounts
  const { data: chartOfAccounts, isLoading: isLoadingCOA } = trpc.chartOfAccounts.list.useQuery({});

  // Fetch Budget Allocations
  const { data: budgetAllocations, isLoading: isLoadingBudgets } = trpc.expenses.getAvailableBudgetAllocations.useQuery({});

  const createExpenseMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense created successfully");
      setFormData({
        expenseDate: new Date().toISOString().split("T")[0],
        category: "",
        description: "",
        amount: "",
        paymentMethod: "cash",
        status: "pending",
        chartOfAccountId: "",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create expense");
    },
  });

  const updateExpenseMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated successfully");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update expense");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.amount || !formData.chartOfAccountId) {
      toast.error("Please fill in all required fields including Chart of Account");
      return;
    }

    const expenseData = {
      expenseDate: new Date(formData.expenseDate).toISOString().split("T")[0],
      category: formData.category,
      description: formData.description,
      amount: Math.round(parseFloat(formData.amount) * 100),
      paymentMethod: formData.paymentMethod,
      status: formData.status as any,
      chartOfAccountId: parseInt(formData.chartOfAccountId),
      budgetAllocationId: formData.budgetAllocationId || undefined,
    } as any;

    if (initialData?.id) {
      updateExpenseMutation.mutate({
        id: initialData.id,
        ...expenseData,
      });
    } else {
      createExpenseMutation.mutate(expenseData);
    }
  };

  const isLoading = createExpenseMutation.isPending || updateExpenseMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {initialData ? "Edit Expense" : "Create New Expense"}
        </CardTitle>
        <CardDescription>
          {initialData ? "Update expense details" : "Add a new expense to your records"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expense Date */}
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Expense Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                placeholder="e.g., Office Supplies, Travel, Meals"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>

            {/* Chart of Account */}
            <div className="space-y-2">
              <Label htmlFor="chartOfAccount">Chart of Account *</Label>
              <Select 
                value={formData.chartOfAccountId} 
                onValueChange={(value) => setFormData({ ...formData, chartOfAccountId: value })}
                disabled={isLoadingCOA}
              >
                <SelectTrigger id="chartOfAccount">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(chartOfAccounts) && chartOfAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.accountCode} - {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget Allocation (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="budgetAllocation">Budget Allocation (Optional)</Label>
              <Select 
                value={formData.budgetAllocationId} 
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    // convert our "none" sentinel back to an empty string
                    budgetAllocationId: value === "none" ? "" : value,
                  })
                }
                disabled={isLoadingBudgets}
              >
                <SelectTrigger id="budgetAllocation">
                  <SelectValue placeholder="Select budget allocation" />
                </SelectTrigger>
                <SelectContent>
                  {/* use "none" sentinel to represent no allocation; we'll convert
                      back to empty string on change so formData logic remains
                      unchanged */}
                  <SelectItem value="none">No Budget Allocation</SelectItem>
                  {Array.isArray(budgetAllocations) && budgetAllocations.map((budget: any) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      {budget.categoryName} - Ksh {(budget.remaining / 100).toLocaleString('en-KE')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.budgetAllocationId && budgetAllocations && (
                <p className="text-sm text-gray-600">
                  {(() => {
                    const alloc = budgetAllocations.find((b: any) => b.id === formData.budgetAllocationId);
                    return alloc ? `Remaining: Ksh ${(alloc.remaining / 100).toLocaleString('en-KE')}` : "";
                  })()}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Ksh) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getPaymentMethodOptions().map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add any additional details about this expense..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initialData ? "Update Expense" : "Create Expense"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
