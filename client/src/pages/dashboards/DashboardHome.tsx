import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIAssistantModal } from "@/components/AIAssistantModal";

/**
 * DashboardHome - Unified Role-Based Dashboard
 * 
 * This is the main dashboard for all users in the CRM system.
 * Content is filtered based on user role:
 * - super_admin & admin: See all features
 * - accountant: See accounting/payments features
 * - hr: See HR/employee features
 * - All others: See general business features
 * 
 * Routes accessing this component:
 * - /crm (primary unified dashboard)
 * - /dashboards/dashboardhome (direct dashboard path)
 * - /dashboard-home (legacy compatibility)
 */
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
  Loader2,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface QuickActionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  stats?: {
    label: string;
    value: string | number;
  };
  roles?: string[]; // Optional: if not specified, visible to all users
}

export default function DashboardHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // Comprehensive tRPC queries for all dashboard sections
  const { 
    data: dashboardMetrics, 
    isLoading: metricsLoading 
  } = trpc.dashboard.metrics.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });

  const { 
    data: dashboardStats, 
    isLoading: statsLoading 
  } = trpc.dashboard.stats.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });

  const { 
    data: recentActivityData, 
    isLoading: activityLoading 
  } = trpc.dashboard.recentActivity.useQuery({ limit: 5 }, {
    retry: 2,
    retryDelay: 1000,
  });

  const { 
    data: accountingMetrics, 
    isLoading: accountingLoading 
  } = trpc.dashboard.accountingMetrics.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });

  const {
    data: monthlyChartData,
  } = trpc.dashboard.monthlyChart.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });

  // Combined loading state
  const isLoading = metricsLoading || statsLoading || activityLoading || accountingLoading;

  // Normalize metrics with type safety
  const metrics = {
    totalProjects: Number(dashboardMetrics?.totalProjects) || 0,
    activeClients: Number(dashboardMetrics?.activeClients) || 0,
    pendingInvoices: Number(dashboardMetrics?.pendingInvoices) || 0,
    monthlyRevenue: Number(dashboardMetrics?.monthlyRevenue) || 0,
    totalProducts: Number(dashboardMetrics?.totalProducts) || 0,
    totalServices: Number(dashboardMetrics?.totalServices) || 0,
    totalEmployees: Number(dashboardMetrics?.totalEmployees) || 0,
  };

  const stats = {
    totalRevenue: Number(dashboardStats?.totalRevenue) || 0,
    revenueGrowth: Number(dashboardStats?.revenueGrowth) || 0,
    activeProjects: Number(dashboardStats?.activeProjects) || 0,
    newProjects: Number(dashboardStats?.newProjects) || 0,
    totalClients: Number(dashboardStats?.totalClients) || 0,
    newClients: Number(dashboardStats?.newClients) || 0,
  };

  // Chart data from real backend
  const monthlyRevenueData = (monthlyChartData?.months ?? []).map((m: any) => ({
    month: m.name,
    revenue: m.income ?? 0,
    target: m.expense ?? 0,
  }));

  const clientStatusData = [
    { name: "Active", value: metrics.activeClients, color: "#10b981" },
    { name: "Total Projects", value: metrics.totalProjects, color: "#6b7280" },
  ];

  const invoiceStatusData = (monthlyChartData?.months ?? []).map((m: any) => ({
    month: m.name,
    income: m.income ?? 0,
    expense: m.expense ?? 0,
  }));

  const handleCardClick = (href: string, actionId?: string) => {
    if (actionId === "ai-assistant") {
      setAiAssistantOpen(true);
      return;
    }
    if (href && href !== "#") {
      navigate(href);
    }
  };

  // Define quick actions with dynamic metrics
  const quickActions: QuickActionCard[] = [
    {
      id: "ai-assistant",
      title: "AI Assistant",
      description: "Get instant help and insights",
      icon: <span className="text-lg">✨</span>,
      href: "#", // Don't navigate, this opens the modal
      color: "from-violet-500 to-violet-600",
      stats: { label: "Smart", value: "24/7" },
    },
    {
      id: "projects",
      title: "Projects",
      description: "Manage and track all your projects",
      icon: <FolderKanban className="w-8 h-8" />,
      href: "/projects",
      color: "from-blue-500 to-blue-600",
      stats: { label: "Total Projects", value: metrics.totalProjects },
    },
    {
      id: "clients",
      title: "Clients",
      description: "Client relationship management",
      icon: <Users className="w-8 h-8" />,
      href: "/clients",
      color: "from-green-500 to-green-600",
      stats: { label: "Active Clients", value: metrics.activeClients },
    },
    {
      id: "invoices",
      title: "Invoices",
      description: "Create and manage invoices",
      icon: <FileText className="w-8 h-8" />,
      href: "/invoices",
      color: "from-purple-500 to-purple-600",
      stats: { label: "Pending Invoices", value: metrics.pendingInvoices },
    },
    {
      id: "estimates",
      title: "Estimates",
      description: "Generate quotations and estimates",
      icon: <Receipt className="w-8 h-8" />,
      href: "/estimates",
      color: "from-orange-500 to-orange-600",
      stats: { label: "Pending Estimates", value: 0 },
    },
    {
      id: "payments",
      title: "Payments",
      description: "Track payments and transactions",
      icon: <DollarSign className="w-8 h-8" />,
      href: "/payments",
      color: "from-green-500 to-emerald-600",
      stats: { label: "This Month", value: `KES ${metrics.monthlyRevenue.toLocaleString()}` },
      roles: ["super_admin", "admin", "accountant"] // Primary access for accountants
    },
    {
      id: "products",
      title: "Products",
      description: "Product catalog management",
      icon: <Package className="w-8 h-8" />,
      href: "/products",
      color: "from-cyan-500 to-cyan-600",
      stats: { label: "Total Products", value: metrics.totalProducts },
    },
    {
      id: "services",
      title: "Services",
      description: "Service offerings catalog",
      icon: <Briefcase className="w-8 h-8" />,
      href: "/services",
      color: "from-indigo-500 to-indigo-600",
      stats: { label: "Total Services", value: metrics.totalServices },
    },
    {
      id: "accounting",
      title: "Accounting",
      description: "Financial management and reports",
      icon: <CreditCard className="w-8 h-8" />,
      href: "/accounting",
      color: "from-pink-500 to-pink-600",
      stats: { label: "Accounts", value: accountingMetrics?.totalInvoices || 0 },
      roles: ["super_admin", "admin", "accountant"] // For accounting team
    },
    {
      id: "reports",
      title: "Reports",
      description: "Analytics and insights",
      icon: <BarChart3 className="w-8 h-8" />,
      href: "/reports",
      color: "from-amber-500 to-amber-600",
      stats: { label: "Reports", value: 0 },
    },
    {
      id: "hr",
      title: "HR",
      description: "Human resources management",
      icon: <UserCog className="w-8 h-8" />,
      href: "/hr",
      color: "from-red-500 to-red-600",
      stats: { label: "Employees", value: metrics.totalEmployees },
      roles: ["super_admin", "admin", "hr"] // Primary access for HR
    },
  ];

  // Filter quick actions based on user role
  const filteredQuickActions = quickActions.filter(action => {
    // Show to super_admin and admin always
    if (user?.role === "super_admin" || user?.role === "admin") return true;
    // If action has no role restriction, show to everyone
    if (!action.roles) return true;
    // Otherwise, only show if user role matches
    return action.roles.includes(user?.role || "");
  });

  const overviewMetrics = [
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
      title: "Revenue",
      value: `KES ${metrics.monthlyRevenue.toLocaleString()}`,
      description: "This month",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "border-l-green-500 bg-green-50 dark:bg-green-900/20 dark:border-l-green-400",
      href: "/accounting",
    },
  ];

  return (
    <ModuleLayout
      title="Dashboard"
      description="Track your performance, manage operations, and grow your business"
      icon={<LayoutDashboard className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <div className="space-y-6 md:space-y-8 pb-8">

        {/* Featured Quick Actions - Changed to 5 items horizontal scroll on mobile */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Quick Access</h2>
            {isLoading && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-slate-400" />}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {filteredQuickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleCardClick(action.href, action.id)}
                disabled={isLoading}
                className="group relative overflow-hidden rounded-xl border transition-all duration-300 bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 p-3 sm:p-4 md:p-5 text-left hover:shadow-xl hover:-translate-y-1.5 dark:hover:border-slate-600 hover:border-slate-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
              >
                {/* Background gradient on hover */}
                <div
                  className={cn(
                    "absolute inset-0 opacity-0 transition-opacity group-hover:opacity-15 duration-300",
                    `bg-gradient-to-br ${action.color}`
                  )}
                />

                {/* Content */}
                <div className="relative space-y-2.5 sm:space-y-3">
                  {/* Icon with enhanced gradient background */}
                  <div
                    className={cn(
                      "inline-flex p-2.5 sm:p-3 rounded-lg text-white shadow-lg",
                      `bg-gradient-to-br ${action.color}`
                    )}
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7">{action.icon}</div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-900 dark:text-slate-50 text-xs sm:text-sm md:text-base leading-tight">
                    {action.title}
                  </h3>

                  {/* Stats if available */}
                  {action.stats && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 hidden sm:block">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                        {action.stats.label}
                      </p>
                      <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {typeof action.stats.value === "number" ? action.stats.value.toString() : action.stats.value}
                      </p>
                    </div>
                  )}
                </div>

                {/* Arrow Icon */}
                <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors duration-300 opacity-0 group-hover:opacity-100">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-current to-transparent"></div>
              </button>
            ))}
          </div>
        </div>

        {/* Getting Started Tips Section */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Getting Started</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-slate-800/50 dark:to-slate-800/50">
                <CardTitle className="text-sm sm:text-base md:text-lg text-slate-900 dark:text-slate-50 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Add Your First Client</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Start building your client database by adding new clients to your CRM system.
                </p>
                <Button
                  onClick={() => handleCardClick("/clients")}
                  className="w-full text-xs sm:text-sm h-8 sm:h-10 bg-blue-600 hover:bg-blue-700 group-hover:shadow-lg transition-all"
                  size="sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Add Client
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-purple-50 to-purple-50 dark:from-slate-800/50 dark:to-slate-800/50">
                <CardTitle className="text-sm sm:text-base md:text-lg text-slate-900 dark:text-slate-50 flex items-center space-x-2">
                  <FolderKanban className="w-4 h-4 text-purple-600" />
                  <span>Create Your First Project</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Organize your work by creating projects and assigning tasks to your team members.
                </p>
                <Button
                  onClick={() => handleCardClick("/projects/create")}
                  className="w-full text-xs sm:text-sm h-8 sm:h-10 bg-purple-600 hover:bg-purple-700 group-hover:shadow-lg transition-all"
                  size="sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  New Project
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-green-50 to-green-50 dark:from-slate-800/50 dark:to-slate-800/50">
                <CardTitle className="text-sm sm:text-base md:text-lg text-slate-900 dark:text-slate-50 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span>Generate Your First Invoice</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Create professional invoices and track payments from your clients efficiently.
                </p>
                <Button
                  onClick={() => handleCardClick("/invoices")}
                  className="w-full text-xs sm:text-sm h-8 sm:h-10 bg-green-600 hover:bg-green-700 group-hover:shadow-lg transition-all"
                  size="sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  New Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Assistant Modal */}
      <AIAssistantModal 
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        context="Dashboard"
      />
    </ModuleLayout>
  );
}

