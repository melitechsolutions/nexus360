import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2 } from "lucide-react";

const ProcurementManagerDashboard: React.FC = () => {
  const statsQuery = trpc.procurement.getStats.useQuery();
  const lpoQuery = trpc.lpo.list.useQuery();

  if (statsQuery.isLoading || lpoQuery.isLoading) {
    return (
      <ModuleLayout
        title="Procurement Manager Dashboard"
        icon={<ShoppingCart className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Procurement" }]}
      >
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  if (statsQuery.error) {
    return (
      <ModuleLayout
        title="Procurement Manager Dashboard"
        icon={<ShoppingCart className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Procurement" }]}
      >
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {statsQuery.error.message}</div>
      </ModuleLayout>
    );
  }

  const stats = statsQuery.data as any;
  const lpos = (lpoQuery.data ?? []) as any[];

  return (
    <ModuleLayout
      title="Procurement Manager Dashboard"
      icon={<ShoppingCart className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Procurement" }]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalRequests ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingCount ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.approvedCount ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {(stats?.totalSpend ?? 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent LPOs</CardTitle>
          </CardHeader>
          <CardContent>
            {lpos.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data found.</p>
            ) : (
              <div className="space-y-4">
                {lpos.slice(0, 5).map((lpo: any, i: number) => (
                  <div key={lpo.id ?? i} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{lpo.lpoNumber ?? "—"}</p>
                      <p className="text-xs text-gray-600">{lpo.description ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">KES {(lpo.amount ?? 0).toLocaleString()}</p>
                      <Badge variant={lpo.status === "approved" ? "default" : "secondary"}>
                        {lpo.status ?? "—"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
};

export default ProcurementManagerDashboard;
