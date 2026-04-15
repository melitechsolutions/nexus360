import { Loader2, Zap, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function DatabaseTuning() {
  const { data: metrics, isLoading: ml } = trpc.performanceOptimization.getPerformanceMetrics.useQuery({ timeRange: "24h" });
  const { data: optimizations, isLoading: ol } = trpc.performanceOptimization.listOptimizations.useQuery({ limit: 50 });

  if (ml || ol) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>;

  const m = metrics ? JSON.parse(JSON.stringify(metrics)) : {} as any;
  const opts = optimizations ? JSON.parse(JSON.stringify(optimizations)) : { configs: [], total: 0 };
  const dbConfigs = opts.configs.filter((c: any) => c.type === "database" || c.category === "database");

  return (
    <ModuleLayout
      title="Database Tuning"
      icon={<Zap className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Database Tuning" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Memory Usage", value: m.memory != null ? `${m.memory}%` : "—", icon: TrendingDown },
          { label: "P95 Latency", value: m.p95 != null ? `${m.p95}ms` : "—", icon: CheckCircle },
          { label: "Error Rate", value: m.errorRate != null ? `${m.errorRate}%` : "—", icon: AlertCircle },
          { label: "Avg Response", value: m.avgResponseTime != null ? `${m.avgResponseTime}ms` : "—", icon: Zap },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-amber-200 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <card.icon className="w-10 h-10 text-amber-600 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-amber-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Database Optimization Configs ({dbConfigs.length || opts.total})</h2>
        {(dbConfigs.length > 0 ? dbConfigs : opts.configs).length === 0 ? (
          <p className="text-gray-500 text-center py-8">No database tuning configurations found.</p>
        ) : (
          <div className="space-y-3">
            {(dbConfigs.length > 0 ? dbConfigs : opts.configs).map((cfg: any, idx: number) => (
              <div key={cfg.id ?? idx} className="p-3 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{cfg.name ?? cfg.type ?? "Config"}</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{cfg.status ?? "active"}</span>
                </div>
                {cfg.description && <p className="text-sm text-gray-600">{cfg.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
