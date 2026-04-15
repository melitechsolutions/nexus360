import React from "react";
import { Activity, AlertCircle, CheckCircle, XCircle, Clock, Cpu, HardDrive, Server } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

const statusStyles: Record<string, string> = {
  operational: "bg-green-100 text-green-700",
  degraded: "bg-yellow-100 text-yellow-700",
  down: "bg-red-100 text-red-700",
};

const statusIcon = (status: string) => {
  switch (status) {
    case "operational": return <CheckCircle size={20} className="text-green-600" />;
    case "degraded": return <AlertCircle size={20} className="text-yellow-600" />;
    case "down": return <XCircle size={20} className="text-red-600" />;
    default: return <CheckCircle size={20} className="text-gray-400" />;
  }
};

export default function SystemHealth() {
  const statusQuery = trpc.systemHealth.getStatus.useQuery(undefined, { refetchInterval: 30000 });
  const componentsQuery = trpc.systemHealth.getComponents.useQuery(undefined, { refetchInterval: 30000 });
  const metricsQuery = trpc.systemHealth.getMetrics.useQuery({}, { refetchInterval: 15000 });

  const status = statusQuery.data;
  const components = componentsQuery.data || [];
  const metrics = metricsQuery.data;

  return (
    <ModuleLayout
      title="System Health"
      description="Real-time system monitoring and component status"
      icon={<Activity className="h-6 w-6" />}
      breadcrumbs={[{label: "Dashboard", href: "/crm-home"}, {label: "Admin"}, {label: "System Health"}]}
    >
      <div className="space-y-6">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-sm text-slate-600">Overall Status</p>
            <p className="text-2xl font-bold text-slate-900">
              {status?.status?.toUpperCase() || "LOADING..."}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={14} /> Uptime
            </div>
            <p className="text-2xl font-bold text-slate-900">{status?.uptimeFormatted || "--"}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <HardDrive size={14} /> Memory Usage
            </div>
            <p className="text-2xl font-bold text-slate-900">{status?.memory?.usagePercent ?? "--"}%</p>
            <p className="text-xs text-slate-500">
              {status?.memory ? `${status.memory.systemFree}MB free / ${status.memory.systemTotal}MB total` : ""}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Cpu size={14} /> CPU Cores
            </div>
            <p className="text-2xl font-bold text-slate-900">{status?.cpu?.cores ?? "--"}</p>
            <p className="text-xs text-slate-500">
              {status?.cpu?.loadAvg ? `Load: ${status.cpu.loadAvg.join(", ")}` : ""}
            </p>
          </div>
        </div>

        {/* Process Memory */}
        {status?.memory && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Server size={20} /> Process Memory
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Heap Used</p>
                <p className="text-xl font-bold text-slate-900">{status.memory.heapUsed} MB</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Heap Total</p>
                <p className="text-xl font-bold text-slate-900">{status.memory.heapTotal} MB</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">RSS</p>
                <p className="text-xl font-bold text-slate-900">{status.memory.rss} MB</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">External</p>
                <p className="text-xl font-bold text-slate-900">{status.memory.external} MB</p>
              </div>
            </div>
          </div>
        )}

        {/* Component Status */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Component Status</h2>
          <div className="space-y-3">
            {components.map((component: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {statusIcon(component.status)}
                  <div>
                    <p className="font-medium text-slate-900">{component.name}</p>
                    <p className="text-sm text-slate-600">
                      Uptime: {component.uptime}% | Response: {component.responseTime}ms
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded ${statusStyles[component.status] || "bg-gray-100 text-gray-700"}`}>
                  {component.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Metrics */}
        {metrics && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Live Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600">Requests/min</p>
                <p className="text-2xl font-bold text-blue-800">{metrics.requestsPerMinute}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-green-800">{metrics.averageResponseTime}ms</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600">Error Rate</p>
                <p className="text-2xl font-bold text-red-800">{metrics.errorRate}%</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600">Active Connections</p>
                <p className="text-2xl font-bold text-purple-800">{metrics.activeConnections}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600">DB Queries</p>
                <p className="text-2xl font-bold text-orange-800">{metrics.databaseQueries}</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <p className="text-sm text-cyan-600">Cache Hit Rate</p>
                <p className="text-2xl font-bold text-cyan-800">{metrics.cacheHitRate}%</p>
              </div>
            </div>
          </div>
        )}

        {/* System Info */}
        {status && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">System Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Platform</p>
                <p className="font-medium text-slate-900">{status.platform}</p>
              </div>
              <div>
                <p className="text-slate-600">Node Version</p>
                <p className="font-medium text-slate-900">{status.nodeVersion}</p>
              </div>
              <div>
                <p className="text-slate-600">CPU Model</p>
                <p className="font-medium text-slate-900">{status.cpu?.model}</p>
              </div>
              <div>
                <p className="text-slate-600">Last Updated</p>
                <p className="font-medium text-slate-900">
                  {status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : "--"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
