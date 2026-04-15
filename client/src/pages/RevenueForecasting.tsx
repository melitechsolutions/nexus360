import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/utils/format";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { exportToCsv } from "@/utils/exportCsv";

export default function RevenueForecasting() {
  const { data: forecast } = trpc.advancedReports.getRevenueForecasting.useQuery({
    months: 12,
  });

  if (!forecast) return <div>Loading...</div>;

  const combinedData = [
    ...(forecast.historicalData || []),
    ...(forecast.forecastData || []),
  ];

  return (
    <ModuleLayout
      title="Revenue Forecasting"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Finance" }, { label: "Revenue Forecasting" }]}
    >
      <div>
        <p className="text-muted-foreground mt-2">
          Historical revenue analysis and 12-month forecast
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <StatsCard
          label="Avg Monthly Revenue"
          value={formatCurrency(forecast.averageMonthlyRevenue)}
          description="Based on historical data"
          color="border-l-purple-500"
        />
        <StatsCard label="Historical Revenue" value={formatCurrency(forecast.totalHistoricalRevenue)} color="border-l-green-500" />
        <StatsCard
          label="Projected Revenue"
          value={formatCurrency(forecast.projectedRevenue)}
          description="Next 12 months"
          color="border-l-blue-500"
        />
      </div>

      {/* Revenue Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>12-Month Revenue Forecast</CardTitle>
          <CardDescription>
            Blue line shows actual revenue, orange dashed line shows forecast
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => value ? formatCurrency(value) : "-"}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorActual)"
                name="Actual Revenue"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorForecast)"
                name="Forecasted Revenue"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast Details */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Details</CardTitle>
          <CardDescription>
            Month-by-month breakdown of projections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {forecast.forecastData?.map((month) => (
              <div
                key={month.month}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="font-medium">{month.month}</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(month.forecast || 0)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Forecast Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Based on historical trends, the forecasted revenue for the next 12 months is{" "}
            <strong>{formatCurrency(forecast.projectedRevenue)}</strong>.
          </p>
          <p>
            The average monthly revenue is{" "}
            <strong>{formatCurrency(forecast.averageMonthlyRevenue)}</strong>, with seasonal
            variations accounted for in the forecast.
          </p>
          <p>
            This projection assumes continuation of current conversion rates and quote volumes.
          </p>
        </CardContent>
      </Card>

      <Button
        className="gap-2"
        size="lg"
        onClick={() => {
          const rows = combinedData.map((row: any) => ({
            month: row.month,
            actual: row.actual,
            forecast: row.forecast,
          }));
          if (!rows.length) {
            toast.info("No forecast data available to export");
            return;
          }
          exportToCsv("revenue-forecast-report", rows);
          toast.success("Forecast report downloaded");
        }}
      >
        <TrendingUp className="w-4 h-4" />
        Download Forecast Report
      </Button>
    </ModuleLayout>
  );
}
