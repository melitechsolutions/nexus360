import { Activity, Loader2, AlertCircle, Clock, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function EtlMonitor() {
  const { data: etlJobs, isLoading, refetch } = trpc.businessIntelligence.listEtlJobs.useQuery({ limit: 50 });
  const runEtl = trpc.businessIntelligence.runEtlJob.useMutation({ onSuccess: () => { toast.success("ETL job triggered"); refetch(); } });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  const jobs = etlJobs ? JSON.parse(JSON.stringify(etlJobs)) : { jobs: [], total: 0 };
  const running = jobs.jobs.filter((j: any) => j.status === "running");
  const completed = jobs.jobs.filter((j: any) => j.status === "completed");
  const failed = jobs.jobs.filter((j: any) => j.status === "failed");

  return (
    <ModuleLayout
      title="ETL Monitor"
      icon={<Activity className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "ETL Monitor" }]}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Zap size={32} /> ETL Monitoring
        </h1>
        <button onClick={() => runEtl.mutate({ jobName: "manual", sourceTable: "all", targetTable: "all" })} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Trigger Job</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { title: "Total Jobs", value: String(jobs.total), color: "blue" },
          { title: "Running", value: String(running.length), color: "blue" },
          { title: "Completed", value: String(completed.length), color: "green" },
          { title: "Failed", value: String(failed.length), color: "red" },
        ].map((stat, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-lg shadow border-l-4 border-${stat.color}-500`}>
            <p className="text-sm text-slate-600">{stat.title}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Activity size={20} /> ETL Jobs
        </h2>
        {jobs.jobs.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No ETL jobs found.</p>
        ) : (
          <div className="space-y-3">
            {jobs.jobs.map((job: any, idx: number) => (
              <div key={job.id ?? idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900">{job.name ?? job.jobName ?? "ETL Job"}</h3>
                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                    job.status === "running" ? "bg-blue-100 text-blue-700" :
                    job.status === "completed" ? "bg-green-100 text-green-700" :
                    job.status === "failed" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{job.status ?? "unknown"}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{job.recordsProcessed?.toLocaleString() ?? "—"} records processed</span>
                  <span>{job.duration ?? job.createdAt ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {failed.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Failures</h2>
          <div className="space-y-2">
            {failed.slice(0, 5).map((fail: any, idx: number) => (
              <div key={fail.id ?? idx} className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-900">{fail.name ?? fail.jobName ?? "Job"}</p>
                  <p className="text-sm text-red-700">{fail.error ?? "Unknown error"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
