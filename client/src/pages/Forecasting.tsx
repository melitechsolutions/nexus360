/**
 * Forecasting Page
 * 
 * Comprehensive forecasting and what-if analysis tool with:
 * - Revenue, expense, and cash flow forecasting
 * - Scenario analysis (base/conservative/optimistic)
 * - What-if analysis with sensitivity testing
 * - Forecast accuracy tracking and model diagnostics
 */

import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from '@/components/ModuleLayout';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Info, LineChart as LineChartIcon } from 'lucide-react';

type MetricType = 'revenue' | 'profit' | 'cash_flow';

// Confidence interval visualization component
const ConfidenceInterval: React.FC<{
  data: Array<{ month: string; forecast: number; lower: number; upper: number }>;
  title: string;
}> = ({ data, title }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }}
            formatter={(value: any) => `$${value.toLocaleString()}`}
          />
          <Area
            type="monotone"
            dataKey="upper"
            stroke="#3b82f6"
            fill="none"
            strokeDasharray="5 5"
            name="Upper bound"
          />
          <Area
            type="monotone"
            dataKey="forecast"
            stroke="#2563eb"
            fill="url(#colorConf)"
            strokeWidth={2}
            name="Forecast"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="#3b82f6"
            fill="none"
            strokeDasharray="5 5"
            name="Lower bound"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Scenario comparison component
