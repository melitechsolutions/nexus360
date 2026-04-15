import { Smartphone, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function AndroidApp() {
  const version = trpc.mobileApp.getAppVersion.useQuery({ platform: "android" });
  const analytics = trpc.mobileApp.getMobileAnalytics.useQuery({ period: "monthly" });

  return (
    <ModuleLayout
      title="Android App"
      icon={<Smartphone className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Mobile" }, { label: "Android App" }]}
    >
      {version.isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
      ) : version.error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load Android app data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Current Version", value: version.data?.currentVersion ?? "—" },
              { label: "Min Version", value: version.data?.minimumVersion ?? "—" },
              { label: "Status", value: version.data?.status ?? "—" },
              { label: "Active Users", value: analytics.data?.analytics?.activeUsers?.toLocaleString() ?? "—" },
            ].map((card, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-md">
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Version Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-700">Latest</span><span className="font-semibold">{version.data?.latestVersion ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Release Date</span><span className="font-semibold">{version.data?.releaseDate ? new Date(version.data.releaseDate).toLocaleDateString() : "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Platform</span><span className="font-semibold">{version.data?.platform ?? "android"}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Status</span><span className="font-semibold text-green-600">{version.data?.status ?? "—"}</span></div>
              </div>
            </div>

            {analytics.data && (
              <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-md">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics ({analytics.data.period})</h2>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-700">Sessions</span><span className="font-semibold">{analytics.data.analytics?.sessionCount?.toLocaleString() ?? "—"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-700">Avg Duration</span><span className="font-semibold">{analytics.data.analytics?.avgSessionDuration ?? "—"}s</span></div>
                  <div className="flex justify-between"><span className="text-gray-700">Crash Rate</span><span className="font-semibold">{analytics.data.analytics?.crashRate ?? "—"}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-700">Android Users</span><span className="font-semibold">{analytics.data.platforms?.android?.activeUsers?.toLocaleString() ?? "—"} ({analytics.data.platforms?.android?.percentage ?? 0}%)</span></div>
                </div>
              </div>
            )}
          </div>

          {(version.data?.changelog?.length ?? 0) > 0 && (
            <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-md">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Changelog</h2>
              <div className="space-y-2">
                {version.data!.changelog.map((entry: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-900">{typeof entry === "string" ? entry : entry.description ?? JSON.stringify(entry)}</p>
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
