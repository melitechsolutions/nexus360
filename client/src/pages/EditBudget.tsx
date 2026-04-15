import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCurrencySettings } from "@/lib/currency";

export default function EditBudget() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/budgets/:id/edit");
  
  const budgetId = params?.id || "";
  const [amount, setAmount] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  const { data: budget, isLoading } = trpc.budgets.getById.useQuery(budgetId, {
    enabled: !!budgetId,
  });
  
  const { data: departments } = trpc.departments.list.useQuery();
  const { code: currencyCode } = useCurrencySettings();
  const updateBudgetMutation = trpc.budgets.update.useMutation({
    onSuccess: () => {
      toast.success("Budget updated successfully");
      navigate("/budgets");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update budget");
    },
  });

  useEffect(() => {
    if (budget) {
      setAmount(budget.amount.toString());
      setFiscalYear(budget.fiscalYear?.toString() || "");
      setDepartmentName(budget.departmentName || "");
    }
  }, [budget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !fiscalYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    const parsedAmount = Math.round(parseFloat(amount));

    updateBudgetMutation.mutate({
      id: budgetId,
      amount: parsedAmount,
      fiscalYear: parseInt(fiscalYear),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading budget...</div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Budget not found</div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <ModuleLayout
      title="Edit Budget"
      description="Update budget details and allocation"
      icon={<PiggyBank className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Budgets", href: "/budgets" },
        { label: "Edit Budget" },
      ]}
    >
      <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/budgets")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Budget</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                type="text"
                value={departmentName}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Total Budget Amount (KES) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 100000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              <p className="text-sm text-gray-500">
                {amount ? `≈ ${new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(parseFloat(amount))}` : "Enter an amount"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Fiscal Year *</Label>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={updateBudgetMutation.isPending}
              >
                {updateBudgetMutation.isPending ? "Updating..." : "Update Budget"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/budgets")}
                disabled={updateBudgetMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </ModuleLayout>
  );
}
