import { Settings, Zap, Activity, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MicroservicesConfig() {
  const { data, isLoading } = trpc.cloudInfrastructure.listDeployments.useQuery({ limit: 50 });
  const deployments = JSON.parse(JSON.stringify(data?.deployments ?? []));
  const services = deployments.filter((d: any) => d.serviceName);
  const healthy = services.filter((d: any) => d.status === 'DEPLOYED' || d.status === 'RUNNING').length;

  return (
    <ModuleLayout
      title="Microservices Config"
      icon={<Settings className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "System" }, { label: "Microservices Config" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Services", value: String(services.length), icon: Zap },
          { label: "Healthy", value: String(healthy), icon: Activity },
          { label: "Total Deployments", value: String(deployments.length), icon: TrendingUp },
          { label: "All Active", value: String(deployments.filter((d: any) => d.status !== 'STOPPED').length), icon: Zap },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-purple-200 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <card.icon className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-purple-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Service Health Status</h2>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : services.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No microservices deployed. Use deployMicroservices to deploy.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Replicas</TableHead>
                  <TableHead>Orchestrator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold">{s.serviceName || s.name}</TableCell>
                    <TableCell>{s.replicas ?? '-'}</TableCell>
                    <TableCell>{s.orchestrator ?? '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        s.status === 'DEPLOYED' || s.status === 'RUNNING' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>{s.status}</span>
                    </TableCell>
                    <TableCell>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
