/**
 * Scheduler Job Monitoring Dashboard
 * Real-time monitoring of background jobs, health status, and job metrics
 * Supports manual job triggering and historical job tracking
 */

import { useState, useMemo } from "react";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Clock,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity,
  Play,
  RefreshCw,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getGradientCard, animations, getStatusColor } from "@/lib/designSystem";

export default function SchedulerDashboard() {
  const { allowed, isLoading: permissionsLoading } = useRequireFeature("admin:scheduler:view");
  const [refreshing, setRefreshing] = useState(false);
  const utils = trpc.useUtils();

  const { data: rawJobs = [], isLoading: schedulerLoading } = trpc.jobScheduler.listJobs.useQuery();
  const { data: rawHealth } = trpc.jobScheduler.getHealthStatus.useQuery();
  const jobs = JSON.parse(JSON.stringify(rawJobs));
  const health = rawHealth ? JSON.parse(JSON.stringify(rawHealth)) : null;

  const triggerJobMutation = trpc.jobScheduler.triggerJobNow.useMutation({
    onSuccess: () => {
      toast.success("Job triggered successfully");
      utils.jobScheduler.listJobs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to trigger job");
    },
  });

  const handleRefresh = () => {
    setRefreshing(true);
    utils.jobScheduler.listJobs.invalidate();
    utils.jobScheduler.getHealthStatus.invalidate();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleTriggerJob = (jobId: string) => {
    triggerJobMutation.mutate({ jobId });
  };

  if (permissionsLoading || schedulerLoading) return <Spinner className="w-8 h-8 mx-auto my-8" />;
  if (!allowed) return null;

  // Calculate metrics
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j: any) => j.isActive).length;
  const totalFailures = jobs.reduce((sum: number, j: any) => sum + (j.failureCount || 0), 0);

  const healthStatusLabel = health?.isHealthy ? "healthy" : totalFailures > 5 ? "critical" : "degraded";

  const statusColors = {
    healthy: "text-emerald-600 dark:text-emerald-400",
    degraded: "text-orange-600 dark:text-orange-400",
    critical: "text-red-600 dark:text-red-400",
  };

  const statusBgColors = {
    healthy: "bg-emerald-100 dark:bg-emerald-900/20",
    degraded: "bg-orange-100 dark:bg-orange-900/20",
    critical: "bg-red-100 dark:bg-red-900/20",
  };

  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Administration", href: "/admin" },
        { label: "Scheduler", href: "/scheduler" },
      ]}
      title="Job Scheduler"
      description="Monitor and manage scheduled background jobs"
      icon={<Clock className="w-6 h-6" />}
      actions={
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className={animations.fadeIn}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Health Status Alert */}
        {healthStatusLabel !== "healthy" && (
          <Alert
            className={`${statusBgColors[healthStatusLabel]} border-2`}
          >
            <AlertCircle className={`w-4 h-4 ${statusColors[healthStatusLabel]}`} />
            <AlertDescription>
              System health status: <strong>{healthStatusLabel.toUpperCase()}</strong>
              {totalFailures > 0 && ` - ${totalFailures} failed jobs`}
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={getGradientCard("blue")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Active Jobs
                <Activity className={`w-5 h-5 ${getStatusColor("active")}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeJobs}</div>
              <p className="text-xs text-muted-foreground mt-1">of {totalJobs} total</p>
            </CardContent>
          </Card>

          <Card className={getGradientCard("emerald")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Health Status
                <CheckCircle2 className={`w-5 h-5 ${getStatusColor("success")}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{health?.isHealthy ? "OK" : "Down"}</div>
              <p className="text-xs text-muted-foreground mt-1">{health?.statusMessage || "Unknown"}</p>
            </CardContent>
          </Card>

          <Card className={getGradientCard("orange")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Recent Failures
                <XCircle className={`w-5 h-5 ${getStatusColor("error")}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{health?.recentFailuresLastHour || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Last hour</p>
            </CardContent>
          </Card>

          <Card className={getGradientCard("purple")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Total Failures
                <Zap className={`w-5 h-5 ${getStatusColor("info")}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFailures}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all jobs</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health */}
          <Card className={getGradientCard("blue")}>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Real-time scheduler metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <Badge className={`${statusBgColors[healthStatusLabel]}`}>
                    {healthStatusLabel.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{health?.activeJobsCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Jobs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{health?.recentFailuresLastHour || 0}</p>
                    <p className="text-xs text-muted-foreground">Failures (last hr)</p>
                  </div>
                </div>
                {health?.lastHeartbeatAt && (
                  <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                    <p className="text-sm">
                      <strong>Last Heartbeat:</strong> {new Date(health.lastHeartbeatAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Jobs Summary */}
          <Card className={getGradientCard("slate")}>
            <CardHeader>
              <CardTitle>Jobs Summary</CardTitle>
              <CardDescription>Overview of all scheduled jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {jobs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No scheduled jobs found</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{activeJobs}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{totalJobs - activeJobs}</p>
                        <p className="text-xs text-muted-foreground">Inactive</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalJobs}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs List */}
        <Card className={getGradientCard("slate")}>
          <CardHeader>
            <CardTitle className={animations.fadeIn}>Scheduled Jobs</CardTitle>
            <CardDescription>View and manage all background jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No scheduled jobs configured</p>
              ) : jobs.map((job: any) => (
                <div
                  key={job.jobId}
                  className="p-4 rounded-lg border bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{job.jobName}</h3>
                        <Badge variant="outline">{job.cronExpression}</Badge>
                        <Badge
                          className={
                            job.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                          }
                        >
                          {job.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {job.jobType && <Badge variant="secondary">{job.jobType}</Badge>}
                      </div>
                      {job.description && <p className="text-sm text-muted-foreground mb-3">{job.description}</p>}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Last Run</p>
                          <p className="font-medium">
                            {job.lastExecutedAt ? new Date(job.lastExecutedAt).toLocaleString() : "Never"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Next Run</p>
                          <p className="font-medium">
                            {job.nextExecutionAt ? new Date(job.nextExecutionAt).toLocaleString() : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Timezone</p>
                          <p className="font-medium">{job.timezone || "UTC"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Failures</p>
                          <p className="font-medium">{job.failureCount || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerJob(job.jobId)}
                        disabled={!job.isActive || triggerJobMutation.isPending}
                        title="Manually trigger job"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
