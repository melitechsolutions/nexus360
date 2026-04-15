import React from "react";
import { Calendar, Clock, Play, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function TaskScheduler() {
  const { data: jobsData, isLoading, error } = trpc.jobScheduler.listJobs.useQuery();
  const { data: healthData } = trpc.jobScheduler.getHealthStatus.useQuery();
  const utils = trpc.useUtils();

  const triggerJob = trpc.jobScheduler.triggerJobNow.useMutation({
    onSuccess: () => {
      toast.success("Job triggered successfully");
      utils.jobScheduler.listJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to trigger job"),
  });

  const jobs: any[] = (jobsData as any)?.jobs ?? (jobsData as any) ?? [];
  const health: any = (healthData as any) ?? {};

  return (
    <ModuleLayout
      title="Task Scheduler"
      icon={<Clock className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "System" },
        { label: "Task Scheduler" },
      ]}
    >
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error.message}</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Scheduled Jobs</div>
              <div className="text-2xl font-bold">{jobs.length}</div>
              <div className="text-xs text-green-600">
                {jobs.filter((j: any) => j.status === "scheduled" || j.status === "active").length} active
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Executions Today</div>
              <div className="text-2xl font-bold">{health.executionsToday ?? health.totalExecutions ?? 0}</div>
              <div className="text-xs text-blue-600">Last 24 hours</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-2xl font-bold">{health.successRate ?? health.uptime ?? "\u2014"}</div>
              <div className="text-xs text-green-600">This month</div>
            </div>
          </div>

          {jobs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No scheduled jobs found</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job: any) => (
                <div key={job.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{job.name ?? "\u2014"}</h3>
                      <p className="text-sm text-gray-600 mt-1">{job.schedule ?? job.cronExpression ?? "\u2014"}</p>
                    </div>
                    <button
                      onClick={() => triggerJob.mutate({ jobId: job.id })}
                      disabled={triggerJob.isPending}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Run now"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-600">Next Run</div>
                        <div className="font-medium">{job.nextRun ?? job.nextRunAt ?? "\u2014"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-gray-600">Last Run</div>
                        <div className="font-medium">{job.lastRun ?? job.lastRunAt ?? "\u2014"}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          job.status === "scheduled" || job.status === "active"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      ></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
