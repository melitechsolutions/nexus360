import { Zap, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function PerformanceTuning() {
  const { data: metrics, isLoading: ml } = trpc.performanceOptimization.getPerformanceMetrics.useQuery({ timeRange: "24h" });
  const { data: optimizations, isLoading: ol } = trpc.performanceOptimization.listOptimizations.useQuery({ limit: 20 });

  if (ml || ol) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>;

  const m = metrics ? JSON.parse(JSON.stringify(metrics)) : {} as any;
  const opts = optimizations ? JSON.parse(JSON.stringify(optimizations)) : { configs: [], total: 0 };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-orange-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
        <Zap size={32} /> Performance Tuning
      </h1>

      <div className="grid grid-cols-4 gap-4">
        {[
          { title: "Avg Response Time", value: m.avgResponseTime != null ? `${m.avgResponseTime}ms` : "—" },
          { title: "Error Rate", value: m.errorRate != null ? `${m.errorRate}%` : "—" },
          { title: "CPU Usage", value: m.cpu != null ? `${m.cpu}%` : "—" },
          { title: "Cache Hit Rate", value: m.cacheHitRate != null ? `${m.cacheHitRate}%` : "—" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-sm text-slate-600">{stat.title}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Optimization Configurations ({opts.total})</h2>
        {opts.configs.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No optimization configurations found.</p>
        ) : (
          <div className="space-y-3">
            {opts.configs.map((cfg: any, idx: number) => (
              <div key={cfg.id ?? idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-medium text-slate-900">{cfg.name ?? cfg.type ?? "Configuration"}</p>
                <div className="flex justify-between mt-2 text-sm text-slate-600">
                  <span>Type: {cfg.type ?? "—"}</span>
                  <span className="text-green-600">Status: {cfg.status ?? "active"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
