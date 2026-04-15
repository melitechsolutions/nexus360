import { Activity, Loader2, Database, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function QueryOptimization() {
  const { data: metrics, isLoading: ml } = trpc.performanceOptimization.getPerformanceMetrics.useQuery({ timeRange: "24h" });
  const { data: optimizations, isLoading: ol } = trpc.performanceOptimization.listOptimizations.useQuery({ limit: 50 });

  if (ml || ol) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const m = metrics ? JSON.parse(JSON.stringify(metrics)) : {} as any;
  const opts = optimizations ? JSON.parse(JSON.stringify(optimizations)) : { configs: [], total: 0 };
  const queryConfigs = opts.configs.filter((c: any) => c.type === "query" || c.category === "query");

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Query Optimization</h1>
          <p className="text-gray-600 mt-2">Monitor and improve database query performance</p>
        </div>
        <Activity className="w-12 h-12 text-blue-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg Response Time", value: m.avgResponseTime != null ? `${m.avgResponseTime}ms` : "—", icon: Zap },
          { label: "P95 Latency", value: m.p95 != null ? `${m.p95}ms` : "—", icon: Activity },
          { label: "Requests/sec", value: m.rps != null ? `${m.rps}` : "—", icon: Database },
          { label: "Cache Hit Rate", value: m.cacheHitRate != null ? `${m.cacheHitRate}%` : "—", icon: Activity },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-blue-200 shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <card.icon className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-blue-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Query Optimization Configs ({queryConfigs.length || opts.total})</h2>
        {(queryConfigs.length > 0 ? queryConfigs : opts.configs).length === 0 ? (
          <p className="text-gray-500 text-center py-8">No query optimization configurations found.</p>
        ) : (
          <div className="space-y-3">
            {(queryConfigs.length > 0 ? queryConfigs : opts.configs).map((cfg: any, idx: number) => (
              <div key={cfg.id ?? idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                <div>
                  <p className="font-semibold text-gray-900">{cfg.name ?? cfg.type ?? "Optimization"}</p>
                  <p className="text-sm text-gray-600">{cfg.description ?? `Type: ${cfg.type ?? "—"}`}</p>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-bold ${
                  cfg.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                }`}>{cfg.status ?? "active"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
