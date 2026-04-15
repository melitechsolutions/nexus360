import { Database, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function DataWarehouse() {
  const { data: warehouse, isLoading: wl } = trpc.businessIntelligence.getDataWarehouseMetrics.useQuery({ timeRange: "30d" });
  const { data: etlJobs, isLoading: el } = trpc.businessIntelligence.listEtlJobs.useQuery({ limit: 50 });

  if (wl || el) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-cyan-600" /></div>;

  const wh = warehouse ? JSON.parse(JSON.stringify(warehouse)) : {} as any;
  const jobs = etlJobs ? JSON.parse(JSON.stringify(etlJobs)) : { jobs: [], total: 0 };

  return (
    <ModuleLayout
      title="Data Warehouse"
      icon={<Database className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Data Warehouse" }]}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Database size={32} /> Data Warehouse
        </h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { title: "Total Records", value: wh.totalRecords?.toLocaleString() ?? "—", color: "blue" },
          { title: "Storage Used", value: wh.storageUsed ?? "—", color: "green" },
          { title: "Total Tables", value: wh.totalTables?.toLocaleString() ?? "—", color: "purple" },
          { title: "ETL Jobs", value: String(jobs.total ?? 0), color: "orange" },
        ].map((stat, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-lg shadow border-l-4 border-${stat.color}-500`}>
            <p className="text-sm text-slate-600">{stat.title}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent ETL Jobs</h2>
          {jobs.jobs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No ETL jobs found.</p>
          ) : (
            <div className="space-y-3">
              {jobs.jobs.slice(0, 5).map((job: any, idx: number) => (
                <div key={job.id ?? idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-900">{job.name ?? job.jobName ?? "Job"}</p>
                      <p className="text-sm text-slate-600">{job.recordsProcessed?.toLocaleString() ?? "—"} records</p>
                    </div>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      job.status === "completed" ? "bg-green-100 text-green-700" :
                      job.status === "running" ? "bg-blue-100 text-blue-700" :
                      job.status === "failed" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{job.status ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Warehouse Summary</h2>
          <div className="space-y-3">
            {Object.entries(wh)
              .filter(([k]) => !["totalRecords", "totalTables", "storageUsed"].includes(k))
              .slice(0, 6)
              .map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    <span className="text-sm text-slate-600">{String(val)}</span>
                  </div>
                </div>
              ))}
            {Object.keys(wh).length <= 3 && <p className="text-slate-500 text-center py-4">No additional metrics available.</p>}
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
