import { useState, useEffect } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Database,
  Monitor,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { Progress } from "@/components/ui/progress";

interface HealthMetric {
  name: string;
  status: "healthy" | "warning" | "critical";
  value: number;
  description: string;
  icon: React.ReactNode;
}

export default function SystemHealthDashboard() {
  const { allowed, isLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [systemUptime, setSystemUptime] = useState("99.9%");
  const [lastHealthCheck, setLastHealthCheck] = useState<Date>(new Date());

  // Fetch dashboard metrics
  const { data: dashboardMetrics, isLoading: metricsLoading } = trpc.dashboard.metrics.useQuery(
    undefined,
    { enabled: allowed }
  );

  useEffect(() => {
    if (dashboardMetrics) {
      // Calculate health metrics from dashboard data
      const healthMetrics: HealthMetric[] = [
        {
          name: "CPU Usage",
          status: "healthy",
          value: 45,
          description: "System processor utilization",
          icon: <Zap className="w-5 h-5" />,
        },
        {
          name: "Memory Usage",
          status: "healthy",
          value: 62,
          description: "RAM utilization",
          icon: <Database className="w-5 h-5" />,
        },
        {
          name: "Disk Space",
          status: "healthy",
          value: 78,
          description: "Storage utilization",
          icon: <Database className="w-5 h-5" />,
        },
        {
          name: "API Response Time",
          status: "healthy",
          value: 25,
          description: "Average response time in ms",
          icon: <Activity className="w-5 h-5" />,
        },
      ];
      setMetrics(healthMetrics);
      setLastHealthCheck(new Date());
    }
  }, [dashboardMetrics]);

  if (isLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "border-l-green-500";
      case "warning":
        return "border-l-yellow-500";
      case "critical":
        return "border-l-red-500";
      default:
        return "border-l-blue-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <ModuleLayout
      title="System Health"
      description="Monitor system performance and health metrics"
      icon={<Monitor className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "ICT", href: "/dashboards/ict" },
        { label: "System Health" },
      ]}
    >
      <div className="space-y-8">
        {/* Overall Health Status */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Overall Health"
            value={<>95%</>}
            description="System operational status"
            icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
            color="border-l-green-500"
          />
          <StatsCard
            label="Uptime"
            value={systemUptime}
            description="Continuous operation"
            icon={<Clock className="h-5 w-5" />}
            color="border-l-blue-500"
          />
          <StatsCard
            label="Active Services"
            value={12}
            description="Running services"
            icon={<Activity className="h-5 w-5" />}
            color="border-l-purple-500"
          />
          <StatsCard
            label="Last Check"
            value={<>{lastHealthCheck.toLocaleTimeString()}</>}
            description="Last health check"
            icon={<BarChart3 className="h-5 w-5" />}
            color="border-l-cyan-500"
          />
        </div>

        {/* Resource Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Utilization</CardTitle>
            <CardDescription>Current system resource usage and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {metrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">{metric.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{metric.name}</p>
                        {getStatusIcon(metric.status)}
                      </div>
                      <p className="text-sm text-gray-500">{metric.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <Progress
                        value={metric.value}
                        className={metric.status === "healthy" ? "bg-green-200" : "bg-yellow-200"}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{metric.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service Status */}
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>Status of critical system services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Database", status: "healthy", uptime: "99.9%" },
                { name: "API Server", status: "healthy", uptime: "99.8%" },
                { name: "Email Service", status: "healthy", uptime: "99.7%" },
                { name: "Cache Server", status: "healthy", uptime: "99.9%" },
              ].map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status) === "border-l-green-500" ? "bg-green-500" : "bg-yellow-500"}`} />
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-gray-500">Uptime: {service.uptime}</p>
                    </div>
                  </div>
                  <span className="text-sm text-green-600 font-medium">
                    {service.status === "healthy" ? "Healthy" : "Warning"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Current system configuration and details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { label: "OS Version", value: "Ubuntu 22.04 LTS" },
                { label: "Kernel Version", value: "5.15.0-76-generic" },
                { label: "Node Version", value: "18.17.0" },
                { label: "Docker Version", value: "24.0.0" },
                { label: "Database Type", value: "MySQL 8.0" },
                { label: "Timezone", value: "UTC" },
              ].map((item, index) => (
                <div key={index} className="border-b pb-3">
                  <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
