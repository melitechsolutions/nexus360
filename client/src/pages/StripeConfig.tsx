import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2 } from "lucide-react";

export default function StripeConfig() {
  const statusQuery = trpc.stripe.getStatus.useQuery();
  const txQuery = trpc.stripe.getRecentTransactions.useQuery({ limit: 10 });

  if (statusQuery.isLoading || txQuery.isLoading) {
    return (
      <ModuleLayout
        title="Stripe Configuration"
        icon={<CreditCard className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Payments" }, { label: "Stripe Config" }]}
      >
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  if (statusQuery.error) {
    return (
      <ModuleLayout
        title="Stripe Configuration"
        icon={<CreditCard className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Payments" }, { label: "Stripe Config" }]}
      >
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {statusQuery.error.message}</div>
      </ModuleLayout>
    );
  }

  const status = statusQuery.data as any;
  const transactions = (txQuery.data ?? []) as any[];

  return (
    <ModuleLayout
      title="Stripe Configuration"
      icon={<CreditCard className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Payments" }, { label: "Stripe Config" }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Mode</span>
                <p className="font-medium">{status?.mode ?? "—"}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Connected</span>
                <Badge variant={status?.configured ? "default" : "secondary"}>
                  {status?.configured ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data found.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx: any, i: number) => (
                  <div key={tx.id ?? i} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">{tx.stripeIntentId ?? "—"}</div>
                      <div className="text-xs text-gray-600">{tx.createdAt ?? "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{(tx.currency ?? "USD").toUpperCase()} {tx.amount ?? 0}</div>
                      <Badge variant={tx.status === "succeeded" ? "default" : "secondary"}>
                        {tx.status ?? "—"}
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
}
