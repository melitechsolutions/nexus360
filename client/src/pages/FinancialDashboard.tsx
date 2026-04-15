import { useState } from "react";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Calendar,
  Download,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCurrencySettings } from "@/lib/currency";

export default function FinancialDashboard() {
  const { code: currencyCode } = useCurrencySettings();

  const [dateRange, setDateRange] = useState("month");
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv" | "txt" | "json">("pdf");
  const [isExporting, setIsExporting] = useState(false);

  // Fetch financial data
  const { data: statsData, isLoading: isStatsLoading } = trpc.dashboard.stats.useQuery();
  const { data: invoicesData = [], isLoading: isInvoicesLoading } = trpc.invoices.list.useQuery({ limit: 100 });
  const { data: expensesData = [], isLoading: isExpensesLoading } = trpc.expenses.list.useQuery({ limit: 100 });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100);
  };

  // Calculate actual expenses from expenses data
  const totalExpenses = expensesData.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
  
  // Calculate total invoiced amount
  const totalInvoiced = invoicesData.reduce((sum: number, invoice: any) => sum + (invoice.total || 0), 0);
  
  // Calculate paid invoices
  const paidInvoices = invoicesData.filter((inv: any) => inv.status === 'paid').reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
  
  // Calculate outstanding invoices
  const outstandingAmount = invoicesData.filter((inv: any) => inv.status !== 'paid').reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

  const financialMetrics = [
    {
      title: "Total Revenue",
      value: statsData?.totalRevenue || paidInvoices,
      formatted: formatCurrency(statsData?.totalRevenue || paidInvoices),
      change: statsData?.revenueGrowth || 0,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Operating Expenses",
      value: totalExpenses,
      formatted: formatCurrency(totalExpenses),
      change: 5,
      icon: TrendingUp,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "Net Profit",
      value: Math.max(0, (statsData?.totalRevenue || paidInvoices) - totalExpenses),
      formatted: formatCurrency(Math.max(0, (statsData?.totalRevenue || paidInvoices) - totalExpenses)),
      change: statsData?.revenueGrowth || 0,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Outstanding Receivables",
      value: outstandingAmount,
      formatted: formatCurrency(outstandingAmount),
      change: 0,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
  ];

  const exportMutation = trpc.reportExport.generateFinancialReport.useMutation();

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const result = await exportMutation.mutateAsync({
        title: `Financial Report - ${dateRange === "month" ? "This Month" : dateRange === "quarter" ? "This Quarter" : dateRange === "year" ? "This Year" : "All Time"}`,
        format: exportFormat,
        includeDetails: true,
      });

      if (result.success && result.data) {
        // Convert base64 to blob
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mimeType || 'application/octet-stream' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `financial_report.${exportFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Report exported successfully");
      } else {
        toast.error("Failed to export report: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Reports", href: "/reports" },
    { label: "Financial Dashboard" },
  ];

  return (
    <ModuleLayout
      title="Financial Dashboard"
      description="Comprehensive financial overview and analytics"
      icon={<BarChart3 className="w-6 h-6" />}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6 max-w-7xl">
        {/* Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Format</SelectItem>
                <SelectItem value="csv">CSV Format</SelectItem>
                <SelectItem value="txt">Text Format</SelectItem>
                <SelectItem value="json">JSON Format</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExportReport} disabled={isExporting}>
            {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Key Financial Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {financialMetrics.map((metric) => {
            const Icon = metric.icon;
            const isPositive = metric.change >= 0;
            return (
              <Card key={metric.title} className={metric.bgColor}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.formatted}</div>
                  <p className={`text-xs mt-2 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                    {isPositive ? "+" : ""}{metric.change}% from last period
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Financial Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>
                Revenue sources for {dateRange === "month" ? "this month" : dateRange}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Invoiced Revenue</span>
                  <span className="font-medium">{formatCurrency(totalInvoiced)}</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full">
                  <div className="h-full bg-green-600 rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Paid Amount</span>
                  <span className="font-medium">{formatCurrency(paidInvoices)}</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${totalInvoiced > 0 ? (paidInvoices / totalInvoiced) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Outstanding</span>
                  <span className="font-medium">{formatCurrency(outstandingAmount)}</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full">
                  <div className="h-full bg-orange-600 rounded-full" style={{ width: `${totalInvoiced > 0 ? (outstandingAmount / totalInvoiced) * 100 : 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Summary</CardTitle>
              <CardDescription>
                Expense metrics for {dateRange === "month" ? "this month" : dateRange}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Total Expenses</span>
                <span className="font-semibold">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Average Per Transaction</span>
                <span className="font-semibold">
                  {formatCurrency(expensesData && expensesData.length > 0 ? totalExpenses / expensesData.length : 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm">Highest Expense</span>
                <span className="font-semibold">
                  {formatCurrency(
                    expensesData && expensesData.length > 0
                      ? Math.max(...(expensesData.map((e: any) => e.amount || 0) as any))
                      : 0
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Number of Expenses</span>
                <span className="font-semibold">{expensesData?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Status */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Summary</CardTitle>
            <CardDescription>
              Financial summary for selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="border-l-4 border-green-600 pl-4">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalInvoiced)}
                  </p>
                </div>
                <div className="border-l-4 border-red-600 pl-4">
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
                <div className={`border-l-4 ${(totalInvoiced - totalExpenses) >= 0 ? 'border-blue-600' : 'border-orange-600'} pl-4`}>
                  <p className="text-sm text-gray-500">Net Profit</p>
                  <p className={`text-2xl font-bold ${(totalInvoiced - totalExpenses) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(totalInvoiced - totalExpenses)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Last updated: {formatDistanceToNow(new Date(), { addSuffix: true })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
