import { Target, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StrategicPlanning() {
  const initiativesQuery = trpc.executiveSuite.trackStrategicInitiatives.useQuery({});
  const dashboardQuery = trpc.executiveSuite.buildExecutiveDashboard.useQuery({});

  const initiativesData = initiativesQuery.data as any;
  const dashboardData = dashboardQuery.data as any;

  const initiatives = initiativesData?.initiatives ?? (Array.isArray(initiativesData) ? initiativesData : []);
  const metrics = dashboardData?.metrics ?? dashboardData?.kpis ?? [];

  const isLoading = initiativesQuery.isLoading || dashboardQuery.isLoading;
  const error = initiativesQuery.error || dashboardQuery.error;

  return (
    <ModuleLayout
      title="Strategic Planning"
      icon={<Target className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Strategy" },
        { label: "Strategic Planning" },
      ]}
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {error.message}</div>
      )}

      {!isLoading && !error && (
        <>
          {metrics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {metrics.slice(0, 4).map((m: any, idx: number) => (
                <Card key={idx}>
                  <CardContent className="pt-4">
                    <p className="text-sm text-gray-600">{m.name ?? m.label ?? "Metric"}</p>
                    <p className="text-2xl font-bold">{m.value ?? 0}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Strategic Initiatives ({initiatives.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {initiatives.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No data found.</p>
              ) : (
                <div className="space-y-3">
                  {initiatives.map((item: any, idx: number) => (
                    <div key={item.id ?? idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between mb-2">
                        <p className="font-semibold text-sm">{item.goal ?? item.name ?? item.title ?? "—"}</p>
                        <Badge variant={item.status === "at-risk" ? "destructive" : "secondary"}>
                          {item.status ?? "—"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">Target: {item.quarter ?? item.targetDate ?? "—"}</p>
                      <div className="w-full bg-gray-200 h-2 rounded">
                        <div
                          className="bg-pink-600 h-2 rounded"
                          style={{ width: `${item.progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </ModuleLayout>
  );
}
