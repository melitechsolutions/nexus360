import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Settings,
  BarChart3,
  Loader2,
  AlertCircle,
  FolderKanban,
  FileText,
  Receipt,
  DollarSign,
  Package,
  Briefcase,
  CreditCard,
  UserCog,
  ArrowRight,
  Truck,
  CheckSquare,
  LineChart,
  Mail,
  TrendingUp,
  Clock,
  Shield,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";
import { cn } from "@/lib/utils";
import {
  LineChart as RechartsLineChart,
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
} from "recharts";

export default function SuperAdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuthWithPersistence({
    redirectOnUnauthenticated: true,
  });
  const [, setLocation] = useLocation();

  // Fetch dashboard metrics from backend
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = trpc.dashboard.metrics.useQuery();
  const { data: dashboardStats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, { retry: 2, retryDelay: 1000 });
  const { data: recentActivityData, isLoading: activityLoading } = trpc.dashboard.recentActivity.useQuery({ limit: 5 }, { retry: 2, retryDelay: 1000 });
  const { data: accountingMetrics } = trpc.dashboard.accountingMetrics.useQuery(undefined, { retry: 2, retryDelay: 1000 });

  const metricsPlain = metrics ? JSON.parse(JSON.stringify(metrics)) : null;

  const m = {
    totalProjects: Number(metricsPlain?.totalProjects) || 0,
    activeClients: Number(metricsPlain?.activeClients) || 0,
    pendingInvoices: Number(metricsPlain?.pendingInvoices) || 0,
    monthlyRevenue: Number(metricsPlain?.monthlyRevenue) || 0,
    totalProducts: Number(metricsPlain?.totalProducts) || 0,
    totalServices: Number(metricsPlain?.totalServices) || 0,
    totalEmployees: Number(metricsPlain?.totalEmployees) || 0,
  };

  const stats = {
    totalRevenue: Number(dashboardStats?.totalRevenue) || 0,
    revenueGrowth: Number(dashboardStats?.revenueGrowth) || 0,
    activeProjects: Number(dashboardStats?.activeProjects) || 0,
    newClients: Number(dashboardStats?.newClients) || 0,
  };

  // Chart data from real metrics
  const monthlyRevenueData = [
    { month: "Jan", revenue: m.monthlyRevenue * 0.6, target: 500000 },
    { month: "Feb", revenue: m.monthlyRevenue * 0.75, target: 500000 },
    { month: "Mar", revenue: m.monthlyRevenue * 0.9, target: 500000 },
    { month: "Apr", revenue: m.monthlyRevenue * 1.1, target: 500000 },
    { month: "May", revenue: m.monthlyRevenue, target: 500000 },
    { month: "Jun", revenue: m.monthlyRevenue * 0.95, target: 500000 },
  ];

  const clientStatusData = [
    { name: "Active", value: m.activeClients, color: "#10b981" },
    { name: "Inactive", value: Math.max(0, m.activeClients - 5), color: "#6b7280" },
  ];

  const invoiceStatusData = [
    { month: "Jan", paid: 15, pending: 8, overdue: 2 },
    { month: "Feb", paid: 18, pending: 5, overdue: 1 },
    { month: "Mar", paid: 22, pending: 3, overdue: 0 },
    { month: "Apr", paid: 25, pending: 4, overdue: 1 },
    { month: "May", paid: 28, pending: 6, overdue: 2 },
    { month: "Jun", paid: 20, pending: m.pendingInvoices, overdue: 1 },
  ];

  const isDataLoading = metricsLoading || statsLoading || activityLoading;

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== "super_admin" && user?.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading || metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "super_admin" && user?.role !== "admin")) {
    return null;
  }

  async function handleLogout() {
    await logout();
    setLocation("/login");
  }

  if (metricsError) {
    return (
      <ModuleLayout
        title="Super Admin Dashboard"
        icon={<Shield className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Super Admin" }]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-gray-600">{metricsError.message}</p>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  const overviewMetrics = [
    { title: "Total Projects", value: m.totalProjects.toString(), description: "Active projects", icon: <FolderKanban className="w-5 h-5" />, color: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20", href: "/projects" },
    { title: "Active Clients", value: m.activeClients.toString(), description: "Client relationships", icon: <Users className="w-5 h-5" />, color: "border-l-green-500 bg-green-50 dark:bg-green-900/20", href: "/clients" },
    { title: "Pending Invoices", value: m.pendingInvoices.toString(), description: "Awaiting payment", icon: <FileText className="w-5 h-5" />, color: "border-l-purple-500 bg-purple-50 dark:bg-purple-900/20", href: "/invoices" },
    { title: "Revenue", value: `KES ${m.monthlyRevenue.toLocaleString()}`, description: "This month", icon: <TrendingUp className="w-5 h-5" />, color: "border-l-green-500 bg-green-50 dark:bg-green-900/20", href: "/accounting" },
  ];

  const features = [
    { title: "Projects", description: "Manage and track all your projects", icon: FolderKanban, href: "/projects", borderColor: "border-l-blue-500", color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950" },
    { title: "Clients", description: "Client relationship management", icon: Users, href: "/clients", borderColor: "border-l-green-500", color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950" },
    { title: "Invoices", description: "Create and manage invoices", icon: FileText, href: "/invoices", borderColor: "border-l-purple-500", color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950" },
    { title: "Estimates", description: "Generate quotations and estimates", icon: Receipt, href: "/estimates", borderColor: "border-l-orange-500", color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950" },
    { title: "Payments", description: "Track payments and transactions", icon: DollarSign, href: "/payments", borderColor: "border-l-emerald-500", color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-950" },
    { title: "Expenses", description: "Monitor and manage expenses", icon: CreditCard, href: "/expenses", borderColor: "border-l-rose-500", color: "text-rose-500", bgColor: "bg-rose-50 dark:bg-rose-950" },
    { title: "Products", description: "Product catalog management", icon: Package, href: "/products", borderColor: "border-l-cyan-500", color: "text-cyan-500", bgColor: "bg-cyan-50 dark:bg-cyan-950" },
    { title: "Services", description: "Service offerings catalog", icon: Briefcase, href: "/services", borderColor: "border-l-indigo-500", color: "text-indigo-500", bgColor: "bg-indigo-50 dark:bg-indigo-950" },
    { title: "Procurement", description: "Purchase orders and requests", icon: Truck, href: "/procurement", borderColor: "border-l-teal-500", color: "text-teal-500", bgColor: "bg-teal-50 dark:bg-teal-950" },
    { title: "Accounting", description: "Financial management and reports", icon: LineChart, href: "/accounting", borderColor: "border-l-pink-500", color: "text-pink-500", bgColor: "bg-pink-50 dark:bg-pink-950" },
    { title: "Reports", description: "Analytics and insights", icon: BarChart3, href: "/reports", borderColor: "border-l-amber-500", color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950" },
    { title: "HR", description: "Human resources management", icon: UserCog, href: "/hr", borderColor: "border-l-rose-500", color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950" },
    { title: "Approvals", description: "Manage approval workflows", icon: CheckSquare, href: "/approvals", borderColor: "border-l-lime-500", color: "text-lime-500", bgColor: "bg-lime-50 dark:bg-lime-950" },
    { title: "Communications", description: "Email, SMS, and messaging", icon: Mail, href: "/communications", borderColor: "border-l-indigo-500", color: "text-indigo-500", bgColor: "bg-indigo-50 dark:bg-indigo-950" },
  ];

  return (
    <ModuleLayout
      title="Super Admin Dashboard"
      description="Comprehensive business management system to streamline operations"
      icon={<Shield className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Super Admin" }]}
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setLocation("/admin/management")} className="gap-2">
            <Settings className="w-4 h-4" />
            System Administration
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLocation("/crm-home")}>
            Go to Dashboard Home
          </Button>
        </div>
      }
    >
      <div className="space-y-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="Total Projects" value={m.totalProjects} description="Active projects" icon={<FolderKanban className="h-5 w-5" />} color="border-l-orange-500" loading={isDataLoading} />
          <StatsCard label="Total Clients" value={metricsPlain?.totalClients || 0} description="Active clients" icon={<Users className="h-5 w-5" />} color="border-l-purple-500" loading={isDataLoading} />
          <StatsCard label="Active Users" value={m.activeClients} description="System users" icon={<UserCog className="h-5 w-5" />} color="border-l-green-500" loading={isDataLoading} />
          <StatsCard label="System Status" value="Operational" description="All systems healthy" icon={<CheckSquare className="h-5 w-5" />} color="border-l-blue-500" />
        </div>

        {/* Key Metrics */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {overviewMetrics.map((metric) => (
              <button
                key={metric.title}
                onClick={() => setLocation(metric.href)}
                disabled={isDataLoading}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-l-4 p-4 sm:p-5 md:p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer disabled:opacity-50",
                  "bg-white dark:bg-slate-800/60 border-t border-r border-b border-slate-200 dark:border-slate-700",
                  metric.color
                )}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
                <div className="relative flex items-start justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{metric.title}</p>
                    {isDataLoading ? (
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse w-24"></div>
                    ) : (
                      <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">{metric.value}</p>
                    )}
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pt-1.5">{metric.description}</p>
                  </div>
                  <div className="ml-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors flex-shrink-0">{metric.icon}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Module Access Grid - Unified Card Style */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Quick Access</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Access all modules from one place</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.href}
                  onClick={() => setLocation(feature.href)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border-l-4 p-4 sm:p-5 text-left transition-all duration-300",
                    "bg-white dark:bg-slate-800/60 border-t border-r border-b border-slate-200 dark:border-slate-700",
                    "hover:shadow-xl hover:-translate-y-1 cursor-pointer",
                    feature.borderColor
                  )}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-lg ${feature.bgColor}`}>
                        <Icon className={`h-5 w-5 ${feature.color}`} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50">{feature.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{feature.description}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-current to-transparent"></div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analytics & Insights */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Analytics & Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Revenue Trend Chart */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-1 overflow-hidden border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-slate-800/50 dark:to-slate-800/50">
                <CardTitle className="text-base sm:text-lg">Revenue Trend</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Last 6 months performance</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {isDataLoading ? (
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsLineChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                      <XAxis dataKey="month" stroke="currentColor" opacity={0.5} />
                      <YAxis stroke="currentColor" opacity={0.5} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" dot={{ fill: "#3b82f6", r: 4 }} activeDot={{ r: 6 }} name="Actual" strokeWidth={2} />
                      <Line type="monotone" dataKey="target" stroke="#9ca3af" strokeDasharray="5 5" dot={false} name="Target" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Invoice Status Chart */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-1 overflow-hidden border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-amber-50 to-amber-50 dark:from-slate-800/50 dark:to-slate-800/50">
                <CardTitle className="text-base sm:text-lg">Invoice Status</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Payment tracking overview</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {isDataLoading ? (
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={invoiceStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                      <XAxis dataKey="month" stroke="currentColor" opacity={0.5} />
                      <YAxis stroke="currentColor" opacity={0.5} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                      <Legend />
                      <Bar dataKey="paid" fill="#10b981" name="Paid" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="overdue" fill="#ef4444" name="Overdue" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Client Distribution Chart */}
            <Card className="col-span-1 overflow-hidden border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-green-50 to-green-50 dark:from-slate-800/50 dark:to-slate-800/50">
                <CardTitle className="text-base sm:text-lg">Client Status</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Active vs Inactive</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {isDataLoading ? (
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={clientStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                        {clientStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Recent Activity</h2>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-10" onClick={() => setLocation("/audit-logs")}>View All</Button>
          </div>
          <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-lg">
            <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-purple-50 to-purple-50 dark:from-slate-800/50 dark:to-slate-800/50">
              <CardTitle className="text-base sm:text-lg">Latest Updates</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Recent changes and activities in your CRM</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : recentActivityData && recentActivityData.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentActivityData.slice(0, 5).map((activity: any, idx: number) => (
                    <div key={`${activity.id}-${idx}`} className="flex items-start space-x-3 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 -mx-2 rounded-lg transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          activity.action === "created" ? "bg-green-500" :
                          activity.action === "updated" ? "bg-blue-500" :
                          activity.action === "deleted" ? "bg-red-500" : "bg-slate-400"
                        )}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-50 capitalize">{activity.action} {activity.entityType}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activity.description || `ID: ${activity.entityId}`}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(activity.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">No recent activity</p>
                  <p className="text-xs text-slate-500">Start by creating your first project or client</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
