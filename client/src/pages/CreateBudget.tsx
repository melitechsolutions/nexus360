import React, { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, PiggyBank } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCurrencySettings } from "@/lib/currency";

export default function CreateBudget() {
  const [, navigate] = useLocation();
  const [departmentId, setDepartmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear().toString());

  const { data: departments } = trpc.departments.list.useQuery();
  const { code: currencyCode } = useCurrencySettings();
  const createBudgetMutation = trpc.budgets.create.useMutation({
    onSuccess: () => {
      toast.success("Budget created successfully");
      navigate("/budgets");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create budget");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!departmentId || !amount || !fiscalYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    const parsedAmount = Math.round(parseFloat(amount));

    createBudgetMutation.mutate({
      departmentId,
      amount: parsedAmount,
      remaining: parsedAmount,
      fiscalYear: parseInt(fiscalYear),
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <ModuleLayout
      title="Create Budget"
      description="Set up a new departmental budget"
      icon={<Plus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Budgets", href: "/budgets" },
        { label: "Create" },
      ]}
      backLink={{ label: "Budgets", href: "/budgets" }}
    >
      <div className="max-w-2xl">

      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                disabled={createBudgetMutation.isPending}
              >
                {createBudgetMutation.isPending ? "Creating..." : "Create Budget"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/budgets")}
                disabled={createBudgetMutation.isPending}
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
