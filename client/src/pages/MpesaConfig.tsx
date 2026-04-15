import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Loader2 } from "lucide-react";

export default function MpesaConfig() {
  const statusQuery = trpc.mpesa.getStatus.useQuery();
  const historyQuery = trpc.mpesa.getTransactionHistory.useQuery({ limit: 10 });

  if (statusQuery.isLoading || historyQuery.isLoading) {
    return (
      <ModuleLayout
        title="M-Pesa Configuration"
        icon={<Smartphone className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Payments" }, { label: "M-Pesa Config" }]}
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
        title="M-Pesa Configuration"
        icon={<Smartphone className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Payments" }, { label: "M-Pesa Config" }]}
      >
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {statusQuery.error.message}</div>
      </ModuleLayout>
    );
  }

  const status = statusQuery.data as any;
  const transactions = (historyQuery.data ?? []) as any[];

  return (
    <ModuleLayout
      title="M-Pesa Configuration"
      icon={<Smartphone className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Payments" }, { label: "M-Pesa Config" }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Environment</span>
                <p className="font-medium">{status?.environment ?? "—"}</p>
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
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((tx: any, i: number) => (
                  <div key={tx.checkoutRequestId ?? i} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">{tx.mpesaReceiptNumber ?? tx.checkoutRequestId ?? "—"}</div>
                      <div className="text-xs text-gray-600">{tx.transactionDate ?? "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">KES {tx.amount ?? 0}</div>
                      <Badge variant={tx.status === "completed" ? "default" : "secondary"}>
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
