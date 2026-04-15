/**
 * KPI Tracking Page
 * 
 * Comprehensive KPI management and tracking dashboard with:
 * - Visual scorecard with traffic light status indicators
 * - KPI trend charts with target lines
 * - Threshold definition and management
 * - Alert system for off-track KPIs
 */

import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from '@/components/ModuleLayout';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Target } from 'lucide-react';

interface KPI {
  id: number;
  name: string;
  category: string;
  formula: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  frequency: string;
  owner: string;
  status: 'success' | 'warning' | 'danger';
  trend: 'up' | 'down' | 'flat';
  lastUpdated: Date;
  dataPoints: Array<{ month?: string; quarter?: string; value: number }>;
}

interface KPIDetail extends KPI {
  description: string;
  ownerId: number;
  severity: string;
  trendPercent: number;
  alertThresholds: {
    success: { min: number; max: number };
    warning: { min: number; max: number };
    danger: { min: number; max: number };
  };
  historicalData: Array<{ date: string; value: number; target: number }>;
  insights: string[];
  actionItems: string[];
}

// Status color mapping
const statusColors: Record<string, string> = {
  success: 'text-green-600 bg-green-50 border-green-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  danger: 'text-red-600 bg-red-50 border-red-200',
};

const statusBgColors: Record<string, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
};

// KPI Card Component
const KPICard: React.FC<{
  kpi: KPI;
  onSelect: (id: number) => void;
}> = ({ kpi, onSelect }) => {
  const variance = ((kpi.currentValue - kpi.targetValue) / kpi.targetValue * 100).toFixed(1);
  const isPositive = parseFloat(variance) >= 0;

  return (
    <div
      onClick={() => onSelect(kpi.id)}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${statusColors[kpi.status]}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{kpi.name}</h3>
        <div className={`w-4 h-4 rounded-full ${statusBgColors[kpi.status]}`} />
      </div>

      <div className="mb-3">
        <div className="text-2xl font-bold">{kpi.currentValue.toFixed(1)}</div>
        <div className="text-xs text-gray-600">
          Target: {kpi.targetValue} {kpi.unit}
        </div>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-600">{kpi.frequency}</span>
        <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{variance}% vs target
        </span>
      </div>

      <div className="mt-2 pt-2 border-t border-current opacity-30 text-xs">
        {kpi.owner}
      </div>
    </div>
  );
};

