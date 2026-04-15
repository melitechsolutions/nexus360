import { Smartphone, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MobileAppManagement() {
  const healthQuery = trpc.mobileApps.monitorAppHealth.useQuery({});
  const iosQuery = trpc.mobileApps.getIosAppMetrics.useQuery({} as any);
  const androidQuery = trpc.mobileApps.getAndroidAppMetrics.useQuery({} as any);

  const health = healthQuery.data as any;
  const ios = iosQuery.data as any;
  const android = androidQuery.data as any;

  const isLoading = healthQuery.isLoading || iosQuery.isLoading || androidQuery.isLoading;
  const error = healthQuery.error || iosQuery.error || androidQuery.error;

  return (
    <ModuleLayout
      title="Mobile App Management"
      icon={<Smartphone className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Mobile" },
        { label: "App Management" },
      ]}
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {error.message}</div>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">App Status</p>
                <p className="text-2xl font-bold">{health?.status ?? health?.overallStatus ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{health?.activeUsers ?? health?.totalUsers ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Crash Rate</p>
                <p className="text-2xl font-bold">{health?.crashRate ?? "—"}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>iOS Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {ios ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Users</span>
                      <span className="font-medium">{ios.activeUsers ?? ios.users ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Downloads</span>
                      <span className="font-medium">{ios.downloads ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating</span>
                      <span className="font-medium">{ios.rating ?? ios.appRating ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version</span>
                      <span className="font-medium">{ios.version ?? ios.currentVersion ?? "—"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No iOS data available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Android Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {android ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Users</span>
                      <span className="font-medium">{android.activeUsers ?? android.users ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Downloads</span>
                      <span className="font-medium">{android.downloads ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating</span>
                      <span className="font-medium">{android.rating ?? android.appRating ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version</span>
                      <span className="font-medium">{android.version ?? android.currentVersion ?? "—"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No Android data available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </ModuleLayout>
  );
}
