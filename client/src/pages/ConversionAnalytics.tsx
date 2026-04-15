import { useState } from "react";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatPercentage, formatCurrency } from "@/utils/format";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { exportToCsv } from "@/utils/exportCsv";

export default function ConversionAnalytics() {
  const { data: conversionData } = trpc.advancedReports.getConversionAnalytics.useQuery({});
  const { data: metrics } = trpc.advancedReports.getQuoteMetrics.useQuery({});

  if (!conversionData) return <div>Loading...</div>;

  return (
    <ModuleLayout
      title="Conversion Analytics"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Analytics" }, { label: "Conversion Analytics" }]}
    >
      <div>
        <p className="text-muted-foreground mt-2">
          Quote to invoice conversion performance and trends
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          label="Overall Rate"
          value={<>{formatPercentage(conversionData.overallConversionRate)}%</>}
          description={<>{conversionData.convertedQuotes} of {conversionData.totalQuotes}</>}
          color="border-l-orange-500"
        />
        <StatsCard label="Total Quotes" value={conversionData.totalQuotes} color="border-l-purple-500" />
        <StatsCard label="Converted" value={conversionData.convertedQuotes} color="border-l-green-500" />
        <StatsCard label="Top Amount" value={formatCurrency(conversionData.topConvertedAmount)} color="border-l-blue-500" />
      </div>

      {/* Monthly Conversion Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Conversion Trends</CardTitle>
          <CardDescription>
            Sent vs Converted quotes by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={conversionData.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
              <Bar dataKey="converted" fill="#10b981" name="Converted" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Rate by Month */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate Trend</CardTitle>
          <CardDescription>
            Monthly conversion rate percentage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversionData.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${formatPercentage(value)}%`} />
              <Line
                type="monotone"
                dataKey="conversionRate"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Conversion Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Breakdown</CardTitle>
          <CardDescription>
            Current distribution of quotes by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(conversionData.statusBreakdown).map(([status, count]) => {
              const percentage = metrics 
                ? (count / metrics.total) * 100 
                : 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="capitalize font-medium">{status}</span>
                  <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status === "converted" ? "bg-green-500" :
                        status === "sent" ? "bg-blue-500" :
                        status === "accepted" ? "bg-purple-500" :
                        status === "declined" ? "bg-red-500" :
                        status === "expired" ? "bg-yellow-500" :
                        "bg-gray-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <Button
        className="gap-2"
        size="lg"
        onClick={() => {
          const rows = (conversionData.monthlyTrends || []).map((row) => ({
            month: row.month,
            sent: row.sent,
            converted: row.converted,
            conversionRate: row.conversionRate,
          }));
          if (!rows.length) {
            toast.info("No conversion data available to export");
            return;
          }
          exportToCsv("conversion-analytics-report", rows);
          toast.success("Conversion report exported");
        }}
      >
        <FileDown className="w-4 h-4" />
        Export Conversion Report
      </Button>
    </ModuleLayout>
  );
}
