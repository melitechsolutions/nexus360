import { Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ServerlessComputing() {
  const { data, isLoading } = trpc.cloudInfrastructure.listDeployments.useQuery({ limit: 50 });
  const deployments = JSON.parse(JSON.stringify(data?.deployments ?? []));
  const serverless = deployments.filter((d: any) => {
    const cfg = d.config;
    return cfg?.type === 'serverless' || cfg?.runtime;
  });

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Serverless Computing</h1>
          <p className="text-gray-600 mt-2">Function-as-a-Service (FaaS) deployment and monitoring</p>
        </div>
        <Zap className="w-12 h-12 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Functions", value: String(serverless.length) },
          { label: "All Deployments", value: String(deployments.length) },
          { label: "Active", value: String(deployments.filter((d: any) => d.status === 'ACTIVE').length) },
          { label: "Running", value: String(deployments.filter((d: any) => d.status === 'RUNNING').length) },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-lg border-2 border-amber-200 shadow-md">
            <p className="text-gray-600 text-sm font-semibold">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-amber-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Serverless Deployments</h2>
        {isLoading ? <p className="text-muted-foreground">Loading...</p> : serverless.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No serverless configurations found. Use the API to configure serverless computing.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serverless.map((fn: any) => (
                  <TableRow key={fn.id}>
                    <TableCell className="font-semibold">{fn.name}</TableCell>
                    <TableCell>{fn.config?.runtime ?? '-'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">{fn.status}</span>
                    </TableCell>
                    <TableCell>{fn.createdAt ? new Date(fn.createdAt).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border-2 border-amber-200 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Container Deployments</h2>
        {deployments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No deployments found.</p>
        ) : (
          <div className="space-y-3">
            {deployments.map((d: any) => (
              <div key={d.id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{d.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    d.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>{d.status}</span>
                </div>
                <p className="text-xs text-gray-600">Replicas: {d.replicas ?? '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
