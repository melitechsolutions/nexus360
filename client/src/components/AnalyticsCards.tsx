/**
 * Analytics Cards Component
 * 
 * Displays KPI cards with financial metrics and real-time data
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

export function KPICards() {
  const { data: kpiData, isLoading } = trpc.analytics.kpiSummary.useQuery({});

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={`skeleton-${i}`} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpiData) {
    return null;
  }

  const kpis = [
    {
      title: "Total Invoiced",
      value: `$${kpiData.totalInvoiced.toFixed(2)}`,
      description: `${kpiData.totalInvoiceCount} invoices`,
      icon: "📊",
      color: "bg-blue-50",
    },
    {
      title: "Total Paid",
      value: `$${kpiData.totalPaid.toFixed(2)}`,
      description: "Received payments",
      icon: "✅",
      color: "bg-green-50",
    },
    {
      title: "Outstanding",
      value: `$${kpiData.totalOutstanding.toFixed(2)}`,
      description: `${kpiData.overdueCount} overdue`,
      icon: "⏰",
      color: "bg-orange-50",
    },
    {
      title: "Active Projects",
      value: kpiData.activeProjects.toString(),
      description: `${kpiData.activeClients} active clients`,
      icon: "🎯",
      color: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className={`${kpi.color} border-0`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">
                {kpi.title}
              </CardTitle>
              <span className="text-2xl">{kpi.icon}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <p className="text-xs text-gray-600 mt-1">{kpi.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Financial Summary Card
 */
export function FinancialSummaryCard() {
  const { data: summary, isLoading } = trpc.analytics.financialSummary.useQuery({});

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={`skeleton-item-${i}`} className="h-4 bg-gray-200 rounded w-1/2"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>Current month overview</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Invoiced</p>
            <p className="text-2xl font-bold text-gray-900">
              ${summary.totalInvoiced.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              ${summary.totalPaid.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className="text-2xl font-bold text-orange-600">
              ${summary.totalOutstanding.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">
              ${summary.totalExpenses.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">Net Profit</p>
          <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${summary.netProfit.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Invoice Metrics Card
 */
export function InvoiceMetricsCard() {
  const { data: metrics, isLoading } = trpc.analytics.invoiceMetrics.useQuery({});

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-1/2"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Status Breakdown</CardTitle>
        <CardDescription>By status and amount</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric: any) => (
            <div key={`${metric.status}-${metric.count}`} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium capitalize">{metric.status}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">${parseFloat(metric.total || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500">{metric.count} invoices</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Project Status Distribution
 */
export function ProjectStatusCard() {
  const { data: distribution, isLoading } = trpc.analytics.projectStatusDistribution.useQuery({});

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-1/2"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!distribution || distribution.length === 0) {
    return null;
  }

  const statusColors: Record<string, string> = {
    planning: "bg-gray-200",
    active: "bg-green-200",
    on_hold: "bg-yellow-200",
    completed: "bg-blue-200",
    cancelled: "bg-red-200",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Status Distribution</CardTitle>
        <CardDescription>Active projects by status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {distribution.map((item: any) => (
            <div key={item.status}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium capitalize">{item.status}</span>
                <span className="text-sm font-bold">{item.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${statusColors[item.status] || "bg-blue-500"}`}
                  style={{
                    width: `${(item.count / Math.max(...distribution.map((d: any) => d.count))) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Client Distribution Card
 */
export function ClientDistributionCard() {
  const { data: distribution, isLoading } = trpc.analytics.clientDistribution.useQuery({});

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-1/2"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!distribution || distribution.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Distribution</CardTitle>
        <CardDescription>By status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {distribution.map((item: any) => (
            <div key={item.status} className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">{item.status}</span>
              <span className="text-sm font-bold text-blue-600">{item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
