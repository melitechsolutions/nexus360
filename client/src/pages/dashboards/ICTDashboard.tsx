import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  AlertCircle,
  BarChart3,
  Mail,
  Shield,
  Network,
  Activity,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Lock,
  Database,
  Monitor,
  Menu,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import ICTDashboardNav, { ICTDashboardNavMobile } from "@/components/ICTDashboardNav";
import { cn } from "@/lib/utils";

export default function ICTDashboard() {
  const { allowed, isLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const [, navigate] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    systemHealth: 95,
    activeUsers: 0,
    emailQueue: 0,
    uptime: "99.9%",
  });

  // Fetch real ICT system metrics
  const { data: systemHealthData, isLoading: healthLoading } = trpc.ictManagement.getSystemHealth.useQuery(undefined, { 
    enabled: allowed,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const { data: emailQueueData, isLoading: emailLoading } = trpc.ictManagement.getEmailQueueStatus.useQuery(undefined, { 
    enabled: allowed,
    refetchInterval: 60000,
  });
  
  const { data: activeSessionsData, isLoading: sessionsLoading } = trpc.ictManagement.getActiveSessions.useQuery(undefined, { 
    enabled: allowed,
    refetchInterval: 45000,
  });

  // Calculate system health percentage from CPU, memory, disk usage
  useEffect(() => {
    if (systemHealthData) {
      const avgUsage = (systemHealthData.cpuUsage + systemHealthData.memoryUsage + systemHealthData.diskUsagePercent) / 3;
      const healthPercent = Math.round(100 - avgUsage);
      
      setMetrics({
        systemHealth: Math.max(0, healthPercent),
        activeUsers: activeSessionsData?.length || 0,
        emailQueue: emailQueueData?.pending || 0,
        uptime: `${systemHealthData.systemUptime || 0}h`,
      });
    }
  }, [systemHealthData, emailQueueData, activeSessionsData]);

  if (isLoading || healthLoading || emailLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const ictFeatures = [
    {
      title: "System Health",
      description: "Monitor system performance and health metrics",
      icon: <Monitor className="w-8 h-8" />,
      href: "/admin/system-health",
      color: "from-blue-500 to-blue-600",
      stat: { label: "Health", value: `${metrics.systemHealth}%` },
    },
    {
      title: "Email Queue",
      description: "Monitor and manage email sending operations",
      icon: <Mail className="w-8 h-8" />,
      href: "/communications",
      color: "from-purple-500 to-purple-600",
      stat: { label: "Pending", value: metrics.emailQueue },
    },
    {
      title: "System Logs",
      description: "View and audit system activity and events",
      icon: <Activity className="w-8 h-8" />,
      href: "/admin/system-logs",
      color: "from-green-500 to-green-600",
      stat: { label: "Recent", value: "12" },
    },
    {
      title: "Session Manager",
      description: "Monitor and manage user login sessions",
      icon: <Network className="w-8 h-8" />,
      href: "/admin/sessions",
      color: "from-orange-500 to-orange-600",
      stat: { label: "Active", value: metrics.activeUsers },
    },
    {
      title: "Backup Management",
      description: "Manage database and system backups",
      icon: <Database className="w-8 h-8" />,
      href: "/admin/backups",
      color: "from-red-500 to-red-600",
      stat: { label: "Status", value: "Healthy" },
    },
    {
      title: "Security & Access",
      description: "Configure security policies and access control",
      icon: <Shield className="w-8 h-8" />,
      href: "/admin/management",
      color: "from-cyan-500 to-cyan-600",
      stat: { label: "Status", value: "Secure" },
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Navigation Sidebar */}
      <div className="hidden md:block">
        <ICTDashboardNav />
      </div>
      <div className="md:hidden">
        <ICTDashboardNavMobile isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header with Menu Toggle */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-lg font-semibold">ICT Dashboard</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <ModuleLayout
            title="ICT Dashboard"
            description="System administration, monitoring, and technical management"
            icon={<Monitor className="h-5 w-5" />}
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "ICT" }]}
          >
            <div className="space-y-8">

        {/* System Health Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="System Health"
            value={<>{metrics.systemHealth}%</>}
            description="Overall system status"
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="Active Users"
            value={metrics.activeUsers}
            description="Currently online"
            icon={<TrendingUp className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Email Queue"
            value={metrics.emailQueue}
            description="Pending emails"
            icon={<Mail className="h-5 w-5" />}
            color="border-l-purple-500"
          />

          <StatsCard
            label="Uptime"
            value={metrics.uptime}
            description="System availability"
            icon={<AlertCircle className="h-5 w-5" />}
            color="border-l-yellow-500"
          />
        </div>

        {/* ICT Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ictFeatures.map((feature) => (
            <Card
              key={feature.href}
              className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group hover:scale-105 border-2 hover:border-primary/50"
              onClick={() => navigate(feature.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white`}>
                    {feature.icon}
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" className="w-full group-hover:bg-accent">
                    Access
                  </Button>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {feature.stat.value}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold">Troubleshooting & Support</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => navigate("/admin/system-health")}
            >
              <Monitor className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">System Health</div>
                <div className="text-sm text-muted-foreground">Monitor system performance</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => navigate("/admin/system-logs")}
            >
              <Activity className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">System Logs</div>
                <div className="text-sm text-muted-foreground">View audit logs and activity</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => navigate("/admin/sessions")}
            >
              <Network className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Session Manager</div>
                <div className="text-sm text-muted-foreground">Manage active user sessions</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => navigate("/admin/backups")}
            >
              <Database className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Backup Management</div>
                <div className="text-sm text-muted-foreground">Manage system backups</div>
              </div>
            </Button>
          </div>
        </div>

        {/* System Info Card */}
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 text-white">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription className="text-slate-400">
              Current system status and details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-slate-400">System Status</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Operational
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Database</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Connected
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">API Status</p>
                <p className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Responding
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
            </div>
          </ModuleLayout>
        </div>
      </div>
    </div>
  );
}
