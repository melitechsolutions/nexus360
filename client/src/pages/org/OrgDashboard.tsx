import React from "react";
import { useParams, useLocation, Link } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import ModuleCard from "@/components/ModuleCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/pages/website/CurrencyContext";
import {
  DollarSign, FileText, Users, UserCheck, TrendingUp, Receipt,
  Clock, AlertCircle, ArrowRight, Plus, ChevronRight,
  BarChart3, ShoppingCart, Briefcase, Activity, FolderKanban,
  CreditCard, UserPlus, CheckCircle2, XCircle, Truck, Package,
  LineChart, Mail, Shield, Settings,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e",
  draft: "#94a3b8",
  sent: "#3b82f6",
  overdue: "#ef4444",
  partial: "#f59e0b",
  cancelled: "#6b7280",
  pending: "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
};

function KpiCard({
  label, value, sub, icon: Icon, colorClass, trend,
}: { label: string; value: string; sub?: string; icon: React.ElementType; colorClass: string; trend?: string }) {
  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {trend && <p className="text-xs text-green-500 mt-1 font-medium">{trend}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    paid: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    draft: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
    sent: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    overdue: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    partial: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    cancelled: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
    pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    approved: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    rejected: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorMap[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function formatCurrencyWithCode(n: number, code: string) {
  if (n >= 1_000_000) return `${code} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${code} ${(n / 1_000).toFixed(1)}K`;
  return `${code} ${n.toFixed(0)}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function OrgDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const currencyCode = currency.code;
  const formatCurrency = (n: number) => formatCurrencyWithCode(n, currencyCode);

  const { data: analytics, isLoading: analyticsLoading } = trpc.multiTenancy.getOrgAnalytics.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: orgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, {
    staleTime: 300_000,
  });

  if (!user) return null;

  if (!user?.organizationId) {
    return (
      <OrgLayout title="Access Denied" showOrgInfo={false}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have access to an organization. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </OrgLayout>
    );
  }

  const org = orgData?.organization;
  const featureMap = orgData?.featureMap ?? {};
  const kpis = analytics?.kpis;
  const monthlyTrend = analytics?.monthlyTrend ?? [];
  const invoiceStatusChart = analytics?.invoiceStatusChart ?? [];
  const recentInvoices = analytics?.recentInvoices ?? [];
  const recentExpenses = analytics?.recentExpenses ?? [];

  // Build activity feed from combined recent data
  const activityFeed = [
    ...recentInvoices.map((inv: any) => ({
      id: `inv-${inv.id}`,
      type: "invoice",
      icon: FileText,
      iconBg: "bg-blue-500/15 text-blue-500",
      title: `Invoice ${inv.invoiceNumber}`,
      sub: `${formatCurrency(inv.total || 0)} · ${inv.status}`,
      status: inv.status,
      date: inv.issueDate,
    })),
    ...recentExpenses.map((exp: any) => ({
      id: `exp-${exp.id}`,
      type: "expense",
      icon: Receipt,
      iconBg: "bg-orange-500/15 text-orange-500",
      title: exp.expenseNumber || exp.category,
      sub: `${formatCurrency(exp.amount || 0)} · ${exp.category}`,
      status: exp.status,
      date: exp.expenseDate,
    })),
  ]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 8);

  const today = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <OrgLayout
      title={org ? `${org.name} — Dashboard` : "Dashboard"}
      showOrgInfo={true}
    >
      <div className="space-y-6">

        {/* Welcome header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {getGreeting()}, {user?.name?.split(" ")[0] || "there"} 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs border-border">
              {org?.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : "Starter"} Plan
            </Badge>
            <Badge className={`text-xs ${org?.isActive ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/20" : "bg-red-500/15 text-red-600"} border`} variant="outline">
              {org?.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        {/* Quick Actions — top of page for easy access */}
        <div className="flex flex-wrap gap-2">
          {featureMap.invoicing !== false && (
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setLocation(`/org/${slug}/invoices`)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Invoice
            </Button>
          )}
          {featureMap.expenses !== false && (
            <Button size="sm" variant="outline" className="border-border" onClick={() => setLocation(`/org/${slug}/expenses`)}>
              <Receipt className="h-3.5 w-3.5 mr-1.5" /> Add Expense
            </Button>
          )}
          {featureMap.crm !== false && (
            <Button size="sm" variant="outline" className="border-border" onClick={() => setLocation(`/org/${slug}/crm`)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> New Client
            </Button>
          )}
          {featureMap.projects !== false && (
            <Button size="sm" variant="outline" className="border-border" onClick={() => setLocation(`/org/${slug}/projects`)}>
              <Briefcase className="h-3.5 w-3.5 mr-1.5" /> New Project
            </Button>
          )}
          {featureMap.reports !== false && (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setLocation(`/org/${slug}/reports`)}>
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Reports
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        {analyticsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Invoiced" value={formatCurrency(kpis?.totalInvoiced ?? 0)} sub={`${kpis?.totalInvoices ?? 0} invoices`} icon={FileText} colorClass="bg-blue-500/15 text-blue-500" />
            <KpiCard label="Revenue Collected" value={formatCurrency(kpis?.totalPaid ?? 0)} sub="payments received" icon={DollarSign} colorClass="bg-green-500/15 text-green-500" />
            <KpiCard label="Outstanding" value={formatCurrency(kpis?.totalOutstanding ?? 0)} sub="to be collected" icon={Clock} colorClass="bg-yellow-500/15 text-yellow-500" />
            <KpiCard label="Total Expenses" value={formatCurrency(kpis?.totalExpenses ?? 0)} sub={`${kpis?.pendingExpenses ?? 0} pending`} icon={Receipt} colorClass="bg-red-500/15 text-red-500" />
            <KpiCard label="Total Clients" value={String(kpis?.totalClients ?? 0)} sub={`${kpis?.activeClients ?? 0} active`} icon={Users} colorClass="bg-purple-500/15 text-purple-500" />
            <KpiCard label="Employees" value={String(kpis?.totalEmployees ?? 0)} sub={`${kpis?.activeEmployees ?? 0} active`} icon={UserCheck} colorClass="bg-indigo-500/15 text-indigo-500" />
            <KpiCard label="Payments Received" value={formatCurrency(kpis?.totalPaymentsReceived ?? 0)} sub="all time" icon={CreditCard} colorClass="bg-teal-500/15 text-teal-500" />
            <KpiCard label="Collection Rate" value={kpis?.totalInvoiced ? `${Math.round(((kpis?.totalPaid ?? 0) / kpis.totalInvoiced) * 100)}%` : "—"} sub="paid / invoiced" icon={TrendingUp} colorClass="bg-cyan-500/15 text-cyan-500" />
          </div>
        )}

        {/* Quick Access Module Grid */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Quick Access</h2>
            <p className="text-sm text-muted-foreground">Access all modules from one place</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featureMap.crm !== false && (
              <ModuleCard
                title="CRM"
                description="Manage clients & leads"
                icon={Users}
                onClick={() => setLocation(`/org/${slug}/crm`)}
              />
            )}
            {featureMap.projects !== false && (
              <ModuleCard
                title="Projects"
                description="Track your projects"
                icon={FolderKanban}
                onClick={() => setLocation(`/org/${slug}/projects`)}
              />
            )}
            {featureMap.invoicing !== false && (
              <ModuleCard
                title="Invoices"
                description="Create & manage invoices"
                icon={FileText}
                onClick={() => setLocation(`/org/${slug}/invoices`)}
              />
            )}
            {featureMap.payments !== false && (
              <ModuleCard
                title="Payments"
                description="Track transactions"
                icon={DollarSign}
                onClick={() => setLocation(`/org/${slug}/payments`)}
              />
            )}
            {featureMap.expenses !== false && (
              <ModuleCard
                title="Expenses"
                description="Monitor expenses"
                icon={CreditCard}
                onClick={() => setLocation(`/org/${slug}/expenses`)}
              />
            )}
            {featureMap.estimates !== false && (
              <ModuleCard
                title="Estimates"
                description="Generate quotes"
                icon={BarChart3}
                onClick={() => setLocation(`/org/${slug}/estimates`)}
              />
            )}
            {featureMap.hr !== false && (
              <ModuleCard
                title="HR"
                description="Manage your team"
                icon={Users}
                onClick={() => setLocation(`/org/${slug}/hr`)}
              />
            )}
            {featureMap.reports !== false && (
              <ModuleCard
                title="Reports"
                description="Analytics & insights"
                icon={LineChart}
                onClick={() => setLocation(`/org/${slug}/reports`)}
              />
            )}
          </div>
        </div>

        {/* Revenue Trend + Invoice Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-foreground">6-Month Revenue Trend</CardTitle>
                  <CardDescription>Invoiced vs Expenses per month</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setLocation(`/org/${slug}/reports`)}>
                  Full Report <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-52 rounded" />
              ) : monthlyTrend.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm">No trend data available yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`${currencyCode} ${value.toLocaleString()}`, ""]}
                    />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">Invoice Status</CardTitle>
              <CardDescription>Current distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <Skeleton className="h-52 rounded" />
              ) : invoiceStatusChart.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm">No invoices yet</p>
                  <Button size="sm" variant="outline" className="border-border mt-2" onClick={() => setLocation(`/org/${slug}/invoices`)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create Invoice
                  </Button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={invoiceStatusChart} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {invoiceStatusChart.map((entry: any, index: number) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.name?.toLowerCase()] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity + Recent Invoices/Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity Feed */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base text-foreground">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {analyticsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
                </div>
              ) : activityFeed.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Activity className="h-7 w-7 mx-auto mb-2 text-muted-foreground/40" />
                  No recent activity
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activityFeed.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.iconBg}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-foreground">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setLocation(`/org/${slug}/invoices`)}>
                View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentInvoices.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  <FileText className="h-7 w-7 mx-auto mb-2 text-muted-foreground/40" />
                  No invoices yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentInvoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <StatusBadge status={inv.status} />
                        <span className="text-sm font-semibold text-foreground hidden sm:inline">{formatCurrency(inv.total || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base text-foreground">Recent Expenses</CardTitle>
              <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setLocation(`/org/${slug}/expenses`)}>
                View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentExpenses.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  <Receipt className="h-7 w-7 mx-auto mb-2 text-muted-foreground/40" />
                  No expenses yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentExpenses.map((exp: any) => (
                    <div key={exp.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{exp.expenseNumber || exp.category}</p>
                        <p className="text-xs text-muted-foreground capitalize">{exp.category}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <StatusBadge status={exp.status} />
                        <span className="text-sm font-semibold text-foreground hidden sm:inline">{formatCurrency(exp.amount || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </OrgLayout>
  );
}
