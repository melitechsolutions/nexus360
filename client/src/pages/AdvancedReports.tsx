import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  Download,
  Filter,
  Calendar,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, formatPercentage } from "@/utils/format";
import { StatsCard } from "@/components/ui/stats-card";
import { exportToCsv } from "@/utils/exportCsv";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdvancedReports() {
  const [selectedMetric, setSelectedMetric] = useState("quotes");
  const [dateRange, setDateRange] = useState("30days");

  // Fetch metrics
  const { data: quoteMetrics } = trpc.advancedReports.getQuoteMetrics.useQuery({});
  const { data: conversionAnalytics } = trpc.advancedReports.getConversionAnalytics.useQuery({});
  const { data: revenueForecasting } = trpc.advancedReports.getRevenueForecasting.useQuery({
    months: dateRange === "30days" ? 3 : dateRange === "90days" ? 6 : 12,
  });
  const { data: clientPerformance } = trpc.advancedReports.getClientPerformance.useQuery({});
  const { data: monthlyTrends } = trpc.advancedReports.getMonthlyTrends.useQuery({
    months: dateRange === "30days" ? 3 : dateRange === "90days" ? 6 : 12,
  });
  const { data: statusDistribution } = trpc.advancedReports.getStatusDistribution.useQuery({});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Advanced Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive insights into quotes, conversions, revenue, and performance
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Date Range</label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            const rows = (monthlyTrends || []).map((row: any) => ({
              month: row.month,
              quotes: row.quotes,
              converted: row.converted,
              value: row.value,
            }));
            if (!rows.length) {
              toast.info("No report data available to export");
              return;
            }
            exportToCsv(`advanced-reports-${dateRange}`, rows);
            toast.success("Report exported");
          }}
        >
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics Cards */}
      {quoteMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label="Total Quotes" value={quoteMetrics.total} description="All time" color="border-l-orange-500" />
          <StatsCard
            label="Sent"
            value={quoteMetrics.sent}
            description={formatPercentage((quoteMetrics.sent / quoteMetrics.total) * 100)}
            color="border-l-purple-500"
          />
          <StatsCard
            label="Converted"
            value={quoteMetrics.converted}
            description={formatPercentage((quoteMetrics.converted / quoteMetrics.total) * 100)}
            color="border-l-green-500"
          />
          <StatsCard
            label="Total Value"
            value={formatCurrency(quoteMetrics.totalValue)}
            description={<>Avg: {formatCurrency(quoteMetrics.averageValue)}</>}
            color="border-l-blue-500"
          />
        </div>
      )}

      {/* Status Distribution Pie Chart */}
      {statusDistribution && (
        <Card>
          <CardHeader>
            <CardTitle>Quote Status Distribution</CardTitle>
            <CardDescription>Current breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Draft", value: statusDistribution.distribution.draft },
                    { name: "Sent", value: statusDistribution.distribution.sent },
                    { name: "Accepted", value: statusDistribution.distribution.accepted },
                    { name: "Declined", value: statusDistribution.distribution.declined },
                    { name: "Expired", value: statusDistribution.distribution.expired },
                    { name: "Converted", value: statusDistribution.distribution.converted },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different report views */}
      <Tabs defaultValue="conversion" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        {/* Conversion Analytics Tab */}
        <TabsContent value="conversion">
          {conversionAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle>Quote to Invoice Conversion</CardTitle>
                <CardDescription>
                  Overall conversion rate: {formatPercentage(conversionAnalytics.overallConversionRate)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Conversion Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total Quotes</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {conversionAnalytics.totalQuotes}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Converted</p>
                    <p className="text-2xl font-bold text-green-600">
                      {conversionAnalytics.convertedQuotes}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatPercentage(conversionAnalytics.overallConversionRate)}%
                    </p>
                  </div>
                </div>

                {/* Monthly Trends Chart */}
                {conversionAnalytics.monthlyTrends.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-4">Monthly Conversion Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={conversionAnalytics.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
                        <Bar dataKey="converted" fill="#10b981" name="Converted" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Revenue Forecasting Tab */}
        <TabsContent value="revenue">
          {revenueForecasting && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analysis & Forecast</CardTitle>
                <CardDescription>
                  Average monthly revenue: {formatCurrency(revenueForecasting.averageMonthlyRevenue)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Revenue Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Historical Revenue</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(revenueForecasting.totalHistoricalRevenue)}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Projected Revenue</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(revenueForecasting.projectedRevenue)}
                    </p>
                  </div>
                </div>

                {/* Combined Historical + Forecast Chart */}
                {revenueForecasting.historicalData.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-4">Revenue Trends & Forecast</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart
                        data={[
                          ...revenueForecasting.historicalData,
                          ...revenueForecasting.forecastData,
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => value ? formatCurrency(value) : "-"}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#3b82f6"
                          name="Actual Revenue"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          stroke="#f59e0b"
                          strokeDasharray="5 5"
                          name="Forecasted Revenue"
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          {monthlyTrends && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Activity Trends</CardTitle>
                <CardDescription>
                  Quote creation and conversion patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyTrends.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" />
                    <Line type="monotone" dataKey="sent" stroke="#8b5cf6" name="Sent" />
                    <Line type="monotone" dataKey="converted" stroke="#10b981" name="Converted" />
                    <Line type="monotone" dataKey="declined" stroke="#ef4444" name="Declined" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          {clientPerformance && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Clients</CardTitle>
                <CardDescription>
                  By total quote value ({clientPerformance.topClients.length} shown)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {clientPerformance.topClients.map((client, idx) => (
                    <div
                      key={client.clientId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">Client {idx + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.totalQuotes} quotes • {formatPercentage(client.conversionRate)}% conversion
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(client.totalValue)}</p>
                        <p className="text-xs text-muted-foreground">
                          Avg: {formatCurrency(client.averageValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
