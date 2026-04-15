import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

function KPICard({ title, value, subtitle, status, change }: any) {
  const isDanger = status === 'negative';
  const isPositive = status === 'positive';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${typeof value === 'number' ? value.toLocaleString() : value}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          {isPositive && <TrendingUp className="w-4 h-4 text-green-600" />}
          {isDanger && <TrendingDown className="w-4 h-4 text-red-600" />}
          {subtitle}
        </div>
        {change && (
          <div className={`text-xs font-semibold mt-2 ${isPositive ? 'text-green-600' : isDanger ? 'text-red-600' : 'text-gray-600'}`}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsHub() {
  const [selectedPeriod, setPeriod] = useState('current');
  const [compareMode, setCompareMode] = useState(false);

  // Fetch analytics data from tRPC
  const financialOverview = trpc.advancedAnalytics.getFinancialOverview.useQuery({});
  const revenueAnalytics = trpc.advancedAnalytics.getRevenueAnalytics.useQuery({});
  const expenseAnalytics = trpc.advancedAnalytics.getExpenseAnalytics.useQuery({});
  const cashFlowAnalytics = trpc.advancedAnalytics.getCashFlowAnalytics.useQuery({});
  const profitabilityAnalytics = trpc.advancedAnalytics.getProfitabilityAnalytics.useQuery({});
  const inventoryAnalytics = trpc.advancedAnalytics.getInventoryAnalytics.useQuery({});
  const receivablesAnalytics = trpc.advancedAnalytics.getReceivablesAnalytics.useQuery({});
  const employeeAnalytics = trpc.advancedAnalytics.getEmployeeAnalytics.useQuery({});
  const assetAnalytics = trpc.advancedAnalytics.getAssetAnalytics.useQuery({});
  const departmentAnalytics = trpc.advancedAnalytics.getDepartmentAnalytics.useQuery({});
  const comparativeAnalytics = trpc.advancedAnalytics.getComparativeAnalytics.useQuery({});

  const isLoading =
    financialOverview.isLoading ||
    revenueAnalytics.isLoading ||
    expenseAnalytics.isLoading;

  const handleExport = () => {
    const overview = financialOverview.data;
    const revenue = revenueAnalytics.data;
    if (!overview && !revenue) { toast.info("No data to export"); return; }
    const lines = ["Analytics Report", `Generated: ${new Date().toLocaleString()}`, ""];
    if (overview) {
      lines.push("=== Financial Overview ===");
      Object.entries(overview).forEach(([k, v]) => lines.push(`${k}: ${JSON.stringify(v)}`));
    }
    if (revenue) {
      lines.push("", "=== Revenue Analytics ===");
      Object.entries(revenue).forEach(([k, v]) => lines.push(`${k}: ${JSON.stringify(v)}`));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics-report.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics report exported");
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Hub</h1>
            <p className="text-gray-600 mt-1">Comprehensive Business Intelligence Dashboard</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedPeriod} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Overview Tab Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8 bg-white">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="cash">Cash Flow</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {financialOverview.data && (
              <>
                <KPICard
                  title="Revenue (YTD)"
                  value={financialOverview.data.revenue.ytd}
                  subtitle={`vs prior year: ${financialOverview.data.revenue.variance > 0 ? '+' : ''}${financialOverview.data.revenue.variance.toFixed(1)}%`}
                  status={financialOverview.data.revenue.status}
                  change={financialOverview.data.revenue.variance}
                />
                <KPICard
                  title="Expenses (YTD)"
                  value={financialOverview.data.expenses.ytd}
                  subtitle={`vs budget: ${financialOverview.data.expenses.variance.toFixed(1)}%`}
                  status={financialOverview.data.expenses.status}
                  change={-financialOverview.data.expenses.variance}
                />
                <KPICard
                  title="Net Income"
                  value={financialOverview.data.netIncome.ytd}
                  subtitle={`Margin: ${financialOverview.data.netIncome.margin.toFixed(1)}%`}
                  status={financialOverview.data.netIncome.status}
                />
                <KPICard
                  title="Current Ratio"
                  value={financialOverview.data.ratios.currentRatio}
                  subtitle="Target: 1.5-2.0"
                  status={financialOverview.data.ratios.currentRatio > 1.5 ? 'positive' : 'neutral'}
                />
              </>
            )}
          </div>

          {/* Financial Health Indicators */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Financial Health Indicators</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              {financialOverview.data && (
                <>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">
                      {financialOverview.data.ratios.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-gray-600">ROA</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      {financialOverview.data.ratios.returnOnAssets}%
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium text-gray-600">Debt/Equity</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">
                      {financialOverview.data.ratios.debtToEquity}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-gray-600">Current Ratio</p>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                      {financialOverview.data.ratios.currentRatio}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Revenue Trend Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Revenue Trend (12 Months)</CardTitle>
                <CardDescription>Monthly revenue with transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueAnalytics.data && (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueAnalytics.data.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                        formatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>By category</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseAnalytics.data && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseAnalytics.data.byCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.category}: ${entry.percentage.toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {expenseAnalytics.data.byCategory.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* REVENUE TAB */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {revenueAnalytics.data && (
              <>
                <KPICard
                  title="Total Revenue"
                  value={revenueAnalytics.data.metrics.totalRevenue}
                  subtitle="All time"
                  status="positive"
                />
                <KPICard
                  title="Avg Transaction"
                  value={revenueAnalytics.data.metrics.averageTransactionValue}
                  subtitle={`${revenueAnalytics.data.metrics.transactionCount} transactions`}
                  status="neutral"
                />
                <KPICard
                  title="Transaction Count"
                  value={revenueAnalytics.data.metrics.transactionCount}
                  subtitle="Total invoices"
                  status="positive"
                />
              </>
            )}
          </div>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueAnalytics.data && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={revenueAnalytics.data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {expenseAnalytics.data && (
              <>
                <KPICard
                  title="Total Expenses"
                  value={expenseAnalytics.data.metrics.totalExpenses}
                  subtitle="All time"
                  status="neutral"
                />
                <KPICard
                  title="Avg Monthly"
                  value={expenseAnalytics.data.metrics.averageExpense}
                  subtitle="Monthly average"
                  status="neutral"
                />
              </>
            )}
          </div>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseAnalytics.data && (
                <div className="space-y-3">
                  {expenseAnalytics.data.byCategory.map((cat: any) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{cat.category}</span>
                          <span className="text-sm text-gray-600">${cat.amount.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="ml-4 text-sm font-semibold text-gray-700">{cat.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CASH FLOW TAB */}
        <TabsContent value="cash" className="space-y-6">
          {cashFlowAnalytics.data && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <KPICard
                  title="Opening Balance"
                  value={cashFlowAnalytics.data.current.openingBalance}
                  subtitle="Start of period"
                  status="neutral"
                />
                <KPICard
                  title="Receipts"
                  value={cashFlowAnalytics.data.current.receipts}
                  subtitle="Cash In"
                  status="positive"
                />
                <KPICard
                  title="Disbursements"
                  value={cashFlowAnalytics.data.current.disbursements}
                  subtitle="Cash Out"
                  status="neutral"
                />
                <KPICard
                  title="Closing Balance"
                  value={cashFlowAnalytics.data.current.closingBalance}
                  subtitle="End of period"
                  status="positive"
                />
              </div>

              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Cash Flow Forecast</CardTitle>
                  <CardDescription>30/60/90-day projection</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-gray-600">30 Days</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        ${cashFlowAnalytics.data.forecast.day30.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-gray-600">60 Days</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        ${cashFlowAnalytics.data.forecast.day60.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-gray-600">90 Days</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        ${cashFlowAnalytics.data.forecast.day90.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {cashFlowAnalytics.data.alerts.length > 0 && (
                <Card className="bg-red-50 border-red-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <CardTitle className="text-red-600">Alerts</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cashFlowAnalytics.data.alerts.map((alert: string, idx: number) => (
                      <p key={idx} className="text-sm text-red-600">{alert}</p>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* DEPARTMENTS TAB */}
        <TabsContent value="departments" className="space-y-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {departmentAnalytics.data && (
                <div className="space-y-4">
                  {departmentAnalytics.data.departments.map((dept: any) => (
                    <div key={dept.departmentId} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Department {dept.departmentId}</h3>
                        <span className="text-lg font-bold text-blue-600">
                          ${dept.expense.toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Margin</p>
                          <p className="font-semibold">{dept.profitMargin.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Headcount</p>
                          <p className="font-semibold">{dept.headcount} employees</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cost/Employee</p>
                          <p className="font-semibold">${dept.costPerEmployee.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
