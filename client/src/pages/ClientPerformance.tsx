import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { Medal, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatPercentage } from "@/utils/format";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { exportToCsv } from "@/utils/exportCsv";

export default function ClientPerformance() {
  const { data: performance } = trpc.advancedReports.getClientPerformance.useQuery({
    limit: 15,
  });

  if (!performance) return <div>Loading...</div>;

  // Prepare chart data
  const chartData = performance.clients?.map((client) => ({
    name: client.clientName.slice(0, 15),
    totalQuotes: client.totalQuotes,
    converted: client.convertedQuotes,
    value: client.totalValue,
    conversionRate: client.conversionRate,
  })) || [];

  return (
    <ModuleLayout
      title="Client Performance"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Clients" }, { label: "Client Performance" }]}
    >
      <div>
        <p className="text-muted-foreground mt-2">
          Top performing clients by value and conversion metrics
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard label="Top Client Value" value={formatCurrency(performance.topClientValue)} color="border-l-pink-500" />
        <StatsCard label="Avg Client Value" value={formatCurrency(performance.averageClientValue)} color="border-l-emerald-500" />
        <StatsCard label="Total Client Revenue" value={formatCurrency(performance.totalClientRevenue)} color="border-l-orange-500" />
        <StatsCard label="Active Clients" value={performance.clients?.length || 0} color="border-l-purple-500" />
      </div>

      {/* Value by Client Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Client Value Distribution</CardTitle>
          <CardDescription>Top 15 clients by total quote value</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar
                dataKey="value"
                fill="#10b981"
                name="Total Value"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion vs Quotes Scatter */}
      <Card>
        <CardHeader>
          <CardTitle>Quotes vs Conversion Rate</CardTitle>
          <CardDescription>
            Client position: Total quotes vs conversion rate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="totalQuotes" type="number" name="Total Quotes" />
              <YAxis dataKey="conversionRate" type="number" name="Conversion %" />
              <Tooltip formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : value)} />
              <Scatter name="Clients" data={chartData} fill="#6366f1" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Client Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>Complete metrics for each top client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead className="text-right">Total Quotes</TableHead>
                  <TableHead className="text-right">Converted</TableHead>
                  <TableHead className="text-right">Conversion %</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Avg Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.clients?.map((client, idx) => (
                  <TableRow key={client.clientId} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {idx < 3 && <Medal className="w-4 h-4 text-yellow-500" />}
                        {idx + 1}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{client.clientName}</TableCell>
                    <TableCell className="text-right">{client.totalQuotes}</TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">
                      {client.convertedQuotes}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold text-sm">
                        {formatPercentage(client.conversionRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(client.totalValue)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(client.averageValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tiers */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Medal className="w-4 h-4 text-yellow-600" />
              Premium Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {performance.clients?.filter((c) => c.totalValue > 50000).length || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Value &gt; $50,000
            </p>
          </CardContent>
        </Card>

        <StatsCard
          label="High Conversion"
          value={performance.clients?.filter((c) => c.conversionRate >= 50).length || 0}
          description="Rate ≥ 50%"
          color="border-l-green-500"
        />

        <StatsCard
          label="Active Accounts"
          value={performance.clients?.filter((c) => c.totalQuotes >= 5).length || 0}
          description="5+ quotes"
          color="border-l-blue-500"
        />
      </div>

      <Button
        className="gap-2"
        size="lg"
        onClick={() => {
          const rows = (performance.clients || []).map((client) => ({
            clientName: client.clientName,
            totalQuotes: client.totalQuotes,
            convertedQuotes: client.convertedQuotes,
            conversionRate: client.conversionRate,
            totalValue: client.totalValue,
            averageValue: client.averageValue,
          }));
          if (!rows.length) {
            toast.info("No client data available to export");
            return;
          }
          exportToCsv("client-performance-report", rows);
          toast.success("Client report exported");
        }}
      >
        <TrendingUp className="w-4 h-4" />
        Export Client Report
      </Button>
    </ModuleLayout>
  );
}
