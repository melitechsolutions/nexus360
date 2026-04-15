import { Smartphone } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function IosApp() {
  const versionQuery = trpc.mobileApp.getAppVersion.useQuery({ platform: "ios" });
  const analyticsQuery = trpc.mobileApp.getMobileAnalytics.useQuery({ period: "monthly" });
  const flagsQuery = trpc.mobileApp.getMobileFeatureFlags.useQuery({ platform: "ios" });

  const version = versionQuery.data ? JSON.parse(JSON.stringify(versionQuery.data)) : null;
  const analytics = analyticsQuery.data ? JSON.parse(JSON.stringify(analyticsQuery.data)) : null;
  const flags = flagsQuery.data ? JSON.parse(JSON.stringify(flagsQuery.data)) : null;

  const iosStats = analytics?.platforms?.ios || {};
  const analyticsData = analytics?.analytics || {};
  const featureFlags = flags?.flags || {};
  const flagEntries = Object.entries(featureFlags);

  const chartData = [
    { name: "Active Users", value: iosStats.activeUsers || 0 },
    { name: "Sessions", value: analyticsData.sessionCount || 0 },
    { name: "Crash Rate", value: (analyticsData.crashRate || 0) * 100 },
  ];

  return (
    <ModuleLayout
      title="iOS App"
      icon={<Smartphone className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Mobile" }, { label: "iOS App" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Current Version</p>
            <p className="text-2xl font-bold">{version?.currentVersion || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active Users (iOS)</p>
            <p className="text-2xl font-bold">{iosStats.activeUsers ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Sessions</p>
            <p className="text-2xl font-bold">{analyticsData.sessionCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={version?.status === "available" || version?.status === "active" ? "default" : "secondary"}>
              {version?.status || "Unknown"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>iOS Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Version Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Version</span>
              <span className="font-semibold">{version?.currentVersion || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minimum Version</span>
              <span className="font-semibold">{version?.minimumVersion || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Latest Version</span>
              <span className="font-semibold">{version?.latestVersion || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Release Date</span>
              <span className="font-semibold">{version?.releaseDate ? new Date(version.releaseDate).toLocaleDateString() : "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent>
            {flagEntries.length > 0 ? (
              <div className="space-y-3">
                {flagEntries.map(([key, enabled]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{key}</span>
                    <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No feature flags configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {version?.changelog && version.changelog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Changelog</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {version.changelog.map((entry: string, i: number) => (
                <li key={i} className="text-sm">{entry}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </ModuleLayout>
  );
}
