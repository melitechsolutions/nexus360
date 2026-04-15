import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import {
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  Clock,
  Receipt,
  FileSpreadsheet,
  CreditCard,
  AlertCircle,
  Target,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCurrencySettings } from "@/lib/currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [chartYear, setChartYear] = useState(new Date().getFullYear());

  const { data: statsData, isLoading: isStatsLoading } = trpc.dashboard.stats.useQuery(undefined, { retry: 1, staleTime: 30000 });
  const { data: metricsData, isLoading: isMetricsLoading } = trpc.dashboard.metrics.useQuery(undefined, { retry: 1, staleTime: 30000 });
  const { data: recentProjects = [], isLoading: isProjectsLoading } = trpc.projects.list.useQuery({ limit: 3 }, { retry: 1, staleTime: 30000 });
  const { data: recentActivity = [], isLoading: isActivityLoading } = trpc.dashboard.recentActivity.useQuery({ limit: 5 }, { retry: 1, staleTime: 30000 });
  const { data: chartData } = trpc.dashboard.monthlyChart.useQuery({ year: chartYear }, { retry: 1, staleTime: 60000 });
  const { data: financialSummary } = trpc.dashboard.financialSummary.useQuery(undefined, { retry: 1, staleTime: 30000 });
  const { data: leadsData = [] } = trpc.opportunities.list.useQuery({}, { retry: 1, staleTime: 30000 });

  const statsDataPlain = statsData ? JSON.parse(JSON.stringify(statsData)) : null;
  const metricsDataPlain = metricsData ? JSON.parse(JSON.stringify(metricsData)) : null;
  const recentProjectsPlain = recentProjects ? JSON.parse(JSON.stringify(recentProjects)) : [];
  const recentActivityPlain = recentActivity ? JSON.parse(JSON.stringify(recentActivity)) : [];
  // Also unwrap remaining queries to prevent React error #306 from frozen/proxy objects
  const chartDataPlain = chartData ? JSON.parse(JSON.stringify(chartData)) : null;
  const financialSummaryPlain = financialSummary ? JSON.parse(JSON.stringify(financialSummary)) : null;
  const leadsDataPlain = leadsData ? JSON.parse(JSON.stringify(leadsData)) : [];

  const { code: currencyCode } = useCurrencySettings();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: currencyCode }).format(amount / 100);
  };

  const formatCurrencyShort = (amount: number) => {
    const val = amount / 100;
    if (val >= 1_000_000) return `${currencyCode} ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${currencyCode} ${(val / 1_000).toFixed(0)}K`;
    return `${currencyCode} ${val.toFixed(0)}`;
  };

  // Financial summary cards (crm.africa style)
  const financialCards = [
    {
      label: "Payments - Today",
      value: formatCurrencyShort(financialSummaryPlain?.paymentsToday || 0),
      icon: CreditCard,
      color: "border-b-4 border-cyan-500",
      href: "/payments",
    },
    {
      label: "Payments - Month",
      value: formatCurrencyShort(financialSummaryPlain?.paymentsMonth || 0),
      icon: DollarSign,
      color: "border-b-4 border-blue-500",
      href: "/payments",
    },
    {
      label: "Invoices - Due",
      value: formatCurrencyShort(financialSummaryPlain?.invoicesDue || 0),
      icon: FileText,
      color: "border-b-4 border-orange-400",
      href: "/invoices",
    },
    {
      label: "Invoices - Overdue",
      value: formatCurrencyShort(financialSummaryPlain?.invoicesOverdue || 0),
      icon: AlertCircle,
      color: "border-b-4 border-red-500",
      href: "/invoices",
    },
  ];

  // Chart data: scale down from cents
  const monthlyChartData = useMemo(() => {
    if (!chartDataPlain?.months?.length) return [];
    return chartDataPlain.months.map((m: any) => ({
      name: m.name,
      Income: Math.round((m.income || 0) / 100),
      Expense: Math.round((m.expense || 0) / 100),
    }));
  }, [chartDataPlain]);

  // Leads pipeline pie chart
  const LEAD_STAGES: Record<string, { label: string; color: string }> = {
    lead: { label: "New", color: "#94a3b8" },
    qualified: { label: "Qualified", color: "#3b82f6" },
    proposal: { label: "Proposal", color: "#8b5cf6" },
    negotiation: { label: "Negotiation", color: "#f59e0b" },
    closed_won: { label: "Won", color: "#22c55e" },
    closed_lost: { label: "Lost", color: "#ef4444" },
  };

  const leadsPipelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    const leadsArr = Array.isArray(leadsDataPlain) ? leadsDataPlain : (leadsDataPlain as any)?.items || [];
    leadsArr.forEach((lead: any) => {
      const stage = lead.stage || "lead";
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return Object.entries(LEAD_STAGES)
      .map(([key, cfg]) => ({ name: cfg.label, value: counts[key] || 0, color: cfg.color }))
      .filter(d => d.value > 0);
  }, [leadsDataPlain]);

  const totalLeads = leadsPipelineData.reduce((s, d) => s + d.value, 0);

  const stats = useMemo(() => [
    {
      title: "Total Revenue",
      value: statsDataPlain ? formatCurrency(statsDataPlain.totalRevenue || 0) : "KES 0",
      change: statsDataPlain?.revenueGrowth ? `${statsDataPlain.revenueGrowth > 0 ? "+" : ""}${statsDataPlain.revenueGrowth}%` : "0%",
      trend: (statsDataPlain?.revenueGrowth || 0) >= 0 ? "up" : "down",
      icon: DollarSign,
      description: "This month",
      href: "/accounting",
    },
    {
      title: "Active Projects",
      value: statsDataPlain?.activeProjects?.toString() || "0",
      change: statsDataPlain?.newProjects ? `+${statsDataPlain.newProjects}` : "0",
      trend: "up" as const,
      icon: FolderKanban,
      description: "In progress",
      href: "/projects",
    },
    {
      title: "Total Clients",
      value: statsDataPlain?.totalClients?.toString() || "0",
      change: statsDataPlain?.newClients ? `+${statsDataPlain.newClients}` : "0",
      trend: "up" as const,
      icon: Users,
      description: "Active clients",
      href: "/clients",
    },
    {
      title: "Pending Invoices",
      value: metricsDataPlain?.pendingInvoices?.toString() || "0",
      change: "0",
      trend: "neutral" as const,
      icon: FileText,
      description: "Awaiting payment",
      href: "/invoices",
    },
  ], [statsDataPlain, metricsDataPlain]);

  const getActivityIcon = (entityType: string) => {
    switch (entityType) {
      case "project": return FolderKanban;
      case "client": return Users;
      case "invoice": return FileText;
      case "payment": return DollarSign;
      default: return Clock;
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening with your business.
            </p>
          </div>
          <Button onClick={() => navigate("/projects/create")}>
            <FolderKanban className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {financialCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className={`${card.color} cursor-pointer hover:shadow-lg transition-shadow`} onClick={() => navigate(card.href)}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                    <Icon className="h-8 w-8 text-muted-foreground opacity-40" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate(stat.href)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`flex items-center ${
                      stat.trend === "up" ? "text-green-500" :
                      stat.trend === "down" ? "text-red-500" :
                      ""
                    }`}>
                      {stat.trend === "up" && <TrendingUp className="mr-1 h-3 w-3" />}
                      {stat.trend === "down" && <TrendingDown className="mr-1 h-3 w-3" />}
                      {stat.change}
                    </span>
                    <span>{stat.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row: Income vs Expenses + Leads Pipeline */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Income vs Expenses Bar Chart */}
          <Card className="md:col-span-2 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/accounting")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Income vs Expenses</CardTitle>
                  <CardDescription>Monthly financial performance</CardDescription>
                </div>
                <Select value={String(chartYear)} onValueChange={(v) => setChartYear(Number(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                  No financial data for {chartYear}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${currencyCode} ${value.toLocaleString()}`,
                        name,
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Leads Pipeline Donut Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Leads Pipeline</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/leads")}>
                  View All
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <CardDescription>
                {totalLeads} lead{totalLeads !== 1 ? "s" : ""} by stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leadsPipelineData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground">
                  <Target className="h-10 w-10 mb-2 opacity-25" />
                  <p className="text-sm">No leads yet</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => navigate("/leads")}
                  >
                    Add your first lead
                  </Button>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={leadsPipelineData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {leadsPipelineData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, n: string) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {leadsPipelineData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          <span>{d.name}</span>
                        </div>
                        <span className="font-medium">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>Your active and upcoming projects</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProjectsPlain.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No projects found</p>
                ) : (
                  recentProjectsPlain.map((project: any) => (
                    <div key={project.id} className="space-y-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors" onClick={() => navigate(`/projects/${project.id}`)}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">{project.projectNumber}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {project.endDate ? new Date(project.endDate).toLocaleDateString() : "No date"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{project.progress || 0}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivityPlain.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  recentActivityPlain.map((activity: any, index: number) => {
                    const Icon = getActivityIcon(activity.entityType || "");
                    return (
                      <div key={activity.id || index} className="flex gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{(activity.action || '').replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">{(activity.description || '')}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : "recently"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-6">
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/clients/create")}>
                <Users className="h-6 w-6" />
                <span className="text-xs text-center">Add Client</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/projects/create")}>
                <FolderKanban className="h-6 w-6" />
                <span className="text-xs text-center">New Project</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/invoices/create")}>
                <FileText className="h-6 w-6" />
                <span className="text-xs text-center">Create Invoice</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/estimates/create")}>
                <FileSpreadsheet className="h-6 w-6" />
                <span className="text-xs text-center">New Estimate</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/receipts/create")}>
                <Receipt className="h-6 w-6" />
                <span className="text-xs text-center">New Receipt</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/leads")}>
                <Target className="h-6 w-6" />
                <span className="text-xs text-center">Add Lead</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
