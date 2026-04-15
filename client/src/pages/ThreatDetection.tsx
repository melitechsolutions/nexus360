import { ShieldAlert, AlertTriangle, Shield, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function ThreatDetection() {
  const { data, isLoading } = trpc.enterpriseSecurity.listSecurityIncidents.useQuery({ limit: 50, severity: undefined });
  const incidents = JSON.parse(JSON.stringify(data?.incidents ?? []));
  const threats = incidents.filter((i: any) => i.type === 'threat_detection');
  const critical = threats.filter((i: any) => i.severity === 'critical').length;

  return (
    <ModuleLayout
      title="Threat Detection"
      icon={<ShieldAlert className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Security" }, { label: "Threat Detection" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Threats Detected", value: String(threats.length), icon: AlertTriangle },
          { label: "Critical", value: String(critical), icon: Shield },
          { label: "Total Incidents", value: String(incidents.length), icon: Zap },
          { label: "Investigating", value: String(threats.filter((t: any) => t.status === 'investigating').length), icon: AlertTriangle },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-red-200 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <card.icon className="w-10 h-10 text-red-600 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-red-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Threats</h2>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : threats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No threats detected.</p>
        ) : (
          <div className="space-y-2">
            {threats.map((item: any) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded border-l-4 border-red-500">
                <div className="flex justify-between">
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.severity === "critical" ? "bg-red-100 text-red-700" :
                    item.severity === "high" ? "bg-orange-100 text-orange-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>{item.severity}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                <p className="text-xs text-gray-400 mt-1">Status: {item.status} | {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
