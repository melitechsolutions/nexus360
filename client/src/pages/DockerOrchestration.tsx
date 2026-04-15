import { Server, Container, Zap, Cpu } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function DockerOrchestration() {
  const { data, isLoading } = trpc.cloudInfrastructure.listDeployments.useQuery({ limit: 50 });
  const deployments = JSON.parse(JSON.stringify(data?.deployments ?? []));
  const total = data?.total ?? 0;
  const running = deployments.filter((d: any) => d.status === 'RUNNING').length;
  const deployed = deployments.filter((d: any) => d.status === 'DEPLOYED').length;

  return (
    <ModuleLayout
      title="Docker Orchestration"
      icon={<Server className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Docker Orchestration" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Deployments", value: String(total), icon: Container },
          { label: "Running", value: String(running), icon: Cpu },
          { label: "Deployed", value: String(deployed), icon: Zap },
          { label: "Active", value: String(running + deployed), icon: Cpu },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-blue-200 shadow-md">
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
        <h2 className="text-xl font-bold text-gray-900 mb-4">Deployments</h2>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : deployments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No deployments yet.</p>
        ) : (
          <div className="space-y-3">
            {deployments.map((d: any) => (
              <div key={d.id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{d.name || d.serviceName || d.id}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    d.status === "RUNNING" ? "bg-green-100 text-green-700" : d.status === "DEPLOYED" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                  }`}>{d.status}</span>
                </div>
                <p className="text-xs text-gray-600">Replicas: {d.replicas ?? '-'} | Orchestrator: {d.orchestrator ?? '-'}</p>
                <p className="text-xs text-gray-500">Created: {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
