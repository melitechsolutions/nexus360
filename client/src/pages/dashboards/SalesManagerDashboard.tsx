import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2 } from "lucide-react";

const SalesManagerDashboard: React.FC = () => {
  const pipelineQuery = trpc.salesPipeline.getPipelineBoard.useQuery();
  const winLossQuery = trpc.salesPipeline.getWinLossStats.useQuery();

  if (pipelineQuery.isLoading || winLossQuery.isLoading) {
    return (
      <ModuleLayout
        title="Sales Manager Dashboard"
        icon={<TrendingUp className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Sales" }]}
      >
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  if (pipelineQuery.error) {
    return (
      <ModuleLayout
        title="Sales Manager Dashboard"
        icon={<TrendingUp className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Sales" }]}
      >
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {pipelineQuery.error.message}</div>
      </ModuleLayout>
    );
  }

  const pipeline = pipelineQuery.data as any;
  const winLoss = winLossQuery.data as any;
  const stages = (pipeline?.stages ?? []) as any[];

  return (
    <ModuleLayout
      title="Sales Manager Dashboard"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Sales" }]}
    >
      <div className="space-y-6">
        {/* Win/Loss Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{winLoss?.totalOpportunities ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Won</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{winLoss?.won ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{winLoss?.lost ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{winLoss?.winRate ?? 0}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Stages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {stages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data found.</p>
            ) : (
              <div className="space-y-4">
                {stages.map((stage: any, i: number) => (
                  <div key={stage.name ?? i} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{stage.label ?? stage.name ?? "—"}</p>
                      <p className="text-xs text-gray-600">{(stage.opportunities ?? []).length} opportunities</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        KES {((stage.opportunities ?? []).reduce((sum: number, o: any) => sum + (o.value ?? 0), 0)).toLocaleString()}
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

export default SalesManagerDashboard;
