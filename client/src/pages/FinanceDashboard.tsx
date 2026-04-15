import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
  BarChart3,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";

export default function FinanceDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    pendingInvoices: 0,
    totalExpenses: 0,
    accountBalance: 0,
  });

  // Fetch dashboard metrics
  const { data: dashboardMetrics } = trpc.dashboard.metrics.useQuery();

  useEffect(() => {
    if (dashboardMetrics) {
      setMetrics({
        totalRevenue: dashboardMetrics.monthlyRevenue || 0,
        pendingInvoices: dashboardMetrics.pendingInvoices || 0,
        totalExpenses: 0,
        accountBalance: (dashboardMetrics.monthlyRevenue || 0) * 0.75,
      });
    }
  }, [dashboardMetrics]);

  const financeFeatures = [
    {
      title: "Invoices",
      description: "Create and manage invoices",
      icon: <FileText className="w-8 h-8" />,
      href: "/invoices",
      color: "from-blue-500 to-blue-600",
      stat: { label: "Pending", value: metrics.pendingInvoices },
    },
    {
      title: "Payments",
      description: "Track payments and transactions",
      icon: <DollarSign className="w-8 h-8" />,
      href: "/payments",
      color: "from-green-500 to-green-600",
      stat: { label: "This Month", value: "KES " + (metrics.totalRevenue / 1000).toFixed(1) + "K" },
    },
    {
      title: "Expenses",
      description: "Manage expenses and costs",
      icon: <TrendingDown className="w-8 h-8" />,
      href: "/expenses",
      color: "from-orange-500 to-orange-600",
      stat: { label: "Total", value: "KES 0" },
    },
    {
      title: "Reports",
      description: "Financial reports and analytics",
      icon: <BarChart3 className="w-8 h-8" />,
      href: "/reports",
      color: "from-purple-500 to-purple-600",
      stat: { label: "Balance", value: "KES " + (metrics.accountBalance / 1000).toFixed(1) + "K" },
    },
  ];

  return (
    <ModuleLayout
      title="Finance Dashboard"
      description={`Welcome, ${user?.name}. Monitor your financial performance.`}
      icon={<DollarSign className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Finance" },
      ]}
    >
      <div className="space-y-8">

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Total Revenue"
          value={<>KES {(metrics.totalRevenue / 1000).toFixed(1)}K</>}
          description="This month"
          icon={<TrendingUp className="h-5 w-5" />}
          color="border-l-green-500"
        />

        <StatsCard
          label="Pending Invoices"
          value={metrics.pendingInvoices}
          description="Awaiting payment"
          icon={<FileText className="h-5 w-5" />}
          color="border-l-blue-500"
        />

        <StatsCard
          label="Total Expenses"
          value="KES 0"
          description="This month"
          icon={<TrendingDown className="h-5 w-5" />}
          color="border-l-orange-500"
        />

        <StatsCard
          label="Account Balance"
          value={<>KES {(metrics.accountBalance / 1000).toFixed(1)}K</>}
          description="Available balance"
          icon={<DollarSign className="h-5 w-5" />}
          color="border-l-purple-500"
        />
      </div>

      {/* Finance Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {financeFeatures.map((feature) => (
          <Card
            key={feature.href}
            className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group hover:scale-105 border-2 hover:border-primary/50"
            onClick={() => navigate(feature.href)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white`}>
                  {feature.icon}
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <CardTitle className="mt-4">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button variant="ghost" className="w-full group-hover:bg-accent">
                  View {feature.title}
                </Button>
                <span className="text-sm font-semibold text-muted-foreground">
                  {feature.stat.value}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Alerts */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Financial Alerts</h3>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-sm">Invoices Due Soon</CardTitle>
                <CardDescription>{metrics.pendingInvoices} invoices pending payment</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
      </div>
    </ModuleLayout>
  );
}
