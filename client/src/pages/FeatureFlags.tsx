import { Flag, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function FeatureFlags() {
  const flags = trpc.mobileApp.getMobileFeatureFlags.useQuery({});

  return (
    <ModuleLayout
      title="Feature Flags"
      icon={<Flag className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Feature Flags" }]}
    >
      {flags.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : flags.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load feature flags</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center bg-white p-4 rounded-lg shadow">
              <div className="text-3xl font-bold text-blue-600">{Object.keys(flags.data?.flags ?? {}).length}</div>
              <div className="text-sm text-gray-600">Total Flags</div>
            </div>
            <div className="text-center bg-white p-4 rounded-lg shadow">
              <div className="text-3xl font-bold text-green-600">{Object.values(flags.data?.flags ?? {}).filter(Boolean).length}</div>
              <div className="text-sm text-gray-600">Enabled</div>
            </div>
            <div className="text-center bg-white p-4 rounded-lg shadow">
              <div className="text-3xl font-bold text-gray-600">{Object.values(flags.data?.flags ?? {}).filter((v) => !v).length}</div>
              <div className="text-sm text-gray-600">Disabled</div>
            </div>
            <div className="text-center bg-white p-4 rounded-lg shadow">
              <div className="text-3xl font-bold text-purple-600">{flags.data?.abTests?.length ?? 0}</div>
              <div className="text-sm text-gray-600">A/B Tests</div>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(flags.data?.flags ?? {}).map(([name, enabled]) => (
              <div key={name} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
                    <p className="text-sm text-gray-600">Flag: {name}</p>
                  </div>
                  {enabled ? (
                    <ToggleRight className="w-6 h-6 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
            {Object.keys(flags.data?.flags ?? {}).length === 0 && (
              <p className="text-center text-gray-500 py-8">No feature flags configured</p>
            )}
          </div>

          {(flags.data?.abTests?.length ?? 0) > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">A/B Tests</h2>
              <div className="space-y-2">
                {flags.data!.abTests.map((test: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{test.name}</p>
                      <p className="text-sm text-slate-600">Cohort: {test.cohort}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${test.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {test.enabled ? "Active" : "Inactive"}
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
