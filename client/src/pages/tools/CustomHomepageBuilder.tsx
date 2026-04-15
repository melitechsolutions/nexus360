import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Layout,
  Save,
  RotateCcw,
  Eye,
  Plus,
  Minus,
  DollarSign,
  Users,
  FolderKanban,
  TrendingUp,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PieChart,
  LineChart,
  CreditCard,
  Wallet,
  Target,
  Award,
  Heart,
  Calendar,
  Bell,
  Mail,
  MessageSquare,
  FileText,
  Database,
  Settings,
  ZoomIn,
  TrendingDown,
  Zap,
  Activity,
  HardDrive,
  Network,
  Sparkles,
  Microscope,
  GraduationCap,
  Briefcase,
  Users2,
  Layers,
  Gauge,
  DollarSignIcon,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  GitmergeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "finance" | "hr" | "sales" | "operations" | "analytics";
  enabled: boolean;
  size: "small" | "medium" | "large";
  order: number;
}

const AVAILABLE_WIDGETS: Record<string, DashboardWidget> = {
  // Finance Widgets
  revenueMetrics: {
    id: "revenue",
    title: "Revenue Metrics",
    description: "Monthly revenue and income summary",
    icon: <DollarSign className="h-4 w-4" />,
    category: "finance",
    enabled: true,
    size: "medium",
    order: 1,
  },
  expenseTracker: {
    id: "expenses",
    title: "Expense Tracker",
    description: "Track business expenses and budgets",
    icon: <Wallet className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "medium",
    order: 2,
  },
  invoiceStatus: {
    id: "invoices",
    title: "Invoice Status",
    description: "Pending and overdue invoices",
    icon: <FileText className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "small",
    order: 3,
  },
  paymentMethods: {
    id: "payments",
    title: "Payment Methods",
    description: "Manage payment processing",
    icon: <CreditCard className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "small",
    order: 4,
  },
  financialSummary: {
    id: "financialSummary",
    title: "Financial Summary",
    description: "Complete financial overview",
    icon: <BarChart3 className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "large",
    order: 5,
  },
  budgetAllocation: {
    id: "budget",
    title: "Budget Allocation",
    description: "Department budget tracking",
    icon: <PieChart className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "large",
    order: 6,
  },
  
  // HR Widgets
  employeeOverview: {
    id: "employees",
    title: "Employee Overview",
    description: "Total employees and department breakdown",
    icon: <Users className="h-4 w-4" />,
    category: "hr",
    enabled: true,
    size: "medium",
    order: 7,
  },
  attendanceTracker: {
    id: "attendance",
    title: "Attendance Tracker",
    description: "Employee attendance and absences",
    icon: <Calendar className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "medium",
    order: 8,
  },
  leaveRequests: {
    id: "leaves",
    title: "Leave Requests",
    description: "Pending and approved leave requests",
    icon: <Heart className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "small",
    order: 9,
  },
  payrollSummary: {
    id: "payroll",
    title: "Payroll Summary",
    description: "Payroll processing and status",
    icon: <Wallet className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "medium",
    order: 10,
  },
  performanceReviews: {
    id: "reviews",
    title: "Performance Reviews",
    description: "Employee reviews and ratings",
    icon: <Award className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "medium",
    order: 11,
  },
  departmentStats: {
    id: "departments",
    title: "Department Statistics",
    description: "Department headcount and metrics",
    icon: <BarChart3 className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "medium",
    order: 12,
  },
  
  // Sales Widgets
  activeProjects: {
    id: "projects",
    title: "Active Projects",
    description: "Current projects and milestones",
    icon: <FolderKanban className="h-4 w-4" />,
    category: "sales",
    enabled: true,
    size: "medium",
    order: 13,
  },
  salesTrend: {
    id: "salesTrend",
    title: "Sales Trend",
    description: "Sales performance over time",
    icon: <TrendingUp className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "large",
    order: 14,
  },
  salesPipeline: {
    id: "pipeline",
    title: "Sales Pipeline",
    description: "Deal stages and conversion rates",
    icon: <LineChart className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "large",
    order: 15,
  },
  clientMetrics: {
    id: "clients",
    title: "Client Metrics",
    description: "Customer acquisition and retention",
    icon: <Users className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "medium",
    order: 16,
  },
  quoteTracker: {
    id: "quotes",
    title: "Quote Tracker",
    description: "Pending and accepted quotes",
    icon: <FileText className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "small",
    order: 17,
  },
  
  // Operations Widgets
  recentActivities: {
    id: "activities",
    title: "Recent Activities",
    description: "Latest system activities and events",
    icon: <Clock className="h-4 w-4" />,
    category: "operations",
    enabled: true,
    size: "medium",
    order: 18,
  },
  pendingApprovals: {
    id: "approvals",
    title: "Pending Approvals",
    description: "Documents awaiting approval",
    icon: <AlertCircle className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "small",
    order: 19,
  },
  completedTasks: {
    id: "tasks",
    title: "Completed Tasks",
    description: "Task completion summary",
    icon: <CheckCircle2 className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "small",
    order: 20,
  },
  inventorySummary: {
    id: "inventory",
    title: "Inventory Summary",
    description: "Stock levels and movements",
    icon: <Database className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "medium",
    order: 21,
  },
  notifications: {
    id: "notifications",
    title: "Notifications",
    description: "System alerts and notifications",
    icon: <Bell className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "small",
    order: 22,
  },
  communications: {
    id: "communications",
    title: "Communications",
    description: "Messages and bulk communications",
    icon: <Mail className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "medium",
    order: 23,
  },
  
  // Analytics Widgets
  performanceMetrics: {
    id: "performance",
    title: "Performance Metrics",
    description: "KPIs and performance indicators",
    icon: <TrendingUp className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "large",
    order: 24,
  },
  analyticsOverview: {
    id: "analytics",
    title: "Analytics Overview",
    description: "System usage and analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "large",
    order: 25,
  },
  reportScheduler: {
    id: "reports",
    title: "Report Scheduler",
    description: "Scheduled reports and exports",
    icon: <FileText className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "medium",
    order: 26,
  },
  dataInsights: {
    id: "insights",
    title: "Data Insights",
    description: "Key insights from data analysis",
    icon: <ZoomIn className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "medium",
    order: 27,
  },
  customDashboard: {
    id: "custom",
    title: "Custom Widgets",
    description: "Create and manage custom widgets",
    icon: <Settings className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "medium",
    order: 28,
  },
  
  // New Finance Widgets
  cashFlowAnalysis: {
    id: "cashflow",
    title: "Cash Flow Analysis",
    description: "Cash inflows and outflows tracking",
    icon: <ArrowUpRight className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "large",
    order: 29,
  },
  profitLossStatement: {
    id: "profitloss",
    title: "Profit & Loss Statement",
    description: "P&L overview and trends",
    icon: <TrendingUp className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "large",
    order: 30,
  },
  accountsReceivable: {
    id: "receivables",
    title: "Accounts Receivable",
    description: "Outstanding invoices aging",
    icon: <Clock className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "medium",
    order: 31,
  },
  vendorPayments: {
    id: "vendors",
    title: "Vendor Payments",
    description: "Supplier payment tracking",
    icon: <CreditCard className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "medium",
    order: 32,
  },
  taxCompliance: {
    id: "taxes",
    title: "Tax Compliance",
    description: "Tax status and filings",
    icon: <FileText className="h-4 w-4" />,
    category: "finance",
    enabled: false,
    size: "small",
    order: 33,
  },
  
  // New HR Widgets
  trainingDevelopment: {
    id: "training",
    title: "Training & Development",
    description: "Employee training programs",
    icon: <GraduationCap className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "medium",
    order: 34,
  },
  employeeBenefits: {
    id: "benefits",
    title: "Employee Benefits",
    description: "Benefits enrollment and claims",
    icon: <Heart className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "medium",
    order: 35,
  },
  recruitmentPipeline: {
    id: "recruitment",
    title: "Recruitment Pipeline",
    description: "Open positions and candidates",
    icon: <Briefcase className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "large",
    order: 36,
  },
  teamUtilization: {
    id: "utilization",
    title: "Team Utilization Rate",
    description: "Resource allocation and capacity",
    icon: <Gauge className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "medium",
    order: 37,
  },
  skillsGapAnalysis: {
    id: "skills",
    title: "Skills Gap Analysis",
    description: "Identify training needs",
    icon: <Target className="h-4 w-4" />,
    category: "hr",
    enabled: false,
    size: "medium",
    order: 38,
  },
  
  // New Sales Widgets
  customerLifetimeValue: {
    id: "ltv",
    title: "Customer Lifetime Value",
    description: "Customer profitability analysis",
    icon: <DollarSign className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "medium",
    order: 39,
  },
  conversionFunnel: {
    id: "funnel",
    title: "Conversion Funnel",
    description: "Sales funnel analysis",
    icon: <Layers className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "large",
    order: 40,
  },
  salesRepLeaderboard: {
    id: "leaderboard",
    title: "Sales Rep Leaderboard",
    description: "Top performing sales representatives",
    icon: <Award className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "medium",
    order: 41,
  },
  lostDealAnalysis: {
    id: "lost-deals",
    title: "Lost Deal Analysis",
    description: "Reasons and patterns for lost sales",
    icon: <TrendingDown className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "medium",
    order: 42,
  },
  territoryPerformance: {
    id: "territory",
    title: "Territory Performance",
    description: "Regional sales metrics",
    icon: <Target className="h-4 w-4" />,
    category: "sales",
    enabled: false,
    size: "medium",
    order: 43,
  },
  
  // New Operations Widgets
  systemHealthMonitor: {
    id: "health",
    title: "System Health Monitor",
    description: "Server and application health",
    icon: <Zap className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "small",
    order: 44,
  },
  documentWorkflow: {
    id: "workflow",
    title: "Document Workflow Status",
    description: "Document routing and status tracking",
    icon: <FileText className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "medium",
    order: 45,
  },
  userActivityLog: {
    id: "activity-log",
    title: "User Activity Log",
    description: "User actions and audit trail",
    icon: <Activity className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "small",
    order: 46,
  },
  backupRecovery: {
    id: "backup",
    title: "Backup & Recovery Status",
    description: "Data backup and restoration monitoring",
    icon: <HardDrive className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "small",
    order: 47,
  },
  integrationHealth: {
    id: "integrations",
    title: "Integration Health Check",
    description: "Third-party integrations status",
    icon: <Network className="h-4 w-4" />,
    category: "operations",
    enabled: false,
    size: "small",
    order: 48,
  },
  
  // New Analytics Widgets
  customReportBuilder: {
    id: "report-builder",
    title: "Custom Report Builder",
    description: "Build and schedule custom reports",
    icon: <FileText className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "large",
    order: 49,
  },
  predictiveAnalytics: {
    id: "predictive",
    title: "Predictive Analytics",
    description: "Forecasting and trend predictions",
    icon: <Sparkles className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "large",
    order: 50,
  },
  dataQualityScore: {
    id: "quality",
    title: "Data Quality Score",
    description: "Data integrity and quality metrics",
    icon: <Microscope className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "medium",
    order: 51,
  },
  exportScheduling: {
    id: "export",
    title: "Export & Scheduling",
    description: "Automated exports and scheduling",
    icon: <RefreshCw className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "small",
    order: 52,
  },
  realtimeDashboards: {
    id: "realtime",
    title: "Real-time Dashboards",
    description: "Live data updates and visualizations",
    icon: <Gauge className="h-4 w-4" />,
    category: "analytics",
    enabled: false,
    size: "large",
    order: 53,
  },
};

