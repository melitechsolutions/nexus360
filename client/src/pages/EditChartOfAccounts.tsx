import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BookOpen, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function EditChartOfAccounts() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountType: "asset",
    parentAccountId: null as string | null,
    description: "",
    isActive: true,
  });
  const [hierarchyLevel, setHierarchyLevel] = useState(0);

  const { data: chartOfAccounts, isLoading } = trpc.chartOfAccounts.getById.useQuery(
    { id: id || "" },
    { enabled: !!id }
  );

  // Fetch all accounts to display as parent options
  const { data: allAccounts = [] } = trpc.chartOfAccounts.list.useQuery();

  useEffect(() => {
    if (chartOfAccounts) {
      setFormData({
        accountCode: chartOfAccounts.accountCode || "",
        accountName: chartOfAccounts.accountName || "",
        accountType: chartOfAccounts.accountType || "asset",
        parentAccountId: chartOfAccounts.parentAccountId || null,
        description: chartOfAccounts.description || "",
        isActive: chartOfAccounts.isActive !== 0,
      });

      // Calculate hierarchy level
      let level = 0;
      let currentAccountId = chartOfAccounts.parentAccountId;
      const visited = new Set<string>();

      while (currentAccountId && !visited.has(currentAccountId)) {
        visited.add(currentAccountId);
        const parent = allAccounts.find(acc => acc.id === currentAccountId);
        if (parent) {
          level++;
          currentAccountId = parent.parentAccountId;
        } else {
          break;
        }
      }

      setHierarchyLevel(level);
    }
  }, [chartOfAccounts, allAccounts]);

  const updateChartOfAccountsMutation = trpc.chartOfAccounts.update.useMutation({
    onSuccess: () => {
      toast.success("Chart of Accounts updated successfully!");
      utils.chartOfAccounts.list.invalidate();
      utils.chartOfAccounts.getById.invalidate({ id: id || "" });
      utils.chartOfAccounts.getSummary.invalidate();
      navigate("/chart-of-accounts");
    },
    onError: (error: any) => {
      toast.error(`Failed to update chart of accounts: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountCode || !formData.accountName) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Prevent circular hierarchy
    if (formData.parentAccountId === id) {
      toast.error("An account cannot be its own parent");
      return;
    }

    // Check for circular references
    let currentParentId = formData.parentAccountId;
    const visited = new Set<string>();
    while (currentParentId && !visited.has(currentParentId)) {
      if (currentParentId === id) {
        toast.error("Creating this relationship would cause a circular hierarchy");
        return;
      }
      visited.add(currentParentId);
      const parent = allAccounts.find(acc => acc.id === currentParentId);
      currentParentId = parent?.parentAccountId || null;
    }

    updateChartOfAccountsMutation.mutate({
      id: id || "",
      accountCode: formData.accountCode,
      accountName: formData.accountName,
      accountType: formData.accountType as any,
      parentAccountId: formData.parentAccountId,
      description: formData.description || undefined,
      isActive: formData.isActive,
    });
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit Chart of Accounts"
        description="Update account details"
        icon={<BookOpen className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Accounting", href: "/accounting" },
          { label: "Chart of Accounts", href: "/chart-of-accounts" },
          { label: "Edit Account" },
        ]}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Chart of Accounts"
      description="Update account details"
      icon={<BookOpen className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Chart of Accounts", href: "/chart-of-accounts" },
        { label: "Edit Account" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Chart of Accounts</CardTitle>
            <CardDescription>
              Update the account details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hierarchy Information */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Current hierarchy level: <strong>Level {hierarchyLevel}</strong> 
                  {formData.parentAccountId && (
                    <>
                      {" "} - Parent: {allAccounts.find(acc => acc.id === formData.parentAccountId)?.accountName}
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountCode">Account Code *</Label>
                  <Input
                    id="accountCode"
                    placeholder="e.g., 1000"
                    value={formData.accountCode}
                    onChange={(e) =>
                      setFormData({ ...formData, accountCode: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type *</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, accountType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="cost of goods sold">Cost of Goods Sold</SelectItem>
                      <SelectItem value="operating expense">Operating Expense</SelectItem>
                      <SelectItem value="capital expenditure">Capital Expenditure</SelectItem>
                      <SelectItem value="other income">Other Income</SelectItem>
                      <SelectItem value="other expense">Other Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name *</Label>
                <Input
                  id="accountName"
                  placeholder="e.g., Cash"
                  value={formData.accountName}
                  onChange={(e) =>
                    setFormData({ ...formData, accountName: e.target.value })
                  }
                />
              </div>

              {/* Parent Account Selection for Hierarchy */}
              <div className="space-y-2">
                <Label htmlFor="parentAccountId">Parent Account (for Hierarchy)</Label>
                <Select
                  value={formData.parentAccountId || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentAccountId: value === "__none__" ? null : value || null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Parent (Top Level)</SelectItem>
                    {allAccounts
                      .filter(acc => acc.id !== id) // Don't show current account
                      .map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.accountCode} - {acc.accountName} ({acc.accountType})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Select a parent account to create a sub-account (e.g., "Cash" under "Current Assets")
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter account description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updateChartOfAccountsMutation.isPending}
                >
                  {updateChartOfAccountsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Account
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/chart-of-accounts")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
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
