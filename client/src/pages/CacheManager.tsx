import { Database, Zap, RotateCw, Gauge } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CacheManager() {
  const statusQuery = trpc.systemHealth.getStatus.useQuery();
  const metricsQuery = trpc.systemHealth.getMetrics.useQuery({});
  const componentsQuery = trpc.systemHealth.getComponents.useQuery();

  const status = statusQuery.data ? JSON.parse(JSON.stringify(statusQuery.data)) : null;
  const metrics = metricsQuery.data ? JSON.parse(JSON.stringify(metricsQuery.data)) : null;
  const components = componentsQuery.data ? JSON.parse(JSON.stringify(componentsQuery.data)) : [];

  const cacheComponent = components.find((c: any) => c.name === "Cache Layer");
  const memory = status?.memory || {};

  return (
    <ModuleLayout
      title="Cache Manager"
      icon={<Database className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Cache Manager" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
                <p className="text-2xl font-bold">{metrics?.cacheHitRate ?? 0}%</p>
              </div>
              <Zap className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Memory Used</p>
                <p className="text-2xl font-bold">{memory.heapUsed ?? 0} MB</p>
                <p className="text-xs text-muted-foreground">of {memory.heapTotal ?? 0} MB heap</p>
              </div>
              <Gauge className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Memory</p>
                <p className="text-2xl font-bold">{memory.usagePercent ?? 0}%</p>
                <p className="text-xs text-muted-foreground">{memory.systemFree ?? 0} MB free</p>
              </div>
              <Database className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cache Response</p>
                <p className="text-2xl font-bold">{cacheComponent?.responseTime ?? 0}ms</p>
                <p className="text-xs text-muted-foreground">{cacheComponent?.status ?? "unknown"}</p>
              </div>
              <RotateCw className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Components</CardTitle>
          </CardHeader>
          <CardContent>
            {components.length > 0 ? (
              <div className="space-y-3">
                {components.map((comp: any, idx: number) => (
                  <div key={idx} className="p-4 bg-muted/50 rounded border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{comp.name}</p>
                        <p className="text-sm text-muted-foreground">Uptime: {comp.uptime}% | {comp.responseTime}ms</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        comp.status === "operational" ? "bg-green-100 text-green-700" :
                        comp.status === "degraded" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>{comp.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Loading components...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Server Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requests/min</span>
              <span className="font-semibold">{metrics?.requestsPerMinute ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Response Time</span>
              <span className="font-semibold">{metrics?.averageResponseTime ?? 0}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Error Rate</span>
              <span className="font-semibold">{metrics?.errorRate ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Connections</span>
              <span className="font-semibold">{metrics?.activeConnections ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">DB Queries</span>
              <span className="font-semibold">{metrics?.databaseQueries ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Node Version</span>
              <span className="font-semibold">{status?.nodeVersion ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-semibold">{status?.uptimeFormatted ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
