import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Receipt,
  DollarSign,
  Package,
  Briefcase,
  CreditCard,
  BarChart3,
  UserCog,
  TrendingUp,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  stats?: {
    label: string;
    value: string;
  };
}

export default function DashboardHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    activeClients: 0,
    pendingInvoices: 0,
    monthlyRevenue: 0,
    totalProducts: 0,
    totalServices: 0,
    totalEmployees: 0,
  });

  // Fetch dashboard metrics
  const { data: dashboardMetrics } = trpc.dashboard.metrics.useQuery();
  const { data: financialSummary } = trpc.dashboard.financialSummary.useQuery();
  const { data: monthlyChart } = trpc.dashboard.monthlyChart.useQuery({});
  const { data: accountingMetrics } = trpc.dashboard.accountingMetrics.useQuery();
  const { data: recentActivities = [] } = trpc.dashboard.recentActivity.useQuery({ limit: 8 });
  const { data: dashboardStats } = trpc.dashboard.stats.useQuery();

  // Update metrics when data loads
  useEffect(() => {
    if (dashboardMetrics) {
      setMetrics({
        totalProjects: dashboardMetrics.totalProjects || 0,
        activeClients: dashboardMetrics.activeClients || 0,
        pendingInvoices: dashboardMetrics.pendingInvoices || 0,
        monthlyRevenue: dashboardMetrics.monthlyRevenue || 0,
        totalProducts: dashboardMetrics.totalProducts || 0,
        totalServices: dashboardMetrics.totalServices || 0,
        totalEmployees: dashboardMetrics.totalEmployees || 0,
      });
    }
  }, [dashboardMetrics]);

  const handleCardClick = (href: string) => {
    navigate(href);
  };

  // Memoize quickActions to prevent unnecessary re-renders
  const quickActions: QuickActionCard[] = useMemo(() => [
    {
      id: "projects",
      title: "Projects",
      description: "Manage and track all your projects",
      icon: <FolderKanban className="w-8 h-8" />,
      href: "/projects",
      color: "from-blue-500 to-blue-600",
      stats: { label: "Total Projects", value: metrics.totalProjects.toString() },
    },
    {
      id: "clients",
      title: "Clients",
      description: "Client relationship management",
      icon: <Users className="w-8 h-8" />,
      href: "/clients",
      color: "from-green-500 to-green-600",
      stats: { label: "Active Clients", value: metrics.activeClients.toString() },
    },
    {
      id: "invoices",
      title: "Invoices",
      description: "Create and manage invoices",
      icon: <FileText className="w-8 h-8" />,
      href: "/invoices",
      color: "from-purple-500 to-purple-600",
      stats: { label: "Pending Invoices", value: metrics.pendingInvoices.toString() },
    },
    {
      id: "estimates",
      title: "Estimates",
      description: "Generate quotations and estimates",
      icon: <Receipt className="w-8 h-8" />,
      href: "/estimates",
      color: "from-orange-500 to-orange-600",
      stats: { label: "Pending Estimates", value: "0" },
    },
    {
      id: "payments",
      title: "Payments",
      description: "Track payments and transactions",
      icon: <DollarSign className="w-8 h-8" />,
      href: "/payments",
      color: "from-green-500 to-emerald-600",
      stats: { label: "This Month", value: `KES ${((metrics.monthlyRevenue) || 0).toLocaleString()}` },
    },
    {
      id: "products",
      title: "Products",
      description: "Product catalog management",
      icon: <Package className="w-8 h-8" />,
      href: "/products",
      color: "from-cyan-500 to-cyan-600",
      stats: { label: "Total Products", value: metrics.totalProducts.toString() },
    },
    {
      id: "services",
      title: "Services",
      description: "Service offerings catalog",
      icon: <Briefcase className="w-8 h-8" />,
      href: "/services",
      color: "from-indigo-500 to-indigo-600",
      stats: { label: "Total Services", value: metrics.totalServices.toString() },
    },
    {
      id: "accounting",
      title: "Accounting",
      description: "Financial management and reports",
      icon: <CreditCard className="w-8 h-8" />,
      href: "/accounting",
      color: "from-pink-500 to-pink-600",
      stats: { label: "Accounts", value: "0" },
    },
    {
      id: "reports",
      title: "Reports",
      description: "Analytics and insights",
      icon: <BarChart3 className="w-8 h-8" />,
      href: "/reports",
      color: "from-amber-500 to-amber-600",
      stats: { label: "Reports", value: "0" },
    },
    {
      id: "hr",
      title: "HR",
      description: "Human resources management",
      icon: <UserCog className="w-8 h-8" />,
      href: "/hr",
      color: "from-red-500 to-red-600",
      stats: { label: "Employees", value: metrics.totalEmployees.toString() },
    },
    {
      id: "procurement",
      title: "Procurement",
      description: "Manage suppliers, purchase orders, and budgets",
      icon: <Package className="w-8 h-8" />,
      href: "/procurement",
      color: "from-teal-500 to-teal-600",
      stats: { label: "Modules", value: "6" },
    },
    {
      id: "suppliers",
      title: "Suppliers",
      description: "Manage your suppliers and vendor information",
      icon: <Briefcase className="w-8 h-8" />,
      href: "/suppliers",
      color: "from-cyan-500 to-cyan-600",
      stats: { label: "Suppliers", value: "0" },
    },
    {
      id: "departments",
      title: "Departments",
      description: "Organize and manage company departments",
      icon: <Users className="w-8 h-8" />,
      href: "/departments",
      color: "from-purple-500 to-purple-600",
      stats: { label: "Departments", value: "0" },
    },
    {
      id: "budgets",
      title: "Budgets",
      description: "Plan and track budget allocations",
      icon: <DollarSign className="w-8 h-8" />,
      href: "/budgets",
      color: "from-green-500 to-green-600",
      stats: { label: "Budgets", value: "0" },
    },
  ], [metrics]);

  // Memoize overviewMetrics to prevent unnecessary re-renders
  const overviewMetrics = useMemo(() => [
    {
      title: "Total Projects",
      value: metrics.totalProjects.toString(),
      description: "Get started by creating your first project",
      icon: <FolderKanban className="w-5 h-5" />,
      color: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-l-blue-400",
      href: "/projects",
    },
    {
      title: "Active Clients",
      value: metrics.activeClients.toString(),
      description: "Add your first client",
      icon: <Users className="w-5 h-5" />,
      color: "border-l-green-500 bg-green-50 dark:bg-green-900/20 dark:border-l-green-400",
      href: "/clients",
    },
    {
      title: "Pending Invoices",
      value: metrics.pendingInvoices.toString(),
      description: "No pending invoices",
      icon: <FileText className="w-5 h-5" />,
      color: "border-l-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-l-purple-400",
      href: "/invoices",
    },
    {
      title: "Revenue This Month",
      value: `KES ${((metrics.monthlyRevenue) || 0).toLocaleString()}`,
      description: dashboardStats?.revenueGrowth
        ? `${dashboardStats.revenueGrowth > 0 ? "+" : ""}${dashboardStats.revenueGrowth}% vs last month`
        : "Total payments received",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-l-emerald-400",
      href: "/accounting",
    },
    {
      title: "Payments Today",
      value: `KES ${((financialSummary?.paymentsToday ?? 0) / 100).toLocaleString()}`,
      description: "Received today",
      icon: <Banknote className="w-5 h-5" />,
      color: "border-l-teal-500 bg-teal-50 dark:bg-teal-900/20 dark:border-l-teal-400",
      href: "/payments",
    },
    {
      title: "Invoices Due",
      value: `KES ${((financialSummary?.invoicesDue ?? 0) / 100).toLocaleString()}`,
      description: "Outstanding & upcoming",
      icon: <CalendarClock className="w-5 h-5" />,
      color: "border-l-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-l-amber-400",
      href: "/invoices",
    },
    {
      title: "Overdue Invoices",
      value: `KES ${((financialSummary?.invoicesOverdue ?? 0) / 100).toLocaleString()}`,
      description: "Past due date",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "border-l-red-500 bg-red-50 dark:bg-red-900/20 dark:border-l-red-400",
      href: "/invoices",
    },
  ], [metrics, financialSummary, dashboardStats]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Your CRM Dashboard
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Manage your clients, projects, invoices, and more from one powerful platform
          </p>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleCardClick(action.href)}
              className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-left transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600"
            >
              {/* Background gradient on hover */}
              <div
                className={cn(
                  "absolute inset-0 opacity-0 transition-opacity group-hover:opacity-5",
                  `bg-gradient-to-br ${action.color}`
                )}
              />

              {/* Content */}
              <div className="relative space-y-4">
                {/* Icon */}
                <div
                  className={cn(
                    "inline-flex p-3 rounded-lg text-white",
                    `bg-gradient-to-br ${action.color}`
                  )}
                >
                  {action.icon}
                </div>

                {/* Title and Description */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{action.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{action.description}</p>
                </div>

                {/* Stats if available */}
                {action.stats && action.stats.label && action.stats.value && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {String(action.stats.label)}
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {String(action.stats.value)}
                    </p>
                  </div>
                )}

                {/* Arrow Icon */}
                <div className="absolute top-6 right-6 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Overview Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Quick Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {overviewMetrics.map((metric) => (
              <button
                key={metric.title}
                onClick={() => handleCardClick(metric.href)}
                className={cn(
                  "group relative overflow-hidden rounded-lg border-l-4 p-6 text-left transition-all hover:shadow-lg cursor-pointer",
                  metric.color
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {metric.title}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {metric.value}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{metric.description}</p>
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {metric.icon}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Financial Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Revenue vs Expenses Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Monthly Income vs Expenses
                </CardTitle>
                <CardDescription>
                  {monthlyChart?.year || new Date().getFullYear()} financial performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyChart?.months && monthlyChart.months.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChart.months}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 100).toLocaleString()}`} />
                      <Tooltip
                        formatter={(value: number) => [`KES ${(value / 100).toLocaleString()}`, undefined]}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Financial Breakdown
                </CardTitle>
                <CardDescription>Revenue, payments, and expenses</CardDescription>
              </CardHeader>
              <CardContent>
                {accountingMetrics ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Revenue", value: (accountingMetrics.totalRevenue || 0) / 100 },
                          { name: "Payments", value: (accountingMetrics.totalPayments || 0) / 100 },
                          { name: "Expenses", value: (accountingMetrics.totalExpenses || 0) / 100 },
                        ].filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString()}`, undefined]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Recent Activity</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/audit-logs")}>
              View All
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Latest Updates</CardTitle>
              <CardDescription>
                Recent changes and activities in your CRM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {recentActivities.length === 0 ? (
                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        No recent activity
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Start by creating your first project or client
                      </p>
                    </div>
                  </div>
                ) : (
                  recentActivities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
                          activity.action === "create" ? "bg-green-100 text-green-700" :
                          activity.action === "update" ? "bg-blue-100 text-blue-700" :
                          activity.action === "delete" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {activity.action === "create" ? <Plus className="w-4 h-4" /> :
                           activity.action === "update" ? <CheckCircle2 className="w-4 h-4" /> :
                           activity.action === "delete" ? <AlertCircle className="w-4 h-4" /> :
                           <Clock className="w-4 h-4" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {activity.description || `${activity.action} ${activity.entityType}`}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            {activity.entityType?.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 whitespace-nowrap">
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        }) : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Tips */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Your First Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Start building your client database by adding new clients to your CRM.
                </p>
                <Button
                  onClick={() => handleCardClick("/clients")}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Your First Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Organize your work by creating projects and assigning tasks to your team.
                </p>
                <Button
                  onClick={() => handleCardClick("/projects/create")}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Generate Your First Invoice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Create professional invoices and track payments from your clients.
                </p>
                <Button
                  onClick={() => handleCardClick("/invoices")}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

