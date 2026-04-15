import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingDown, TrendingUp, AlertTriangle, DollarSign, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";

export default function ExpenseBudgetReport() {
  const { code: currencyCode } = useCurrencySettings();

  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  
  // Fetch budgets for the year
  const { data: budgets = [], isLoading: budgetsLoading } = trpc.budget.list.useQuery({
    year: parseInt(yearFilter),
  });

  // Fetch budget allocations
  const { data: allocations = [], isLoading: allocationsLoading } = trpc.budget.getAllocations.useQuery({
    year: parseInt(yearFilter),
  });

  // Fetch expenses linked to budgets
  const { data: expenses = [], isLoading: expensesLoading } = trpc.expenses.getByBudget.useQuery(
    { budgetAllocationId: selectedBudgetId || undefined },
    { enabled: !!selectedBudgetId }
  );

  const isLoading = budgetsLoading || allocationsLoading || expensesLoading;

  // Calculate statistics
  const stats = useMemo(() => {
    const totalBudgeted = budgets.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalSpent = allocations.reduce((sum, a) => sum + (a.spent || 0), 0);
    const totalRemaining = totalBudgeted - totalSpent;
    const utilizationPercent = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining,
      utilizationPercent,
      overBudgetCount: allocations.filter(a => (a.spent || 0) > (a.totalAmount || 0)).length,
    };
  }, [budgets, allocations]);

  // Prepare chart data
  const budgetTrendData = useMemo(() => {
    // Group allocations by department and month
    const groupedData: Record<string, any> = {};
    
    allocations.forEach((alloc: any) => {
      const key = alloc.departmentName || "Unassigned";
      if (!groupedData[key]) {
        groupedData[key] = {
          department: key,
          budgeted: 0,
          spent: 0,
          remaining: 0,
        };
      }
      groupedData[key].budgeted += alloc.totalAmount || 0;
      groupedData[key].spent += alloc.spent || 0;
      groupedData[key].remaining += (alloc.totalAmount || 0) - (alloc.spent || 0);
    });

    return Object.values(groupedData);
  }, [allocations]);

  const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

  const departmentSummary = useMemo(() => {
    return allocations.map((alloc: any) => ({
      department: alloc.departmentName || "Unassigned",
      budgeted: alloc.totalAmount || 0,
      spent: alloc.spent || 0,
      remaining: (alloc.totalAmount || 0) - (alloc.spent || 0),
      utilizationPercent: alloc.totalAmount > 0 ? Math.round(((alloc.spent || 0) / (alloc.totalAmount || 0)) * 100) : 0,
      status: (alloc.spent || 0) > (alloc.totalAmount || 0) ? "Over Budget" : "On Track",
    }));
  }, [allocations]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  });

  return (
    <ModuleLayout
      title="Expense Budget Report"
      breadcrumbs={[
        { label: "Finance", href: "/accounting" },
        { label: "Budgets", href: "/budgets" },
        { label: "Report" },
      ]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Fiscal Year</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { utils.budget.invalidate(); utils.expenses.invalidate(); toast.success("Report regenerated"); }}>Generate Report</Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            label="Total Budgeted"
            value={<><DollarSign className="h-6 w-6 text-blue-500" /> {formatCurrency(stats.totalBudgeted)}</>}
            description={<>{budgets.length} Budget allocations</>}
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="Total Spent"
            value={<><TrendingDown className="h-6 w-6 text-orange-500" /> {formatCurrency(stats.totalSpent)}</>}
            description={<>{stats.utilizationPercent}% utilization</>}
            icon={<TrendingDown className="h-5 w-5" />}
            color="border-l-orange-500"
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${stats.totalRemaining < 0 ? "text-red-600" : "text-green-600"}`}>
                <TrendingUp className="h-6 w-6" />
                {formatCurrency(stats.totalRemaining)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Available funds</p>
            </CardContent>
          </Card>

          <StatsCard
            label="Over Budget"
            value={<><AlertTriangle className="h-6 w-6 text-red-500" /> {stats.overBudgetCount}</>}
            description="Departments/allocations"
            icon={<AlertTriangle className="h-5 w-5" />}
            color="border-l-red-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget by Department Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Spent by Department</CardTitle>
              <CardDescription>Year: {yearFilter}</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="budgeted" fill="#3b82f6" name="Budgeted" />
                    <Bar dataKey="spent" fill="#ef4444" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Budget Utilization Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization Status</CardTitle>
              <CardDescription>Distribution of remaining budget</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.totalBudgeted > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Spent", value: stats.totalSpent },
                        { name: "Remaining", value: Math.max(0, stats.totalRemaining) },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#ef4444" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No budget data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Department Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Department Budget Summary</CardTitle>
            <CardDescription>Detailed breakdown by department</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : departmentSummary.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Utilization %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentSummary.map((dept: any, idx: number) => (
                    <TableRow key={dept.department || `exp-${idx}`} className={dept.status === "Over Budget" ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell className="text-right">{formatCurrency(dept.budgeted)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(dept.spent)}</TableCell>
                      <TableCell className={`text-right font-medium ${dept.remaining < 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(dept.remaining)}
                      </TableCell>
                      <TableCell className="text-right">{dept.utilizationPercent}%</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          dept.status === "Over Budget" 
                            ? "bg-red-100 text-red-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          {dept.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No allocations found for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Alerts for Over Budget */}
        {stats.overBudgetCount > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <h3 className="font-semibold mb-1">Budget Alert</h3>
              {stats.overBudgetCount} department/allocation(s) have exceeded their budget limits. Review spending and consider budget reallocation.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ModuleLayout>
  );
}
