import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Eye, Trash2, ChevronRight, TrendingUp, Calendar, PiggyBank } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

export default function BudgetsPage() {
  const [, navigate] = useLocation();
  // Call All hooks unconditionally at top level
  const { allowed, isLoading: permissionLoading } = useRequireFeature("accounting:budgets:view");
  const [searchTerm, setSearchTerm] = useState("");
  const [showYTDOnly, setShowYTDOnly] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: budgets, isLoading, refetch } = trpc.budgets.list.useQuery();
  const deleteBudgetMutation = trpc.budgets.delete.useMutation({
    onSuccess: () => {
      toast.success("Budget deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete budget");
    },
  });

  // Ensure budgets is always an array
  const budgetsArray = Array.isArray(budgets) ? budgets : [];

  // Calculate YTD metrics
  const ytdMetrics = useMemo(() => {
    const totalBudget = budgetsArray.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalRemaining = budgetsArray.reduce((sum, b) => sum + (b.remaining || 0), 0);
    const totalSpent = totalBudget - totalRemaining;
    const ytdPercentage = totalBudget === 0 ? 0 : Math.round((totalSpent / totalBudget) * 100);
    
    return {
      totalBudget,
      totalRemaining,
      totalSpent,
      ytdPercentage,
      count: budgetsArray.length
    };
  }, [budgetsArray]);

  const filteredBudgets = useMemo(() => {
    if (!Array.isArray(budgetsArray) || budgetsArray.length === 0) {
      return [];
    }
    
    const filtered = budgetsArray.filter(
      (budget) =>
        (budget?.departmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget?.fiscalYear?.toString().includes(searchTerm)) &&
        (!showYTDOnly || budget?.fiscalYear === selectedYear)
    );
    
    return filtered;
  }, [budgetsArray, searchTerm, showYTDOnly, selectedYear]);

  const getPercentageUsed = (amount: number, remaining: number) => {
    if (amount === 0) return 0;
    return Math.round(((amount - remaining) / amount) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 75) return "bg-yellow-500";
    if (percentage < 90) return "bg-orange-500";
    return "bg-red-500";
  };

  // Permission checks - safe to do after all hooks are called
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <ModuleLayout
      title="Budget Management"
      description="Track and manage department budgets, monitor spending, and analyze budget utilization"
      icon={<PiggyBank className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Budgets" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/budgets/professional")}
            variant="outline"
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Professional Budgeting
          </Button>
          <Button
            onClick={() => navigate("/budgets/create")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Budget
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

      {/* YTD Metrics Summary */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          label="Total Budget"
          value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, }).format(ytdMetrics.totalBudget)}
          description={<>{ytdMetrics.count} budgets</>}
          color="border-l-purple-500"
        />

        <StatsCard
          label="YTD Spent"
          value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, }).format(ytdMetrics.totalSpent)}
          description={<>{ytdMetrics.ytdPercentage}% of budget</>}
          color="border-l-green-500"
        />

        <StatsCard
          label="Remaining"
          value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, }).format(ytdMetrics.totalRemaining)}
          description={<>{100 - ytdMetrics.ytdPercentage}% available</>}
          color="border-l-blue-500"
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">YTD Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      ytdMetrics.ytdPercentage < 50
                        ? "bg-green-500"
                        : ytdMetrics.ytdPercentage < 75
                        ? "bg-yellow-500"
                        : ytdMetrics.ytdPercentage < 90
                        ? "bg-orange-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(ytdMetrics.ytdPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-semibold">{ytdMetrics.ytdPercentage}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Search Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by department or fiscal year..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showYTDOnly ? "default" : "outline"}
            onClick={() => setShowYTDOnly(!showYTDOnly)}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            YTD {selectedYear}
          </Button>
          {showYTDOnly && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i).map(
                (year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                )
              )}
            </select>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Budgets ({filteredBudgets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading budgets...
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No budgets found. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="hidden md:table-cell">Fiscal Year</TableHead>
                    <TableHead className="text-right">Total Budget</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Remaining</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.map((budget) => {
                    const percentage = getPercentageUsed(budget.amount || 0, budget.remaining || 0);
                    const progressColor = getProgressColor(percentage);
                    return (
                      <TableRow key={budget.id}>
                        <TableCell className="font-medium">
                          {budget.departmentName || "N/A"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{budget.fiscalYear || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(budget.amount || 0)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right">
                          <span className={percentage > 75 ? "text-red-600 font-semibold" : ""}>
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(budget.remaining || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`${progressColor} h-2 rounded-full transition-all`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/budgets/${budget.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/budgets/${budget.id}/edit`)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to delete this budget? This action cannot be undone."
                                  )
                                ) {
                                  deleteBudgetMutation.mutate(budget.id);
                                }
                              }}
                              disabled={deleteBudgetMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </ModuleLayout>
  );
}