const CATEGORIES = [
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "hr", label: "HR & Team", icon: Users },
  { id: "sales", label: "Sales", icon: TrendingUp },
  { id: "operations", label: "Operations", icon: AlertCircle },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function CustomHomepageBuilder() {
  const [, navigate] = useLocation();
  const [widgets, setWidgets] = useState<Record<string, DashboardWidget>>(AVAILABLE_WIDGETS);
  const [selectedCategory, setSelectedCategory] = useState<string>("finance");
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load config from API
  const { data: configData, isLoading: isLoadingConfig } =
    trpc.customHomepage.getConfig.useQuery();

  const saveMutation = trpc.customHomepage.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Dashboard layout saved successfully!");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const resetMutation = trpc.customHomepage.resetToDefault.useMutation({
    onSuccess: (data) => {
      // Transform API response to widget record format
      const widgetRecord: Record<string, DashboardWidget> = {};
      data.config.widgets.forEach((w) => {
        widgetRecord[w.id] = {
          id: w.id,
          title: w.title,
          description: w.description,
          icon: getIconForCategory(w.category),
          category: w.category,
          enabled: w.enabled,
          size: w.size,
          order: w.order,
        };
      });
      setWidgets(widgetRecord);
      setHasChanges(false);
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Failed to reset: ${error.message}`);
    },
  });

  useEffect(() => {
    if (configData) {
      // Transform API response to widget record format
      const widgetRecord: Record<string, DashboardWidget> = {};
      configData.widgets.forEach((w) => {
        widgetRecord[w.id] = {
          id: w.id,
          title: w.title,
          description: w.description,
          icon: getIconForCategory(w.category),
          category: w.category,
          enabled: w.enabled,
          size: w.size,
          order: w.order,
        };
      });
      setWidgets(widgetRecord);
    }
    setIsLoading(false);
  }, [configData]);

  const getIconForCategory = (category: string) => {
    switch (category) {
      case "finance":
        return <DollarSign className="h-4 w-4" />;
      case "hr":
        return <Users className="h-4 w-4" />;
      case "sales":
        return <TrendingUp className="h-4 w-4" />;
      case "operations":
        return <AlertCircle className="h-4 w-4" />;
      case "analytics":
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const handleToggleWidget = (widgetId: string) => {
    setWidgets((prev) => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        enabled: !prev[widgetId].enabled,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const widgetsArray = Object.values(widgets).map((w) => ({
      id: w.id,
      title: w.title,
      description: w.description,
      category: w.category,
      enabled: w.enabled,
      size: w.size,
      order: w.order,
    }));
    saveMutation.mutate({ widgets: widgetsArray });
  };

  const handleReset = () => {
    if (confirm("Reset to default dashboard layout?")) {
      resetMutation.mutate();
    }
  };

  if (isLoading || isLoadingConfig) {
    return (
      <ModuleLayout
        title="Homepage Builder"
        description="Customize your dashboard homepage with widgets and cards"
        icon={<Layout className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Settings", href: "/settings" },
          { label: "Homepage Builder" },
        ]}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  const enabledCount = Object.values(widgets).filter((w) => w.enabled).length;
  const categoryWidgets = Object.values(widgets).filter(
    (w) => w.category === selectedCategory
  );

  return (
    <ModuleLayout
      title="Homepage Builder"
      description="Customize your dashboard homepage with widgets and cards"
      icon={<Layout className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Settings", href: "/settings" },
        { label: "Homepage Builder" },
      ]}
    >
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Customize Your Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select which widgets you want to see on your homepage. You can preview
              changes and reorder them.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Widget Stats */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Enabled Widgets</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {enabledCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Available</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {Object.keys(widgets).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unsaved Changes</p>
                <p
                  className={`text-3xl font-bold ${
                    hasChanges
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {hasChanges ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Widget Selection
            </CardTitle>
            <CardDescription>
              Choose which widgets to display on your homepage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const catWidgets = Object.values(widgets).filter(
                    (w) => w.category === cat.id
                  );
                  const enabledInCat = catWidgets.filter((w) => w.enabled).length;
                  return (
                    <TabsTrigger key={cat.id} value={cat.id} className="relative">
                      <div className="flex items-center gap-1">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs">{cat.label}</span>
                      </div>
                      {enabledInCat > 0 && (
                        <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {enabledInCat}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {CATEGORIES.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="space-y-3">
                  {categoryWidgets.map((widget) => (
                    <div
                      key={widget.id}
                      className={cn(
                        "flex items-start gap-4 p-4 border rounded-lg transition-all",
                        widget.enabled
                          ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                          : "bg-muted/50 border-muted"
                      )}
                    >
                      <Checkbox
                        id={widget.id}
                        checked={widget.enabled}
                        onCheckedChange={() => handleToggleWidget(widget.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={widget.id}
                          className="cursor-pointer flex items-center gap-2"
                        >
                          {widget.icon}
                          <span className="font-medium">{widget.title}</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {widget.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {widget.size.charAt(0).toUpperCase() + widget.size.slice(1)}{" "}
                            widget
                          </span>
                          {widget.enabled && (
                            <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded">
                              ✓ Enabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {categoryWidgets.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No widgets in this category</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </CardTitle>
            <CardDescription>
              Here's how your dashboard will look with the selected widgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full pr-4">
              <div className="space-y-3">
                {Object.values(widgets)
                  .filter((w) => w.enabled)
                  .sort((a, b) => a.order - b.order)
                  .map((widget) => (
                    <div
                      key={widget.id}
                      className={cn(
                        "p-4 border rounded-lg bg-card",
                        widget.size === "large"
                          ? "col-span-2"
                          : widget.size === "medium"
                          ? "col-span-1"
                          : "col-span-1"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {widget.icon}
                        <h3 className="font-medium">{widget.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {widget.description}
                      </p>
                    </div>
                  ))}

                {enabledCount === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No widgets selected. Select widgets above to preview.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Save Notice */}
        {hasChanges && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <p className="text-sm text-orange-900 dark:text-orange-100">
                  You have unsaved changes. Click "Save Changes" to apply your customizations.
                </p>
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