// Scorecard Component - traffic light view by category
const ScorecardView: React.FC<{
  categories: Array<{
    category: string;
    kpis: Array<{ id: number; name: string; value: number; target: number; status: string }>;
  }>;
}> = ({ categories }) => {
  return (
    <div className="space-y-4">
      {categories.map((cat) => (
        <div key={cat.category} className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-3 text-gray-900">{cat.category}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cat.kpis.map((kpi) => {
              const statusColor = kpi.status === 'success' ? 'green' : kpi.status === 'warning' ? 'yellow' : 'red';
              return (
                <div key={kpi.id} className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{kpi.name}</div>
                    <div className="text-xs text-gray-600">
                      {kpi.value} / {kpi.target}
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex-shrink-0 ${
                      statusColor === 'green'
                        ? 'bg-green-500'
                        : statusColor === 'yellow'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// KPI Threshold Visualization
const ThresholdVisualization: React.FC<{
  currentValue: number;
  thresholds: {
    success: { min: number; max: number };
    warning: { min: number; max: number };
    danger: { min: number; max: number };
  };
  unit: string;
}> = ({ currentValue, thresholds, unit }) => {
  const allValues = [
    thresholds.danger.min,
    thresholds.warning.min,
    thresholds.success.min,
    thresholds.success.max,
  ];
  const min = Math.min(...allValues, currentValue);
  const max = Math.max(...allValues, currentValue);

  return (
    <div className="space-y-3">
      <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
        {/* Danger zone */}
        <div
          className="absolute h-full bg-red-500 opacity-40"
          style={{
            left: '0%',
            right: `${((thresholds.danger.max - min) / (max - min)) * 100}%`,
          }}
        />
        {/* Warning zone */}
        <div
          className="absolute h-full bg-yellow-500 opacity-40"
          style={{
            left: `${((thresholds.warning.min - min) / (max - min)) * 100}%`,
            right: `${((thresholds.warning.max - min) / (max - min)) * 100}%`,
          }}
        />
        {/* Success zone */}
        <div
          className="absolute h-full bg-green-500 opacity-40"
          style={{
            left: `${((thresholds.success.min - min) / (max - min)) * 100}%`,
            right: `${((thresholds.success.max - min) / (max - min)) * 100}%`,
          }}
        />
        {/* Current value marker */}
        <div
          className="absolute top-0 h-full w-1 bg-black"
          style={{
            left: `${((currentValue - min) / (max - min)) * 100}%`,
          }}
        >
          <div className="absolute top-full mt-1 text-xs font-semibold whitespace-nowrap transform -translate-x-1/2">
            {currentValue}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
        <div>🔴 Danger: &lt;{thresholds.danger.max}</div>
        <div>🟡 Warning: {thresholds.warning.min}-{thresholds.warning.max}</div>
        <div>🟢 Success: {thresholds.success.min}-{thresholds.success.max}</div>
        <div>Current: {currentValue}{unit}</div>
      </div>
    </div>
  );
};

// Main KPI Tracking Page
export default function KPITrackingPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'scorecard' | 'detail' | 'library'>('overview');
  const [selectedKPIId, setSelectedKPIId] = useState<number>(1);
  const [newKPIMode, setNewKPIMode] = useState(false);

  // Fetch data
  const kpisQuery = trpc.kpiTracking.getKPIs.useQuery({});
  const scorecardQuery = trpc.kpiTracking.getScorecard.useQuery({});
  const detailQuery = trpc.kpiTracking.getKPIDetail.useQuery(
    { kpiId: selectedKPIId, period: 'month' },
    { enabled: activeTab === 'detail' }
  );
  const libraryQuery = trpc.kpiTracking.getKPILibrary.useQuery(
    {},
    { enabled: activeTab === 'library' }
  );

  if (kpisQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading KPI data...</div>
      </div>
    );
  }

  const kpis = kpisQuery.data?.kpis || [];
  const summary = kpisQuery.data?.summary || { totalKPIs: 0, onTarget: 0, warning: 0, danger: 0 };
  const scorecard = scorecardQuery.data?.scorecard || [];

  return (
    <ModuleLayout
      title="KPI Tracking System"
      description="Monitor and manage key performance indicators"
      icon={<Target className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "KPI Tracking" },
      ]}
    >
      <div className="p-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-3xl font-bold text-gray-900">{summary.totalKPIs}</div>
          <div className="text-sm text-gray-600">Total KPIs</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 border-green-200 bg-green-50">
          <div className="text-3xl font-bold text-green-600">{summary.onTarget}</div>
          <div className="text-sm text-green-600">On Target</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 border-yellow-200 bg-yellow-50">
          <div className="text-3xl font-bold text-yellow-600">{summary.warning}</div>
          <div className="text-sm text-yellow-600">Warning</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 border-red-200 bg-red-50">
          <div className="text-3xl font-bold text-red-600">{summary.danger}</div>
          <div className="text-sm text-red-600">Critical</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {(['overview', 'scorecard', 'detail', 'library'] as const).map((tab) => (
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
            {tab === 'scorecard' && 'Scorecard'}
            {tab === 'detail' && 'Detail'}
            {tab === 'library' && 'Library'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">All KPIs</h2>
              <button
                onClick={() => setNewKPIMode(!newKPIMode)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New KPI
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpis.map((kpi) => (
                <KPICard
                  key={kpi.id}
                  kpi={kpi}
                  onSelect={(id) => {
                    setSelectedKPIId(id);
                    setActiveTab('detail');
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scorecard Tab */}
        {activeTab === 'scorecard' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Executive Scorecard</h2>
            <ScorecardView categories={scorecard} />
          </div>
        )}

        {/* Detail Tab */}
        {activeTab === 'detail' && detailQuery.data && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{detailQuery.data.name}</h2>
              <p className="text-gray-600">{detailQuery.data.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Current Value</div>
                <div className="text-3xl font-bold text-gray-900">
                  {detailQuery.data.currentValue}
                  <span className="text-lg text-gray-500 ml-1">{detailQuery.data.unit}</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {detailQuery.data.trendPercent > 0 ? '↑' : '↓'} {Math.abs(detailQuery.data.trendPercent)}% vs prior period
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Target Value</div>
                <div className="text-3xl font-bold text-gray-900">
                  {detailQuery.data.targetValue}
                  <span className="text-lg text-gray-500 ml-1">{detailQuery.data.unit}</span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {((detailQuery.data.currentValue - detailQuery.data.targetValue) / detailQuery.data.targetValue * 100).toFixed(1)}% variance
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <div className={`text-3xl font-bold ${statusBgColors[detailQuery.data.status]} w-fit text-white px-3 py-1 rounded mt-2`}>
                  {detailQuery.data.status.charAt(0).toUpperCase() + detailQuery.data.status.slice(1)}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {detailQuery.data.severity} severity
                </div>
              </div>
            </div>

            {/* Threshold Visualization */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Alert Thresholds</h3>
              <ThresholdVisualization
                currentValue={detailQuery.data.currentValue}
                thresholds={detailQuery.data.alertThresholds}
                unit={detailQuery.data.unit}
              />
            </div>

            {/* Historical Chart */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Historical Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={detailQuery.data.historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" name="Actual" strokeWidth={2} />
                  <Line type="monotone" dataKey="target" stroke="#16a34a" name="Target" strokeWidth={2} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Insights */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">📊 Key Insights</h3>
              <ul className="space-y-2">
                {detailQuery.data.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-blue-800 flex items-start">
                    <span className="mr-2">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-900 mb-3">✓ Recommended Actions</h3>
              <ul className="space-y-2">
                {detailQuery.data.actionItems.map((item, i) => (
                  <li key={i} className="text-sm text-orange-800 flex items-start">
                    <input type="checkbox" className="mr-2 mt-1 h-4 w-4 rounded border-orange-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && libraryQuery.data && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">KPI Library</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {libraryQuery.data.library.map((template) => (
                <div key={template.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="bg-gray-50 p-2 rounded mb-3 text-xs text-gray-700 font-mono">
                    {template.formula}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    📊 Benchmark: <span className="font-semibold">{template.benchmark}</span>
                  </div>
                  <button className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </ModuleLayout>
  );
}
