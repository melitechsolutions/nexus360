/**
 * Executive Dashboard Page
 * 
 * Executive-level dashboard providing:
 * - At-a-glance summary of critical metrics
 * - Real-time alerts and warnings
 * - Customizable widget layout
 * - Executive briefing generation
 * - Strategic insights and recommendations
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart3,  AlertTriangle, TrendingUp, TrendingDown, Settings, Download, RefreshCw, Clock, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { ModuleLayout } from "@/components/ModuleLayout";

// Top Metrics Component
const MetricCard: React.FC<{
  title: string;
  value: number | string;
  currency?: boolean;
  unit?: string;
  change: number;
  target: number;
  status: 'positive' | 'negative' | 'neutral';
}> = ({ title, value, currency, unit = '', change, target, status }) => {
  const isPositive = change >= 0;
  const backgroundColor = status === 'positive' ? 'bg-green-50' : status === 'negative' ? 'bg-red-50' : 'bg-gray-50';
  const borderColor = status === 'positive' ? 'border-green-200' : status === 'negative' ? 'border-red-200' : 'border-gray-200';

  return (
    <div className={`${backgroundColor} border ${borderColor} p-4 rounded-lg`}>
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-2xl font-bold text-gray-900">
          {currency ? '$' : ''}{typeof value === 'number' ? value.toLocaleString() : value}{unit}
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-xs text-gray-600">
        Target: {currency ? '$' : ''}{target.toLocaleString()}{unit}
      </div>
    </div>
  );
};

// Alert Component
const AlertItem: React.FC<{
  alert: any;
}> = ({ alert }) => {
  const bgColor = alert.severity === 'critical' ? 'bg-red-50' : alert.severity === 'warning' ? 'bg-yellow-50' : 'bg-blue-50';
  const borderColor = alert.severity === 'critical' ? 'border-red-200' : alert.severity === 'warning' ? 'border-yellow-200' : 'border-blue-200';
  const titleColor = alert.severity === 'critical' ? 'text-red-900' : alert.severity === 'warning' ? 'text-yellow-900' : 'text-blue-900';
  const icon = alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />;

  return (
    <div className={`${bgColor} border-2 ${borderColor} p-3 rounded-lg`}>
      <div className={`flex items-start gap-2 ${titleColor} font-semibold mb-1`}>
        {icon}
        {alert.title}
      </div>
      <p className={`text-sm ${titleColor} mb-2`}>{alert.description}</p>
      {alert.suggestedAction && (
        <div className={`text-xs ${titleColor} italic`}>
          💡 {alert.suggestedAction}
        </div>
      )}
    </div>
  );
};

// Department Performance Component
const DepartmentPerformance: React.FC<{
  data: any[];
}> = ({ data }) => {
  return (
    <div className="space-y-2">
      {data.map((dept) => {
        const isOnTrack = dept.status === 'on-track';
        const isExceeding = dept.status === 'exceeding';
        const bgColor = isExceeding ? 'bg-green-50' : isOnTrack ? 'bg-gray-50' : 'bg-orange-50';
        const borderColor = isExceeding ? 'border-green-200' : isOnTrack ? 'border-gray-200' : 'border-orange-200';

        return (
          <div key={dept.dept} className={`${bgColor} p-3 rounded-lg border border-gray-200`}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-900">{dept.dept}</h4>
              <span className={`text-sm font-semibold ${isExceeding ? 'text-green-600' : isOnTrack ? 'text-gray-600' : 'text-orange-600'}`}>
                {dept.variance > 0 ? '+' : ''}{dept.variance}% vs target
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${isExceeding ? 'bg-green-500' : isOnTrack ? 'bg-gray-500' : 'bg-orange-500'}`}
                style={{ width: `${Math.min(100, (dept.revenue / dept.target) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">
              ${dept.revenue.toLocaleString()} / ${dept.target.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Main Executive Dashboard
export default function ExecutiveDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'briefing' | 'insights' | 'customize'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [compareTo, setCompareTo] = useState<'previous' | 'lastYear' | 'yearToDate'>('previous');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  // Queries
  const summaryQuery = trpc.executiveDashboard.getDashboardSummary.useQuery({ period: selectedPeriod, compareTo });
  const alertsQuery = trpc.executiveDashboard.getAlerts.useQuery({});
  const briefingQuery = trpc.executiveDashboard.getExecutiveBriefing.useQuery({});
  const insightsQuery = trpc.executiveDashboard.getStrategicInsights.useQuery({});
  const widgetsQuery = trpc.executiveDashboard.getDashboardWidgets.useQuery({});
  const exportQuery = trpc.executiveDashboard.exportDashboard.useMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      summaryQuery.refetch(),
      alertsQuery.refetch(),
      briefingQuery.refetch(),
      insightsQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const result = await exportQuery.mutateAsync({
        format: exportFormat,
        period: selectedPeriod,
        includeCharts: true,
        includeAlerts: true,
        includeInsights: true,
      });
      toast.success(`Dashboard exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (summaryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading executive dashboard...</div>
      </div>
    );
  }

  const summary = summaryQuery.data?.summary;
  const alerts = alertsQuery.data?.alerts || [];

  return (
    <ModuleLayout
      title="Executive Dashboard"
      icon={<BarChart3 className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Executive Dashboard" }]}
    >
      {/* Header with Period Selector and Export */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-gray-600 mt-1">Strategic overview and decision support</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Period and Export Controls */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:border-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Compare To</label>
            <select
              value={compareTo}
              onChange={(e) => setCompareTo(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:border-blue-500"
            >
              <option value="previous">Previous Period</option>
              <option value="lastYear">Last Year</option>
              <option value="yearToDate">Year to Date</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:border-blue-500"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 pt-8 text-xs">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {(['overview', 'briefing', 'insights', 'customize'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'briefing' && 'Executive Briefing'}
            {tab === 'insights' && 'Strategic Insights'}
            {tab === 'customize' && 'Customize'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {summary?.topMetrics.map((metric: any) => (
              <MetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                currency={metric.currency}
                unit={metric.unit || ''}
                change={metric.change}
                target={metric.target}
                status={metric.status}
              />
            ))}
          </div>

          {/* Alerts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Critical Alerts */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Critical Alerts
              </h2>
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            </div>

            {/* Alert Summary */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Critical</span>
                  <span className="font-bold text-red-600">{alertsQuery.data?.summary.critical}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Warning</span>
                  <span className="font-bold text-yellow-600">{alertsQuery.data?.summary.warning}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Info</span>
                  <span className="font-bold text-blue-600">{alertsQuery.data?.summary.info}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Department Performance & Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Performance */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Department Performance</h2>
              <DepartmentPerformance data={summary?.departmentOverview} />
            </div>

            {/* Health Heatmap */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Organization Health</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(summary?.heatMap || {}).map(([category, health]) => {
                  const bgColor = health === 'healthy' ? 'bg-green-100' : health === 'warning' ? 'bg-yellow-100' : 'bg-red-100';
                  const textColor = health === 'healthy' ? 'text-green-900' : health === 'warning' ? 'text-yellow-900' : 'text-red-900';

                  return (
                    <div key={category} className={`${bgColor} p-4 rounded-lg text-center`}>
                      <div className="text-sm font-medium text-gray-700 capitalize mb-2">{category}</div>
                      <div className={`text-lg font-bold ${textColor} capitalize`}>
                        {health === 'healthy' ? '✓ Healthy' : health === 'warning' ? '⚠ Warning' : '✗ Critical'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Executive Briefing Tab */}
      {activeTab === 'briefing' && briefingQuery.data && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{briefingQuery.data.title}</h2>
                <p className="text-gray-600 mt-1">
                  Generated {new Date(briefingQuery.data.generatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {briefingQuery.data.sections.map((section: any, idx: number) => {
                const iconColor = section.status === 'positive' ? 'text-green-600' : section.status === 'warning' ? 'text-yellow-600' : section.status === 'action' ? 'text-blue-600' : 'text-gray-600';

                return (
                  <div key={idx} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${iconColor}`}>
                      {section.status === 'positive' && '✓'}
                      {section.status === 'warning' && '⚠'}
                      {section.status === 'action' && '→'}
                      {section.title}
                    </h3>
                    <ul className="space-y-2">
                      {section.highlights.map((highlight: string, i: number) => (
                        <li key={i} className="text-gray-700 flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Strategic Insights Tab */}
      {activeTab === 'insights' && insightsQuery.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {insightsQuery.data.insights.map((insight: any, idx: number) => {
            const bgColor = insight.priority === 'high' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50';

            return (
              <div key={idx} className={`border-l-4 ${bgColor} p-6 rounded-lg`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{insight.category}</h3>
                <ul className="space-y-2">
                  {insight.items.map((item: string, i: number) => (
                    <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                      <span className="text-blue-600 mt-1">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Customize Tab */}
      {activeTab === 'customize' && widgetsQuery.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Widgets</h2>
            <div className="space-y-2">
              {widgetsQuery.data.widgets
                .filter((w: any) => w.enabled)
                .map((widget: any) => (
                  <div key={widget.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium text-gray-900">{widget.title}</span>
                    <span className="text-xs text-gray-600">{widget.type}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Widgets</h2>
            <div className="space-y-2">
              {widgetsQuery.data.availableWidgets.map((widget: any) => (
                <button
                  key={widget.id}
                  className="w-full text-left p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                >
                  <div className="font-medium text-blue-900">{widget.title}</div>
                  <div className="text-xs text-blue-700">{widget.type}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
