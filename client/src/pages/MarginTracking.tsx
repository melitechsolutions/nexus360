import { TrendingUp, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MarginTracking() {
  const plQuery = trpc.financialReports.profitLoss.useQuery({} as any);
  const bsQuery = trpc.financialReports.balanceSheet.useQuery({} as any);

  const plData = plQuery.data as any;
  const bsData = bsQuery.data as any;

  const isLoading = plQuery.isLoading || bsQuery.isLoading;
  const error = plQuery.error || bsQuery.error;

  return (
    <ModuleLayout
      title="Margin Tracking"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Finance" },
        { label: "Margin Tracking" },
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{plData?.totalRevenue ?? plData?.revenue ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold">{plData?.totalExpenses ?? plData?.expenses ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold">{plData?.netProfit ?? plData?.profit ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">Margin %</p>
                <p className="text-2xl font-bold">
                  {plData?.margin ?? plData?.profitMargin ?? "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit &amp; Loss Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {plData?.items || plData?.lineItems ? (
                <div className="space-y-2">
                  {(plData.items ?? plData.lineItems ?? []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-2 border-b text-sm">
                      <span>{item.name ?? item.category ?? "—"}</span>
                      <span className="font-medium">{item.amount ?? item.value ?? 0}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">Profit/loss detail not available.</p>
              )}
            </CardContent>
          </Card>

          {bsData && (
            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Assets</p>
                    <p className="text-xl font-bold">{bsData.totalAssets ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Liabilities</p>
                    <p className="text-xl font-bold">{bsData.totalLiabilities ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Equity</p>
                    <p className="text-xl font-bold">{bsData.equity ?? bsData.totalEquity ?? "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </ModuleLayout>
  );
}
