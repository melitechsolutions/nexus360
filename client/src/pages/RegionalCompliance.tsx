import { Globe, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function RegionalCompliance() {
  const configs = trpc.globalFeatures.listConfigs.useQuery({ configType: "regional_compliance", limit: 50 });

  return (
    <ModuleLayout
      title="Regional Compliance"
      icon={<Globe className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Settings" }, { label: "Regional Compliance" }]}
    >
      {configs.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
      ) : configs.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load regional compliance data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border-2 border-red-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Configurations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{configs.data?.total ?? 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border-2 border-red-200 shadow-md">
              <p className="text-gray-600 text-sm font-semibold">Listed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{configs.data?.configs?.length ?? 0}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-red-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Regional Configurations</h2>
            <div className="space-y-2">
              {(configs.data?.configs ?? []).map((cfg: any) => (
                <div key={cfg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold text-gray-900">{cfg.configType ?? "Regional"}</p>
                    <p className="text-sm text-gray-600">{cfg.config?.region ?? "—"}</p>
                  </div>
                  <span className="px-3 py-1 rounded text-sm font-semibold bg-green-100 text-green-700">Active</span>
                </div>
              ))}
              {(configs.data?.configs?.length ?? 0) === 0 && (
                <p className="text-center text-gray-500 py-8">No regional compliance configurations yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  );
}
