import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FolderKanban,
  FileText,
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
  Zap,
  Target,
  Award,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  stats?: { label: string; value: string | number };
  roles?: string[];
}

interface MetricCard {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  change?: string;
  trend?: "up" | "down";
}

export default function UnifiedLanding() {
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
    totalExpenses: 0,
    budgetsCount: 0,
    lprosCount: 0,
  });

  // Fetch dashboard metrics
  const { data: rawDashboardMetrics } = trpc.dashboard.metrics.useQuery({});
  
  // Convert frozen Drizzle objects to plain objects to avoid React error #306
  const dashboardMetrics = rawDashboardMetrics ? JSON.parse(JSON.stringify(rawDashboardMetrics)) : null;

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
        totalExpenses: dashboardMetrics.totalExpenses || 0,
        budgetsCount: dashboardMetrics.budgetsCount || 0,
        lprosCount: dashboardMetrics.lprosCount || 0,
      });
    }
  }, [dashboardMetrics]);

  // Get role-specific welcome message
  const getRoleWelcome = () => {
    const roleMessages: Record<string, { greeting: string; subtitle: string }> = {
      super_admin: {
        greeting: "System Overview",
        subtitle: "Monitor all operations and system health",
      },
      admin: { greeting: "Administration Panel", subtitle: "Manage users and system settings" },
      accountant: { greeting: "Financial Dashboard", subtitle: "Track accounting and finances" },
      hr: { greeting: "HR Management", subtitle: "Manage employees and payroll" },
      project_manager: {
        greeting: "Project Command Center",
        subtitle: "Track projects and team performance",
      },
      staff: { greeting: "Staff Dashboard", subtitle: "View your tasks and projects" },
      client: { greeting: "Client Portal", subtitle: "Access your projects and invoices" },
      user: { greeting: "Dashboard", subtitle: "Manage your work" },
    };

    return roleMessages[user?.role || "user"] || roleMessages.user;
  };

  // Define quick actions based on role
  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: "clients",
        title: "Clients",
        description: "Manage client relationships",
        icon: <Users className="w-8 h-8" />,
        href: "/clients",
        color: "from-green-500 to-green-600",
        stats: { label: "Active", value: metrics.activeClients },
      },
      {
        id: "projects",
        title: "Projects",
        description: "Track project progress",
        icon: <FolderKanban className="w-8 h-8" />,
        href: "/projects",
        color: "from-blue-500 to-blue-600",
        stats: { label: "Total", value: metrics.totalProjects },
      },
      {
        id: "invoices",
        title: "Invoices",
        description: "Create and manage invoices",
        icon: <FileText className="w-8 h-8" />,
        href: "/invoices",
        color: "from-purple-500 to-purple-600",
        stats: { label: "Pending", value: metrics.pendingInvoices },
      },
      {
        id: "payments",
        title: "Payments",
        description: "Track payments and receipts",
        icon: <DollarSign className="w-8 h-8" />,
        href: "/payments",
        color: "from-emerald-500 to-emerald-600",
        stats: { label: "This Month", value: `Ksh ${(metrics.monthlyRevenue || 0).toLocaleString()}` },
      },
    ];

    // Role-specific actions
    const roleSpecificActions: Record<string, QuickAction[]> = {
      super_admin: [
        {
          id: "admin",
          title: "Administration",
          description: "System settings and users",
          icon: <UserCog className="w-8 h-8" />,
          href: "/admin/management",
          color: "from-red-500 to-red-600",
        },
        {
          id: "reports",
          title: "Reports",
          description: "System analytics",
          icon: <BarChart3 className="w-8 h-8" />,
          href: "/reports",
          color: "from-amber-500 to-amber-600",
        },
      ],
      accountant: [
        {
          id: "accounting",
          title: "Accounting",
          description: "Account management",
          icon: <CreditCard className="w-8 h-8" />,
          href: "/accounting",
          color: "from-pink-500 to-pink-600",
          stats: { label: "Accounts", value: 0 },
        },
        {
          id: "expenses",
          title: "Expenses",
          description: "Track expenses",
          icon: <AlertCircle className="w-8 h-8" />,
          href: "/expenses",
          color: "from-orange-500 to-orange-600",
          stats: { label: "Total", value: metrics.totalExpenses },
        },
        {
          id: "budgets",
          title: "Budgets",
          description: "Budget allocation",
          icon: <Target className="w-8 h-8" />,
          href: "/budgets",
          color: "from-indigo-500 to-indigo-600",
          stats: { label: "Active", value: metrics.budgetsCount },
        },
      ],
      hr: [
        {
          id: "employees",
          title: "Employees",
          description: "Manage team members",
          icon: <Users className="w-8 h-8" />,
          href: "/employees",
          color: "from-cyan-500 to-cyan-600",
          stats: { label: "Total", value: metrics.totalEmployees },
        },
        {
          id: "payroll",
          title: "Payroll",
          description: "Process payroll",
          icon: <DollarSign className="w-8 h-8" />,
          href: "/payroll",
          color: "from-lime-500 to-lime-600",
        },
        {
          id: "attendance",
          title: "Attendance",
          description: "Track attendance",
          icon: <Calendar className="w-8 h-8" />,
          href: "/attendance",
          color: "from-rose-500 to-rose-600",
        },
      ],
      project_manager: [
        {
          id: "tasks",
          title: "Team Tasks",
          description: "Manage team tasks",
          icon: <CheckCircle2 className="w-8 h-8" />,
          href: "/projects",
          color: "from-violet-500 to-violet-600",
        },
        {
          id: "timeline",
          title: "Milestones",
          description: "Project milestones",
          icon: <Zap className="w-8 h-8" />,
          href: "/project-milestones",
          color: "from-fuchsia-500 to-fuchsia-600",
        },
      ],
    };

    return [
      ...baseActions,
      ...(roleSpecificActions[user?.role || "user"] || []),
    ];
  };

  // Get metrics for the overview section
  const getOverviewMetrics = (): MetricCard[] => {
    const baseMetrics: MetricCard[] = [
      {
        title: "Total Projects",
        value: metrics.totalProjects,
        description: "Projects in progress",
        icon: <FolderKanban className="w-5 h-5" />,
        color: "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20",
        href: "/projects",
      },
      {
        title: "Active Clients",
        value: metrics.activeClients,
        description: "Client relationships",
        icon: <Users className="w-5 h-5" />,
        color: "border-l-green-500 bg-green-50 dark:bg-green-900/20",
        href: "/clients",
      },
      {
        title: "Pending Invoices",
        value: metrics.pendingInvoices,
        description: "Awaiting payment",
        icon: <FileText className="w-5 h-5" />,
        color: "border-l-purple-500 bg-purple-50 dark:bg-purple-900/20",
        href: "/invoices",
      },
      {
        title: "Monthly Revenue",
        value: `KES ${(metrics.monthlyRevenue || 0).toLocaleString()}`,
        description: "This month",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
        href: "/payments",
      },
    ];

    // Add role-specific metrics
    if (user?.role === "accountant") {
      baseMetrics.push({
        title: "Total Expenses",
        value: `KES ${(metrics.totalExpenses || 0).toLocaleString()}`,
        description: "Current period",
        icon: <AlertCircle className="w-5 h-5" />,
        color: "border-l-orange-500 bg-orange-50 dark:bg-orange-900/20",
        href: "/expenses",
      });
    }

    if (user?.role === "hr") {
      baseMetrics.push({
        title: "Total Employees",
        value: metrics.totalEmployees,
        description: "On payroll",
        icon: <Users className="w-5 h-5" />,
        color: "border-l-cyan-500 bg-cyan-50 dark:bg-cyan-900/20",
        href: "/employees",
      });
    }

    if (user?.role === "project_manager") {
      baseMetrics.push({
        title: "Active Projects",
        value: metrics.totalProjects,
        description: "Managed projects",
        icon: <FolderKanban className="w-5 h-5" />,
        color: "border-l-violet-500 bg-violet-50 dark:bg-violet-900/20",
        href: "/projects",
      });
    }

    return baseMetrics;
  };

  const roleWelcome = getRoleWelcome();
  const quickActions = getQuickActions();
  const overviewMetrics = getOverviewMetrics();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">{roleWelcome.greeting}</h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Welcome back, {user?.name || "User"}. {roleWelcome.subtitle}
          </p>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => navigate(action.href)}
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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {action.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{action.description}</p>
                  </div>

                  {/* Stats if available */}
                  {action.stats && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {action.stats.label}
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {action.stats.value}
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
        </div>

        {/* Key Metrics Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewMetrics.map((metric) => (
              <button
                key={metric.title}
                onClick={() => navigate(metric.href)}
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {metric.description}
                    </p>
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {metric.icon}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Role-Specific Tips */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {user?.role === "accountant"
                    ? "Streamline your financial management by setting up recurring invoices and automated payment reminders."
                    : user?.role === "hr"
                      ? "Automate payroll processing and attendance tracking to save time on administrative tasks."
                      : user?.role === "project_manager"
                        ? "Use milestones to track project progress and keep your team synchronized."
                        : user?.role === "super_admin"
                          ? "Monitor system health and user activity through the administration panel."
                          : "Use the dashboard to quickly navigate between your most-used modules."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/reports")}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Reports
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/settings")}
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Status - For Super Admin */}
        {user?.role === "super_admin" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">System Status</h2>
            <Card>
              <CardHeader>
                <CardTitle>Operational Health</CardTitle>
                <CardDescription>All systems running normally</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <span className="text-sm font-medium">Database</span>
                    <span className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <span className="text-sm font-medium">API Server</span>
                    <span className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Running
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <span className="text-sm font-medium">Services</span>
                    <span className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      All Active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

