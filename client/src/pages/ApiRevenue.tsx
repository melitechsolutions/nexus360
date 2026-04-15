import { TrendingUp, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function ApiRevenue() {
  const dashboard = trpc.apiMonetization.getMonetizationDashboard.useQuery({});
  const apis = trpc.apiMonetization.listApiMarketplace.useQuery({ limit: 20 });

  return (
    <ModuleLayout
      title="API Revenue Dashboard"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "API" }, { label: "Revenue" }]}
    >
      {dashboard.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
      ) : dashboard.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load revenue data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Total Revenue", value: `$${((dashboard.data?.totalRevenue ?? 0) / 100).toLocaleString()}` },
              { title: "Active APIs", value: String(dashboard.data?.activeApis ?? 0) },
              { title: "Total Subscribers", value: String(dashboard.data?.totalSubscribers ?? 0) },
              { title: "Avg Revenue/API", value: `$${dashboard.data?.activeApis ? ((dashboard.data.totalRevenue / dashboard.data.activeApis) / 100).toFixed(0) : "0"}` },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                <p className="text-sm text-slate-600">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {(apis.data?.apis?.length ?? 0) > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">API Marketplace</h2>
              <div className="space-y-2">
                {apis.data!.apis.map((api: any) => (
                  <div key={api.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{api.name}</p>
                      <p className="text-sm text-slate-600">{api.category || "General"}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${api.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {api.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
