import { useState } from "react";
import { Puzzle, Loader2, CheckCircle, Circle } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ThirdPartyIntegrations() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = trpc.thirdPartyIntegrations.listIntegrations.useQuery();
  const configureMutation = trpc.thirdPartyIntegrations.configureIntegration.useMutation({
    onSuccess: () => { toast.success("Integration configured"); listQuery.refetch(); },
    onError: (err: any) => toast.error(err.message ?? "Configure failed"),
  });
  const testMutation = trpc.thirdPartyIntegrations.testIntegration.useMutation({
    onSuccess: () => toast.success("Test passed"),
    onError: (err: any) => toast.error(err.message ?? "Test failed"),
  });
  const disableMutation = trpc.thirdPartyIntegrations.disableIntegration.useMutation({
    onSuccess: () => { toast.success("Integration disabled"); listQuery.refetch(); },
    onError: (err: any) => toast.error(err.message ?? "Disable failed"),
  });
  const deleteMutation = trpc.thirdPartyIntegrations.deleteIntegration.useMutation({
    onSuccess: () => { toast.success("Integration deleted"); listQuery.refetch(); },
    onError: (err: any) => toast.error(err.message ?? "Delete failed"),
  });

  const integrations = (listQuery.data as any[]) ?? ((listQuery.data as any)?.integrations ?? []);

  return (
    <ModuleLayout
      title="Third Party Integrations"
      icon={<Puzzle className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "System" },
        { label: "Integrations" },
      ]}
    >
      {listQuery.isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {listQuery.error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {listQuery.error.message}</div>
      )}

      {!listQuery.isLoading && !listQuery.error && integrations.length === 0 && (
        <p className="text-center text-gray-500 py-8">No data found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((intg: any) => (
          <Card
            key={intg.id ?? intg.name}
            className={`cursor-pointer transition ${selectedId === (intg.id ?? intg.name) ? "border-blue-500 bg-blue-50" : ""}`}
            onClick={() => setSelectedId(intg.id ?? intg.name)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{intg.name ?? "—"}</CardTitle>
                  <p className="text-xs text-gray-600">{intg.category ?? intg.type ?? "—"}</p>
                </div>
                {intg.status === "connected" || intg.status === "active" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">{intg.description ?? "—"}</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); configureMutation.mutate({ integrationId: intg.id } as any); }}
                  disabled={configureMutation.isPending}
                >
                  Configure
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); testMutation.mutate({ integrationId: intg.id } as any); }}
                  disabled={testMutation.isPending}
                >
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); disableMutation.mutate({ integrationId: intg.id } as any); }}
                  disabled={disableMutation.isPending}
                >
                  Disable
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ integrationId: intg.id } as any); }}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ModuleLayout>
  );
}
