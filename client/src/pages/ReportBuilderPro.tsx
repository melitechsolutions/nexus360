import { BarChart3, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ReportBuilderPro() {
  const trendQuery = trpc.analyticsEngine.getTrendAnalysis.useQuery({
    metric: "revenue",
    period: "monthly",
  });
  const kpiQuery = trpc.analyticsEngine.getPerformanceMetrics.useQuery({});

  const trendData = trendQuery.data as any;
  const kpiData = kpiQuery.data as any;

  const isLoading = trendQuery.isLoading || kpiQuery.isLoading;
  const error = trendQuery.error || kpiQuery.error;

  const trends = trendData?.trends ?? [];
  const kpis = kpiData?.kpis ?? [];

  return (
    <ModuleLayout
      title="Report Builder"
      icon={<BarChart3 className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Reports" },
        { label: "Report Builder" },
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Average</p>
                <p className="text-2xl font-bold">{trendData?.average ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Growth</p>
                <p className="text-2xl font-bold">{trendData?.growth ?? 0}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Volatility</p>
                <p className="text-2xl font-bold">{trendData?.volatility ?? "—"}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis ({trends.length} data points)</CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No data found.</p>
              ) : (
                <div className="space-y-2">
                  {trends.map((t: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-2 border-b text-sm">
                      <span>{t.date ?? "—"}</span>
                      <span className="font-medium">{t.value ?? 0}</span>
                      <span className={t.trend === "up" ? "text-green-600" : "text-red-600"}>
                        {t.trend === "up" ? "↑" : "↓"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>KPI Metrics ({kpis.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {kpis.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No data found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kpis.map((kpi: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <p className="text-sm text-gray-600">{kpi.name ?? "—"}</p>
                      <p className="text-xl font-bold">{kpi.value ?? 0} {kpi.unit ?? ""}</p>
                      <p className="text-xs text-gray-500">{kpi.change ?? "—"}</p>
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
