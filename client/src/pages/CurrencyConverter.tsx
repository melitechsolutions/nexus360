import { useState } from "react";
import { DollarSign, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CurrencyConverter() {
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [amount, setAmount] = useState(100);
  const [result, setResult] = useState<any>(null);

  const configsQuery = trpc.globalFeatures.listConfigs.useQuery({ configType: "currency" });
  const convertMutation = trpc.globalFeatures.handleCurrencyConversion.useMutation({
    onSuccess: (data: any) => {
      setResult(data);
      toast.success("Conversion complete");
    },
    onError: (err: any) => toast.error(err.message ?? "Conversion failed"),
  });

  const handleConvert = () => {
    convertMutation.mutate({ from: fromCurrency, to: toCurrency, amount });
  };

  return (
    <ModuleLayout
      title="Currency Converter"
      icon={<DollarSign className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Finance" },
        { label: "Currency Converter" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Convert Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">From</label>
              <Input value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} placeholder="USD" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
              <Input value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} placeholder="EUR" />
            </div>
          </div>
          <Button className="mt-4" onClick={handleConvert} disabled={convertMutation.isPending}>
            {convertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Convert
          </Button>
          {result && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded">
              <p className="text-gray-700 text-sm">
                {amount} {fromCurrency} = {result.convertedAmount ?? "—"} {toCurrency}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rate: {result.rate ?? "—"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {configsQuery.isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {configsQuery.error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {configsQuery.error.message}</div>
          )}
          {configsQuery.data && (
            <>
              {(configsQuery.data as any[]).length === 0 ? (
                <p className="text-center text-gray-500 py-8">No data found.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(configsQuery.data as any[]).map((cfg: any, idx: number) => (
                    <div key={idx} className="p-2 bg-emerald-50 border border-emerald-200 rounded text-center text-sm font-semibold text-gray-900">
                      {cfg.name ?? cfg.value ?? cfg.key ?? "—"}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
