import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Clock,
  Receipt,
  FileSpreadsheet,
  Loader2,
  LayoutDashboard,
} from "lucide-react";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const statsQuery = trpc.dashboard.stats.useQuery();
  const activityQuery = trpc.dashboard.recentActivity.useQuery({ limit: 10 });

  if (statsQuery.isLoading) {
    return (
      <ModuleLayout
        title="Dashboard"
        icon={<LayoutDashboard className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard" }]}
      >
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  if (statsQuery.error) {
    return (
      <ModuleLayout
        title="Dashboard"
        icon={<LayoutDashboard className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard" }]}
      >
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {statsQuery.error.message}</div>
      </ModuleLayout>
    );
  }

  const s = statsQuery.data as any;
  const activities = (activityQuery.data ?? []) as any[];

  return (
    <ModuleLayout
      title="Dashboard"
      description="Welcome back! Here's what's happening with your business."
      icon={<LayoutDashboard className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard" }]}
      actions={
        <Button onClick={() => navigate("/projects")}>
          <FolderKanban className="mr-2 h-4 w-4" />
          New Project
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ksh {(s?.totalRevenue ?? 0).toLocaleString()}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`flex items-center ${(s?.revenueGrowth ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {s?.revenueGrowth ?? 0}%
                </span>
                <span>vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s?.activeProjects ?? 0}</div>
              <div className="text-xs text-muted-foreground">+{s?.newProjects ?? 0} new this month</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s?.totalClients ?? 0}</div>
              <div className="text-xs text-muted-foreground">+{s?.newClients ?? 0} new this month</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s?.pendingInvoices ?? 0}</div>
              <div className="text-xs text-muted-foreground">Awaiting payment</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates and changes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data found.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity: any, index: number) => (
                  <div key={activity.id ?? index} className="flex gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action ?? "—"}</p>
                      <p className="text-sm text-muted-foreground">{activity.description ?? "—"}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {activity.createdAt ?? "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/clients")}>
                <Users className="h-6 w-6" />
                <span>Add Client</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/projects")}>
                <FolderKanban className="h-6 w-6" />
                <span>New Project</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/invoices")}>
                <FileText className="h-6 w-6" />
                <span>Create Invoice</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/estimates")}>
                <FileSpreadsheet className="h-6 w-6" />
                <span>New Estimate</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 py-4" onClick={() => navigate("/receipts")}>
                <Receipt className="h-6 w-6" />
                <span>New Receipt</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

