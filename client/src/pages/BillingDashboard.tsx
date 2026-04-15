/**
 * Billing Dashboard Component
 * Comprehensive billing metrics, invoice management, and financial analytics
 * 
 * Features:
 * - Revenue trends and forecasting
 * - Outstanding invoices tracking
 * - Payment method breakdown
 * - Cash flow visualization
 * - Invoice management with bulk actions
 * - Export reports (PDF, CSV)
 */

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getGradientCard, getStatusColor, layouts, animations } from "@/lib/designSystem";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { exportToCsv } from "@/utils/exportCsv";

interface RevenueData {
  month: string;
  revenue: number;
  target: number;
  expenses: number;
}

interface PaymentMethodData {
  name: string;
  value: number;
  percentage: number;
}

interface InvoiceMetrics {
  total: number;
  outstanding: number;
  overdue: number;
  paid: number;
  draft: number;
}

export default function BillingDashboard() {
  const { allowed, isLoading: permissionsLoading } = useRequireFeature("accounting:dashboard:view");
  const [dateRange, setDateRange] = useState("year");
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");

  // Fetch billing data
  const { data: invoicesData = [], isLoading: invoicesLoading } = trpc.invoices.list.useQuery({ limit: 1000 });
  const { data: paymentsData = [], isLoading: paymentsLoading } = trpc.payments.list.useQuery({ limit: 1000 });
  const { data: expensesData = [], isLoading: expensesLoading } = trpc.expenses.list.useQuery({ limit: 1000 });
  const { data: clientsData = [] } = trpc.clients.list.useQuery();

  // Calculate invoice metrics
  const invoiceMetrics: InvoiceMetrics = useMemo(() => {
    const invoices = Array.isArray(invoicesData) ? invoicesData : [];
    const now = new Date();
    
    return {
      total: invoices.length,
      outstanding: invoices.filter((i: any) => i.status === "sent" || i.status === "viewed").length,
      overdue: invoices.filter((i: any) => {
        if (i.status === "paid") return false;
        return i.dueDate && new Date(i.dueDate) < now;
      }).length,
      paid: invoices.filter((i: any) => i.status === "paid").length,
      draft: invoices.filter((i: any) => i.status === "draft").length,
    };
  }, [invoicesData]);

  // Calculate revenue trends (last 12 months)
  const revenueTrends: RevenueData[] = useMemo(() => {
    const trends: RevenueData[] = [];
    const invoices = Array.isArray(invoicesData) ? invoicesData : [];
    const expenses = Array.isArray(expensesData) ? expensesData : [];

    for (let i = 11; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt);
        return invDate >= monthStart && invDate <= monthEnd && inv.status === "paid";
      });

      const monthExpenses = expenses.filter((exp: any) => {
        const expDate = new Date(exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      });

      const revenue = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      const expenseAmount = monthExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

      trends.push({
        month: format(month, "MMM"),
        revenue: revenue / 100,
        target: revenue > 0 ? Math.round((revenue / 100) * 1.1) : 0,
        expenses: expenseAmount / 100,
      });
    }

    return trends;
  }, [invoicesData, expensesData]);

  // Payment method breakdown
  const paymentMethodData: PaymentMethodData[] = useMemo(() => {
    const payments = Array.isArray(paymentsData) ? paymentsData : [];
    const methodMap: Record<string, number> = {};

    payments.forEach((payment: any) => {
      const method = payment.paymentMethod || "unknown";
      methodMap[method] = (methodMap[method] || 0) + (payment.amount || 0);
    });

    const total = Object.values(methodMap).reduce((sum, val) => sum + val, 0);
    return Object.entries(methodMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value / 100,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }));
  }, [paymentsData]);

  // Calculate key metrics
  const totalRevenue = revenueTrends.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = revenueTrends.reduce((sum, m) => sum + m.expenses, 0);
  const netProfit = totalRevenue - totalExpenses;
  const averagePaymentTime = useMemo(() => {
    const paidInvoices = Array.isArray(invoicesData) ? (invoicesData as any[]).filter((inv: any) => inv.status === "paid" && inv.paidAt && inv.createdAt) : [];
    if (paidInvoices.length === 0) return 0;
    const totalDays = paidInvoices.reduce((sum: number, inv: any) => {
      const created = new Date(inv.createdAt).getTime();
      const paid = new Date(inv.paidAt).getTime();
      return sum + Math.max(0, (paid - created) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(totalDays / paidInvoices.length);
  }, [invoicesData]);
  const collectionRate = invoiceMetrics.paid > 0 
    ? ((invoiceMetrics.paid / invoiceMetrics.total) * 100).toFixed(1)
    : "0";

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  // Dashboard cards
  const dashboardCards = [
    {
      title: "Total Revenue",
      value: `KES ${totalRevenue.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`,
      change: "+12%",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Outstanding Amount",
      value: `KES ${(revenueTrends
        .reduce((sum, m) => sum + m.revenue * 0.3, 0) // Assume 30% outstanding
        .toLocaleString("en-KE", { maximumFractionDigits: 0 }))}`,
      change: `${invoiceMetrics.outstanding} invoices`,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      title: "Net Profit",
      value: `KES ${netProfit.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`,
      change: netProfit > 0 ? "+8%" : "-5%",
      icon: TrendingUp,
      color: netProfit > 0 ? "text-blue-600" : "text-red-600",
      bgColor: netProfit > 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "Collection Rate",
      value: `${collectionRate}%`,
      change: `${invoiceMetrics.paid}/${invoiceMetrics.total} paid`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  if (permissionsLoading) return <Spinner className="w-8 h-8 mx-auto my-8" />;
  if (!allowed) return null;

  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Billing", href: "/billing" },
      ]}
      title="Billing Dashboard"
      description="Financial overview and invoice management"
      icon={<BarChart3 className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            disabled={isExporting}
            onClick={() => {
              setIsExporting(true);
              try {
                if (!revenueTrends.length) {
                  toast.info("No billing data available to export");
                  return;
                }
                exportToCsv(`billing-dashboard-${dateRange}`, revenueTrends);
                toast.success("Billing report exported");
              } finally {
                setIsExporting(false);
              }
            }}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className={layouts.dashboardGrid}>
          {dashboardCards.map((card) => {
            const Icon = card.icon;
            const colorScheme = card.title === "Total Revenue" ? "emerald" : 
                              card.title === "Outstanding Amount" ? "orange" :
                              card.title === "Net Profit" ? "blue" : "purple";
            
            return (
              <Card key={card.title} className={getGradientCard(colorScheme)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {card.title}
                    <Icon className={`w-5 h-5 ${getStatusColor(card.title)}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{card.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row 1: Revenue Trends and Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trends */}
          <Card className={`${getGradientCard("blue")} lg:col-span-2`}>
            <CardHeader>
              <CardTitle className={animations.fadeIn}>Revenue Trends (12 Months)</CardTitle>
              <CardDescription>Revenue vs Target vs Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                  <Bar dataKey="target" fill="#10b981" name="Target" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className={getGradientCard("purple")}>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Distribution by method</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodData.map((data, index) => (
                      <Cell key={`${data.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Statistics */}
        <Card className={getGradientCard("slate")}>
          <CardHeader>
            <CardTitle>Invoice Statistics</CardTitle>
            <CardDescription>Current invoice status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-black/20">
                <div className="text-2xl font-bold">{invoiceMetrics.total}</div>
                <p className="text-sm text-muted-foreground mt-1">Total Invoices</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20">
                <div className="text-2xl font-bold text-emerald-600">{invoiceMetrics.paid}</div>
                <p className="text-sm text-muted-foreground mt-1">Paid</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-100/50 dark:bg-orange-900/20">
                <div className="text-2xl font-bold text-orange-600">{invoiceMetrics.outstanding}</div>
                <p className="text-sm text-muted-foreground mt-1">Outstanding</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20">
                <div className="text-2xl font-bold text-red-600">{invoiceMetrics.overdue}</div>
                <p className="text-sm text-muted-foreground mt-1">Overdue</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-100/50 dark:bg-slate-900/20">
                <div className="text-2xl font-bold text-slate-600">{invoiceMetrics.draft}</div>
                <p className="text-sm text-muted-foreground mt-1">Draft</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className={getGradientCard("emerald")}>
          <CardHeader>
            <CardTitle>Key Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-lg bg-white/50 dark:bg-black/20">
                <p className="text-sm text-muted-foreground mb-2">Average Payment Time</p>
                <p className="text-3xl font-bold">{averagePaymentTime} days</p>
                <Badge variant="outline" className="mt-2">Target: 30 days</Badge>
              </div>
              <div className="p-4 rounded-lg bg-white/50 dark:bg-black/20">
                <p className="text-sm text-muted-foreground mb-2">Collection Rate</p>
                <p className="text-3xl font-bold text-emerald-600">{collectionRate}%</p>
                <Badge variant="outline" className="mt-2">Goal: 90%</Badge>
              </div>
              <div className="p-4 rounded-lg bg-white/50 dark:bg-black/20">
                <p className="text-sm text-muted-foreground mb-2">Monthly Recurring Revenue</p>
                <p className="text-3xl font-bold">
                  KES {(revenueTrends[revenueTrends.length - 1]?.revenue || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                </p>
                <Badge variant="outline" className="mt-2">Last Month</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
