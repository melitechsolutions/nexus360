import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Calendar } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/utils/format";
import { StatsCard } from "@/components/ui/stats-card";

export default function MonthlyTrends() {
  const [months, setMonths] = useState("12");
  const { data: trends } = trpc.advancedReports.getMonthlyTrends.useQuery({
    months: parseInt(months),
  });

  if (!trends) return <div>Loading...</div>;

  const chartData = trends.trends || [];

  // Calculate summary stats
  const totalCreated = chartData.reduce((sum, m) => sum + m.created, 0);
  const totalSent = chartData.reduce((sum, m) => sum + m.sent, 0);
  const totalConverted = chartData.reduce((sum, m) => sum + m.converted, 0);
  const totalRevenue = chartData.reduce((sum, m) => sum + (m.revenue || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monthly Trends</h1>
        <p className="text-muted-foreground mt-2">
          Track quote activity and revenue trends over time
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {chartData.length} months displayed
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          label="Quotes Created"
          value={totalCreated}
          description={<>Avg: {(totalCreated / chartData.length).toFixed(1)}/month</>}
          color="border-l-orange-500"
        />
        <StatsCard
          label="Quotes Sent"
          value={totalSent}
          description={<>Avg: {(totalSent / chartData.length).toFixed(1)}/month</>}
          color="border-l-purple-500"
        />
        <StatsCard
          label="Quotes Converted"
          value={totalConverted}
          description={<>Avg: {(totalConverted / chartData.length).toFixed(1)}/month</>}
          color="border-l-green-500"
        />
        <StatsCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          description={<>Avg: {formatCurrency(totalRevenue / chartData.length)}/month</>}
          color="border-l-blue-500"
        />
      </div>

      {/* Activity Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Trends</CardTitle>
          <CardDescription>
            Quote creation, sending, and conversion activity over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="created"
                fill="#93c5fd"
                name="Created"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="sent"
                fill="#60a5fa"
                name="Sent"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="converted"
                fill="#10b981"
                name="Converted"
                radius={[8, 8, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#a855f7"
                strokeWidth={2}
                name="Revenue ($)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Conversion Funnel</CardTitle>
          <CardDescription>
            Percentage of quotes that progress through each stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: "Percentage (%)", angle: -90, position: "insideLeft" }} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}%` : value}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={(d) => {
                  return d.sent > 0 ? (d.converted / d.sent) * 100 : 0;
                }}
                stroke="#06b6d4"
                strokeWidth={2}
                name="Sent → Converted %"
                dot={{ fill: "#06b6d4", r: 4 }}
              />
              <Line
                type="monotone"
                dataKey={(d) => {
                  return d.created > 0 ? (d.sent / d.created) * 100 : 0;
                }}
                stroke="#f59e0b"
                strokeWidth={2}
                name="Created → Sent %"
                dot={{ fill: "#f59e0b", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Declined Quotes Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Declined Quotes Trend</CardTitle>
          <CardDescription>
            Monitor declined quotes to identify patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="declined"
                fill="#ef4444"
                name="Declined"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Monthly Breakdown</CardTitle>
          <CardDescription>
            Complete statistics for each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chartData.map((month) => (
              <div
                key={month.month}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-lg">{month.month}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {month.created} | Sent: {month.sent} | Converted: {month.converted} | Declined: {month.declined}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-purple-600">
                    {formatCurrency(month.revenue || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {month.sent > 0 ? `${((month.converted / month.sent) * 100).toFixed(1)}% converted` : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <button className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">
        <TrendingUp className="w-4 h-4" />
        Export Trend Report
      </button>
    </div>
  );
}
