import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";

interface PerformanceMetric {
  label: string;
  value: number;
  max?: number;
  format?: (v: number) => string;
  color?: string;
}

interface PerformanceChartProps {
  title?: string;
  onTimeDeliveryRate?: number;
  qualityScore?: number;
  responsiveness?: number;
  totalOrders?: number;
  totalSpend?: number;
}

export function PerformanceChart({
  title = "Performance Metrics",
  onTimeDeliveryRate = 0,
  qualityScore = 0,
  responsiveness = 0,
  totalOrders = 0,
  totalSpend = 0,
}: PerformanceChartProps) {
  const metrics: PerformanceMetric[] = [
    {
      label: "On-Time Delivery Rate",
      value: onTimeDeliveryRate,
      max: 100,
      format: (v) => `${v.toFixed(1)}%`,
      color: "bg-green-500",
    },
    {
      label: "Quality Score",
      value: qualityScore,
      max: 5,
      format: (v) => `${v.toFixed(1)} / 5`,
      color: "bg-blue-500",
    },
    {
      label: "Responsiveness",
      value: responsiveness,
      max: 5,
      format: (v) => `${v.toFixed(1)} / 5`,
      color: "bg-purple-500",
    },
  ];

  const summary = [
    {
      label: "Total Orders",
      value: totalOrders,
      icon: "📦",
    },
    {
      label: "Total Spend",
      value: totalSpend,
      format: (v: number) => `$${(v / 100).toFixed(2)}`,
      icon: "💰",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Performance Metrics */}
        <div className="space-y-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-600">
                  {metric.label}
                </label>
                <span className="text-sm font-semibold text-gray-900">
                  {metric.format ? metric.format(metric.value) : metric.value}
                </span>
              </div>
              <Progress
                value={metric.max ? (metric.value / metric.max) * 100 : 0}
                className="h-2"
              />
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="border-t pt-6">
          <div className="grid grid-cols-2 gap-4">
            {summary.map((stat) => (
              <div key={stat.label} className="bg-gray-50 p-4 rounded-lg">
                <p className="text-2xl mb-2">{stat.icon}</p>
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {stat.format ? stat.format(stat.value) : stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
