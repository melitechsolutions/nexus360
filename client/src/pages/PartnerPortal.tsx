import { Handshake, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PartnerPortal() {
  const dealsQuery = trpc.partnerChannel.listDeals.useQuery({});
  const perfQuery = trpc.partnerChannel.getPartnerPerformance.useQuery({});
  const registerMutation = trpc.partnerChannel.registerPartner.useMutation({
    onSuccess: () => {
      toast.success("Partner registered successfully");
      dealsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message ?? "Registration failed"),
  });

  const deals = (dealsQuery.data as any[]) ?? ((dealsQuery.data as any)?.deals ?? []);
  const perf = perfQuery.data as any;

  const isLoading = dealsQuery.isLoading || perfQuery.isLoading;
  const error = dealsQuery.error || perfQuery.error;

  return (
    <ModuleLayout
      title="Partner Portal"
      icon={<Handshake className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Partners" },
        { label: "Portal" },
      ]}
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Partner Portal</h2>
        <Button onClick={() => registerMutation.mutate({} as any)} disabled={registerMutation.isPending}>
          {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Register Partner
        </Button>
      </div>

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
          {perf && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600">Total Partners</p>
                  <p className="text-2xl font-bold">{perf.totalPartners ?? perf.partnerCount ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold">{perf.revenue ?? perf.totalRevenue ?? "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600">Avg Margin</p>
                  <p className="text-2xl font-bold">{perf.avgMargin ?? perf.margin ?? "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600">Top Tier</p>
                  <p className="text-2xl font-bold">{perf.topTier ?? perf.tier ?? "—"}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Deals ({deals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No data found.</p>
              ) : (
                <div className="space-y-3">
                  {deals.map((deal: any, idx: number) => (
                    <div key={deal.id ?? idx} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{deal.name ?? deal.partnerName ?? "—"}</p>
                        <p className="text-sm text-slate-600">{deal.customers ?? deal.dealCount ?? 0} deals</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{deal.revenue ?? deal.value ?? "—"}</p>
                        <Badge variant="secondary">{deal.tier ?? deal.status ?? "—"}</Badge>
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
