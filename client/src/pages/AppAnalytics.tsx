import React from "react";
import { BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
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
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AppAnalytics() {
  const { data: rawFinancial } = trpc.analytics.financialSummary.useQuery();
  const { data: rawRevenue = [] } = trpc.analytics.revenueTrends.useQuery({ months: 6 });
  const { data: rawProjects = [] } = trpc.analytics.projectStatusDistribution.useQuery();
  const { data: rawInvoiceMetrics } = trpc.analytics.invoiceMetrics.useQuery();
  const { data: rawKpi } = trpc.analytics.kpiSummary.useQuery();
  const { data: rawTopClients = [] } = trpc.analytics.topClients.useQuery({ limit: 5 });

  const financial = rawFinancial ? JSON.parse(JSON.stringify(rawFinancial)) : null;
  const revenue: any[] = JSON.parse(JSON.stringify(rawRevenue));
  const projects: any[] = JSON.parse(JSON.stringify(rawProjects));
  const invoiceMetrics = rawInvoiceMetrics ? JSON.parse(JSON.stringify(rawInvoiceMetrics)) : null;
  const kpi = rawKpi ? JSON.parse(JSON.stringify(rawKpi)) : null;
  const topClients: any[] = JSON.parse(JSON.stringify(rawTopClients));

  return (
    <ModuleLayout
      title="App Analytics"
      description="Business intelligence and performance metrics"
      icon={<BarChart3 className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Analytics" },
      ]}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Total Revenue"
            value={`Ksh ${((financial?.totalRevenue || 0) / 100).toLocaleString()}`}
            description="All time"
            color="border-l-blue-500"
          />
          <StatsCard
            label="Outstanding"
            value={`Ksh ${((financial?.totalOutstanding || 0) / 100).toLocaleString()}`}
            description="Unpaid invoices"
            color="border-l-red-500"
          />
          <StatsCard
            label="Total Invoices"
            value={invoiceMetrics?.totalInvoices || 0}
            description={`${invoiceMetrics?.paidInvoices || 0} paid`}
            color="border-l-green-500"
          />
          <StatsCard
            label="Active Projects"
            value={kpi?.activeProjects || 0}
            description={`${kpi?.totalClients || 0} clients`}
            color="border-l-purple-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              {revenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenue.map((r: any) => ({ ...r, revenue: (r.revenue || 0) / 100 }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => `Ksh ${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (Ksh)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No revenue data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Project Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
              <CardDescription>Distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projects}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }: any) => `${name}: ${value}`}
                    >
                      {projects.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No project data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients</CardTitle>
            <CardDescription>By revenue contribution</CardDescription>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <div className="space-y-3">
                {topClients.map((client: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{client.name || client.clientName || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{client.invoiceCount || 0} invoices</p>
                    </div>
                    <p className="font-bold">Ksh {((client.totalRevenue || 0) / 100).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No client data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