const ScenarioComparison: React.FC<{
  scenarios: Array<{
    scenario: string;
    probability: number;
    expectedValue: number;
  }>;
}> = ({ scenarios }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">Scenario Analysis</h3>
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <div key={scenario.scenario} className="flex items-start gap-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{scenario.scenario}</h4>
              <div className="text-sm text-gray-600 mt-1">
                Probability: {scenario.probability}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                ${scenario.expectedValue.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Expected Value</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// What-If Scenario Builder
const WhatIfBuilder: React.FC<{
  onAnalyze: (params: Record<string, number>) => void;
}> = ({ onAnalyze }) => {
  const [revenueGrowth, setRevenueGrowth] = useState(10);
  const [costIncrease, setCostIncrease] = useState(5);
  const [marginImprovement, setMarginImprovement] = useState(0);

  const handleAnalyze = () => {
    onAnalyze({
      revenue_growth_percent: revenueGrowth,
      cost_increase_percent: costIncrease,
      margin_improvement_percent: marginImprovement,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4">What-If Analysis</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Revenue Growth: {revenueGrowth}%
          </label>
          <input
            type="range"
            min="-30"
            max="30"
            value={revenueGrowth}
            onChange={(e) => setRevenueGrowth(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cost Increase: {costIncrease}%
          </label>
          <input
            type="range"
            min="-20"
            max="20"
            value={costIncrease}
            onChange={(e) => setCostIncrease(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Margin Improvement: {marginImprovement}%
          </label>
          <input
            type="range"
            min="-10"
            max="20"
            value={marginImprovement}
            onChange={(e) => setMarginImprovement(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={handleAnalyze}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Run Analysis
        </button>
      </div>
    </div>
  );
};

// Main Forecasting Page
export default function ForecastingPage() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'expense' | 'cashflow' | 'scenario' | 'whatif' | 'accuracy'>('revenue');
  const [selectedScenario, setSelectedScenario] = useState<'conservative' | 'base' | 'optimistic'>('base');
  const [whatIfResult, setWhatIfResult] = useState<any>(null);

  // Queries — always fetch revenue & accuracy for Quick Stats cards
  const revenueQuery = trpc.forecasting.getRevenueForecast.useQuery(
    { scenario: selectedScenario },
  );

  const expenseQuery = trpc.forecasting.getExpenseForecast.useQuery(
    {},
  );

  const cashFlowQuery = trpc.forecasting.getCashFlowForecast.useQuery(
    {},
    { enabled: activeTab === 'cashflow' }
  );

  const scenarioQuery = trpc.forecasting.getScenarioAnalysis.useQuery(
    { metric: 'revenue' },
    { enabled: activeTab === 'scenario' }
  );

  const accuracyQuery = trpc.forecasting.getForecastAccuracy.useQuery(
    {},
  );

  const whatIfMutation = trpc.forecasting.getWhatIfAnalysis.useMutation({
    onSuccess: (data) => setWhatIfResult(data),
  });

  const handleWhatIf = (params: Record<string, number>) => {
    whatIfMutation.mutate({
      scenario: 'Custom What-If',
      parameters: params,
    });
  };

  if (revenueQuery.isLoading && activeTab === 'revenue') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading forecast data...</div>
      </div>
    );
  }

  return (
    <ModuleLayout
      title="Predictive Forecasting"
      description="Advanced forecasting, scenario analysis, and what-if planning"
      icon={<LineChartIcon className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Forecasting" },
      ]}
    >
      <div className="p-6">

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Revenue (Next Month)</div>
          <div className="text-2xl font-bold text-gray-900">
            {revenueQuery.data?.forecasts?.[0]
              ? `$${(revenueQuery.data.forecasts[0].forecast / 1000).toFixed(0)}K`
              : '—'}
          </div>
          <div className="text-xs text-green-600 mt-1">
            {revenueQuery.data?.summary?.trend === 'up' ? '↑' : '↓'} {revenueQuery.data?.scenario || 'base'} scenario
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Expense Forecast</div>
          <div className="text-2xl font-bold text-gray-900">
            {expenseQuery.data?.forecasts?.[0]
              ? `$${(expenseQuery.data.forecasts[0].forecast / 1000).toFixed(0)}K`
              : '—'}
          </div>
          <div className="text-xs text-orange-600 mt-1">
            {expenseQuery.data?.category || 'All categories'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Forecast Accuracy</div>
          <div className="text-2xl font-bold text-green-600">
            {accuracyQuery.data ? `${accuracyQuery.data.overallAccuracy}%` : '—'}
          </div>
          <div className="text-xs text-gray-600 mt-1">6-month average</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Model Quality</div>
          <div className="text-2xl font-bold text-gray-900">
            {accuracyQuery.data?.modelQuality || '—'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {revenueQuery.data?.summary?.rSquared != null
              ? `R² = ${revenueQuery.data.summary.rSquared.toFixed(2)}`
              : ''}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 flex-wrap">
        {(['revenue', 'expense', 'cashflow', 'scenario', 'whatif', 'accuracy'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'revenue' && 'Revenue Forecast'}
            {tab === 'expense' && 'Expense Forecast'}
            {tab === 'cashflow' && 'Cash Flow'}
            {tab === 'scenario' && 'Scenarios'}
            {tab === 'whatif' && 'What-If'}
            {tab === 'accuracy' && 'Accuracy'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Revenue Forecast */}
        {activeTab === 'revenue' && revenueQuery.data && (
          <div className="space-y-6">
            {/* Scenario Selector */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Select Scenario</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['conservative', 'base', 'optimistic'] as const).map((scenario) => (
                  <button
                    key={scenario}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedScenario === scenario
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {scenario.charAt(0).toUpperCase() + scenario.slice(1)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {scenario === 'conservative' && 'Cautious estimate'}
                      {scenario === 'base' && 'Expected trend'}
                      {scenario === 'optimistic' && 'Growth scenario'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Revenue Forecast Chart */}
            <ConfidenceInterval 
              data={revenueQuery.data.forecasts}
              title="12-Month Revenue Forecast with Confidence Intervals"
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Average Monthly Forecast</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${revenueQuery.data.summary.avgForecast.toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Range</div>
                <div className="text-lg font-bold text-gray-900">
                  ${revenueQuery.data.summary.rangeLow.toLocaleString()} - ${revenueQuery.data.summary.rangeHigh.toLocaleString()}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Model Fitness (R²)</div>
                <div className="text-2xl font-bold text-green-600">
                  {(revenueQuery.data.summary.rSquared * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expense Forecast */}
        {activeTab === 'expense' && expenseQuery.data && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">12-Month Expense Forecast</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseQuery.data.forecasts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="forecast" fill="#f59e0b" name="Forecast" />
                  <Bar dataKey="variance" fill="#ef4444" name="Variance" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Insights */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Insights
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                {expenseQuery.data.insights.map((insight: string, i: number) => (
                  <li key={i}>• {insight}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Cash Flow Forecast */}
        {activeTab === 'cashflow' && cashFlowQuery.data && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">12-Month Cash Flow Forecast</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={cashFlowQuery.data.forecasts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar yAxisId="left" dataKey="inflow" fill="#10b981" name="Cash Inflow" />
                <Bar yAxisId="left" dataKey="outflow" fill="#ef4444" name="Cash Outflow" />
                <Line yAxisId="right" type="monotone" dataKey="cumulativeBalance" stroke="#3b82f6" name="Cumulative Balance" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Scenario Analysis */}
        {activeTab === 'scenario' && scenarioQuery.data && (
          <ScenarioComparison scenarios={scenarioQuery.data.scenarios} />
        )}

        {/* What-If Analysis */}
        {activeTab === 'whatif' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WhatIfBuilder onAnalyze={handleWhatIf} />

            {whatIfResult && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Analysis Results</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-600">Base Revenue</div>
                      <div className="text-lg font-bold text-gray-900">
                        ${whatIfResult.baseCase.revenue.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-600">Adjusted Revenue</div>
                      <div className="text-lg font-bold text-gray-900">
                        ${whatIfResult.adjusted.revenue.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-600">Base Profit</div>
                      <div className="text-lg font-bold text-gray-900">
                        ${whatIfResult.baseCase.profit.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-600">Adjusted Profit</div>
                      <div className={`text-lg font-bold ${whatIfResult.adjusted.profit > whatIfResult.baseCase.profit ? 'text-green-600' : 'text-red-600'}`}>
                        ${whatIfResult.adjusted.profit.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <div className="font-medium text-blue-900 mb-2">Impact Summary</div>
                    <div className={`text-2xl font-bold ${whatIfResult.summary.profitChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {whatIfResult.summary.profitChange > 0 ? '+' : ''}{whatIfResult.summary.profitChange.toLocaleString()}
                      <span className="text-lg ml-2">({whatIfResult.summary.profitChangePercent}%)</span>
                    </div>
                  </div>

                  {whatIfResult.impacts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Impact Breakdown</h4>
                      <div className="space-y-2">
                        {whatIfResult.impacts.map((impact: any, i: number) => (
                          <div key={i} className="text-sm text-gray-700">
                            • {impact.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accuracy Dashboard */}
        {activeTab === 'accuracy' && accuracyQuery.data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Overall Accuracy</div>
                <div className="text-3xl font-bold text-green-600">{accuracyQuery.data.overallAccuracy}%</div>
                <div className="text-xs text-gray-600 mt-2">6-month average</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Model Quality</div>
                <div className="text-xl font-bold text-gray-900">{accuracyQuery.data.modelQuality}</div>
                <div className="text-xs text-gray-600 mt-2">Based on bias and variance</div>
              </div>
            </div>

            {/* Metric Accuracy */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Metric Accuracy</h3>
              <div className="space-y-3">
                {accuracyQuery.data.metrics.map((metric: any) => (
                  <div key={metric.metric} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{metric.metric}</div>
                      <div className="text-xs text-gray-600">MAPE: {metric.mape}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{metric.accuracy}%</div>
                      <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${metric.accuracy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Recommendations
              </h3>
              <ul className="space-y-1 text-sm text-green-800">
                {accuracyQuery.data.recommendations.map((rec: string, i: number) => (
                  <li key={i}>• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      </div>
    </ModuleLayout>
  );
}
