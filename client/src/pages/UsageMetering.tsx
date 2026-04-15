import { Gauge, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function UsageMetering() {
  const apis = trpc.apiMonetization.listApiMarketplace.useQuery({ limit: 50 });

  return (
    <ModuleLayout
      title="Usage Metering"
      icon={<Gauge className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Usage Metering" }]}
    >
      {apis.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : apis.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load usage data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Total APIs", value: String(apis.data?.total ?? 0) },
              { title: "Active", value: String((apis.data?.apis ?? []).filter((a: any) => a.status === "active").length) },
              { title: "Categories", value: String(new Set((apis.data?.apis ?? []).map((a: any) => a.category).filter(Boolean)).size || 0) },
              { title: "Total Listed", value: String(apis.data?.apis?.length ?? 0) },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                <p className="text-sm text-slate-600">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">API Usage</h2>
            <div className="space-y-2">
              {(apis.data?.apis ?? []).map((api: any) => (
                <div key={api.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{api.name}</p>
                    <p className="text-sm text-slate-600">Category: {api.category || "General"}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${api.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {api.status}
                  </span>
                </div>
              ))}
              {(apis.data?.apis?.length ?? 0) === 0 && (
                <p className="text-center text-slate-500 py-8">No API usage data available</p>
              )}
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  );
}
