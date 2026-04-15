import { BarChart3, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function BiTools() {
  const { data: warehouse, isLoading: wl } = trpc.businessIntelligence.getDataWarehouseMetrics.useQuery({ timeRange: "30d" });
  const { data: etlJobs, isLoading: el } = trpc.businessIntelligence.listEtlJobs.useQuery({ limit: 50 });

  if (wl || el) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>;

  const wh = warehouse ? JSON.parse(JSON.stringify(warehouse)) : {} as any;
  const jobs = etlJobs ? JSON.parse(JSON.stringify(etlJobs)) : { jobs: [], total: 0 };

  return (
    <ModuleLayout
      title="BI Tools"
      icon={<BarChart3 className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Analytics" }, { label: "BI Tools" }]}
    >
      <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
        <BarChart3 size={32} /> Business Intelligence Tools
      </h1>

      <div className="grid grid-cols-4 gap-4">
        {[
          { title: "Total Records", value: wh.totalRecords?.toLocaleString() ?? "—", color: "blue" },
          { title: "ETL Jobs", value: String(jobs.total ?? 0), color: "green" },
          { title: "Tables", value: wh.totalTables?.toLocaleString() ?? "—", color: "purple" },
          { title: "Storage Used", value: wh.storageUsed ?? "—", color: "orange" },
        ].map((stat, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-lg shadow border-l-4 border-${stat.color}-500`}>
            <p className="text-sm text-slate-600">{stat.title}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">ETL Jobs ({jobs.total})</h2>
        {jobs.jobs.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No ETL jobs found.</p>
        ) : (
          <div className="space-y-3">
            {jobs.jobs.map((job: any, idx: number) => (
              <div key={job.id ?? idx} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 flex justify-between items-center">
                <div>
                  <span className="font-medium text-slate-900">{job.name ?? job.jobName ?? "Job"}</span>
                  <p className="text-xs text-slate-500">{job.schedule ?? job.type ?? ""}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded ${
                  job.status === "running" ? "bg-blue-100 text-blue-700" :
                  job.status === "completed" ? "bg-green-100 text-green-700" :
                  job.status === "failed" ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                }`}>{job.status ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
