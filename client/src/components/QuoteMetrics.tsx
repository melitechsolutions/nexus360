import { TrendingUp, Users, DollarSign, CheckCircle } from "lucide-react";

interface QuoteMetricsData {
  totalQuotes: number;
  totalValue: number;
  acceptedCount: number;
  acceptedValue: number;
  declinedCount: number;
  averageQuoteValue: number;
  conversionRate: number;
  recentQuotes?: any[];
}

interface QuoteMetricsProps {
  data?: QuoteMetricsData;
  loading?: boolean;
}

export function QuoteMetrics({ data, loading = false }: QuoteMetricsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const defaultData: QuoteMetricsData = {
    totalQuotes: 0,
    totalValue: 0,
    acceptedCount: 0,
    acceptedValue: 0,
    declinedCount: 0,
    averageQuoteValue: 0,
    conversionRate: 0,
  };

  const metrics = data || defaultData;

  const metricCards = [
    {
      title: "Total Quotes",
      value: metrics.totalQuotes,
      icon: Users,
      color: "blue",
      change: "+5 this month",
    },
    {
      title: "Total Value",
      value: `$${metrics.totalValue.toFixed(2)}`,
      icon: DollarSign,
      color: "green",
      change: `Avg: $${metrics.averageQuoteValue.toFixed(2)}`,
    },
    {
      title: "Conversion Rate",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "purple",
      change: `${metrics.acceptedCount} accepted`,
    },
    {
      title: "Accepted Value",
      value: `$${metrics.acceptedValue.toFixed(2)}`,
      icon: CheckCircle,
      color: "emerald",
      change: `From ${metrics.acceptedCount} quotes`,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        icon: "text-blue-600 bg-blue-100",
      },
      green: {
        bg: "bg-green-50",
        text: "text-green-600",
        icon: "text-green-600 bg-green-100",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-600",
        icon: "text-purple-600 bg-purple-100",
      },
      emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        icon: "text-emerald-600 bg-emerald-100",
      },
    };

    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          const colors = getColorClasses(card.color);

          return (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colors.icon}`}>
                  <Icon size={24} />
                </div>
              </div>
              <p className="text-xs text-gray-600">{card.change}</p>
            </div>
          );
        })}
      </div>

      {/* Conversion Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Analysis</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sent vs Accepted */}
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-3">Quote Status distribution</p>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-700">Accepted</span>
                  <span className="text-sm font-semibold text-green-600">
                    {metrics.acceptedCount}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${metrics.totalQuotes > 0 ? (metrics.acceptedCount / metrics.totalQuotes) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-700">Declined</span>
                  <span className="text-sm font-semibold text-red-600">
                    {metrics.declinedCount}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{
                      width: `${metrics.totalQuotes > 0 ? (metrics.declinedCount / metrics.totalQuotes) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-700">Pending</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {metrics.totalQuotes -
                      metrics.acceptedCount -
                      metrics.declinedCount}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${metrics.totalQuotes > 0 ? ((metrics.totalQuotes - metrics.acceptedCount - metrics.declinedCount) / metrics.totalQuotes) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-3">Revenue Breakdown</p>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600">From Accepted</p>
                <p className="text-lg font-bold text-green-600">
                  ${metrics.acceptedValue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">Pending/Declined</p>
                <p className="text-lg font-bold text-gray-600">
                  ${(metrics.totalValue - metrics.acceptedValue).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-3">Key Insights</p>
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 border-l-4 border-blue-600 rounded">
                <p className="text-xs font-semibold text-blue-900">Conversion Rate</p>
                <p className="text-sm text-blue-700 mt-1">
                  {metrics.conversionRate.toFixed(1)}% of quotes accepted
                </p>
              </div>
              <div className="p-3 bg-purple-50 border-l-4 border-purple-600 rounded">
                <p className="text-xs font-semibold text-purple-900">Avg Quote Value</p>
                <p className="text-sm text-purple-700 mt-1">
                  ${metrics.averageQuoteValue.toFixed(2)} per quote
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Tip: Improve Conversion</h4>
          <p className="text-sm text-blue-800">
            Follow up on sent quotes within 3 days for better conversion rates.
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">✓ Good Practice</h4>
          <p className="text-sm text-green-800">
            Use templates for frequently quoted services to save time.
          </p>
        </div>
      </div>
    </div>
  );
}
