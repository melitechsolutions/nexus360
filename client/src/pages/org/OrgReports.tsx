import React from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BarChart3, ArrowLeft, TrendingUp, TrendingDown, DollarSign, FileText, Users, Receipt, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e",
  draft: "#94a3b8",
  sent: "#3b82f6",
  overdue: "#ef4444",
  partial: "#f59e0b",
  cancelled: "#6b7280",
};

const DEPT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function KpiCard({ label, value, sub, change, icon: Icon, color }: {
  label: string; value: string; sub?: string; change?: number; icon: React.ElementType; color: string;
}) {
  return (
    <Card className={`bg-gradient-to-br ${color} border-white/10`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-white/70">{label}</CardTitle>
        <Icon className="h-4 w-4 text-white/40" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-white/50 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${n.toFixed(0)}`;
}

export default function OrgReports() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();

  const { data: orgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, {
    staleTime: 300_000,
  });

  const featureMap = orgData?.featureMap ?? {};
  const hasAccess = !orgData || featureMap.reports;

  const { data: analytics, isLoading } = trpc.multiTenancy.getOrgAnalytics.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!hasAccess,
  });

  const kpis = analytics?.kpis;
  const monthlyTrend = analytics?.monthlyTrend ?? [];
  const invoiceStatusChart = analytics?.invoiceStatusChart ?? [];
  const expenseCategoryChart = analytics?.expenseCategoryChart ?? [];
  const employeeDeptChart = analytics?.employeeDeptChart ?? [];

  // Net income per month
  const netIncomeChart = monthlyTrend.map((m: any) => ({
    month: m.month,
    net: m.revenue - m.expenses,
    revenue: m.revenue,
    expenses: m.expenses,
  }));

  return (
    <OrgLayout title="Reports & Analytics" showOrgInfo={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Reports & Analytics" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        {!hasAccess && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-20 text-center">
              <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
              <p className="text-white/50 text-sm mb-6">Reports are not enabled for your organization plan.</p>
              <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation(`/org/${slug}/dashboard`)}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        )}
        {hasAccess && (<>

        {/* Header KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 bg-white/5 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={formatCurrency(kpis?.totalPaid ?? 0)} sub="collected payments" icon={DollarSign} color="from-green-600/20 to-green-600/5" />
            <KpiCard label="Total Invoiced" value={formatCurrency(kpis?.totalInvoiced ?? 0)} sub={`${kpis?.totalInvoices ?? 0} invoices`} icon={FileText} color="from-blue-600/20 to-blue-600/5" />
            <KpiCard label="Total Expenses" value={formatCurrency(kpis?.totalExpenses ?? 0)} sub="all categories" icon={Receipt} color="from-red-600/20 to-red-600/5" />
            <KpiCard
              label="Net Position"
              value={formatCurrency((kpis?.totalPaid ?? 0) - (kpis?.totalExpenses ?? 0))}
              sub="revenue minus expenses"
              icon={(kpis?.totalPaid ?? 0) > (kpis?.totalExpenses ?? 0) ? TrendingUp : TrendingDown}
              color={(kpis?.totalPaid ?? 0) > (kpis?.totalExpenses ?? 0) ? "from-teal-600/20 to-teal-600/5" : "from-orange-600/20 to-orange-600/5"}
            />
            <KpiCard label="Outstanding" value={formatCurrency(kpis?.totalOutstanding ?? 0)} sub="uncollected receivables" icon={DollarSign} color="from-yellow-600/20 to-yellow-600/5" />
            <KpiCard label="Active Clients" value={String(kpis?.activeClients ?? 0)} sub={`of ${kpis?.totalClients ?? 0} total`} icon={Users} color="from-purple-600/20 to-purple-600/5" />
            <KpiCard label="Active Employees" value={String(kpis?.activeEmployees ?? 0)} sub={`of ${kpis?.totalEmployees ?? 0} total`} icon={Users} color="from-indigo-600/20 to-indigo-600/5" />
            <KpiCard label="Pending Expenses" value={String(kpis?.pendingExpenses ?? 0)} sub="awaiting approval" icon={Receipt} color="from-orange-600/20 to-orange-600/5" />
          </div>
        )}

        {/* 6-Month Trend */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">6-Month Financial Trend</CardTitle>
            <CardDescription className="text-white/50">Revenue vs Expenses — monthly comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 bg-white/5" />
            ) : monthlyTrend.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-white/30 text-sm">No trend data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`KES ${value.toLocaleString()}`, ""]} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#expGrad2)" strokeWidth={2} />
                  <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Net Income Bar Chart */}
        {netIncomeChart.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Monthly Net Income</CardTitle>
              <CardDescription className="text-white/50">Revenue minus Expenses per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={netIncomeChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`KES ${value.toLocaleString()}`, "Net Income"]} />
                  <Bar dataKey="net" fill="#22c55e" radius={[4, 4, 0, 0]}>
                    {netIncomeChart.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.net >= 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Three-column charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Invoice Status */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Invoice Status</CardTitle>
            </CardHeader>
            <CardContent>
              {invoiceStatusChart.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-white/30 text-sm">No invoices</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={invoiceStatusChart} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {invoiceStatusChart.map((entry: any, index: number) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.name] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Expense Categories */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseCategoryChart.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-white/30 text-sm">No expenses</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={expenseCategoryChart.slice(0, 6)} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={75} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Amount"]} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* HR Dept */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Employees by Dept</CardTitle>
            </CardHeader>
            <CardContent>
              {employeeDeptChart.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-white/30 text-sm">No department data</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={employeeDeptChart} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                      {employeeDeptChart.map((_: any, index: number) => (
                        <Cell key={index} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
        </>)}
      </div>
    </OrgLayout>
  );
}
