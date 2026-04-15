import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';
import { Zap, TrendingUp, AlertTriangle, Brain } from 'lucide-react';

/**
 * AI & Intelligent Insights Page (Phase 5.1)
 * 
 * Dashboard for AI-powered insights including:
 * - Top insights and predictions
 * - Predictive analytics
 * - Smart recommendations
 * - Anomaly detection
 * - ML model performance
 */

export function AIInsights() {
  const { data: dashboard } = useQuery({
    queryKey: ['aiInsights'],
    queryFn: async () => {
      const result = await trpc.aiInsights.getAiInsightsDashboard.query();
      return result;
    },
  });

  const { data: predictions } = useQuery({
    queryKey: ['predictiveAnalytics'],
    queryFn: async () => {
      const result = await trpc.aiInsights.getPredictiveAnalytics.query();
      return result;
    },
  });

  const { data: recommendations } = useQuery({
    queryKey: ['smartRecommendations'],
    queryFn: async () => {
      const result = await trpc.aiInsights.getSmartRecommendations.query();
      return result;
    },
  });

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Brain className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-slate-900">AI & Intelligent Insights</h1>
        </div>

        {/* Top Insights Grid */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {dashboard.topInsights.map((insight, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition">
                <h3 className="font-semibold text-slate-900 mb-2">{insight.insight}</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-purple-600">{(insight.confidence * 100).toFixed(0)}%</span>
                  <span className="text-sm text-slate-500">confidence</span>
                </div>
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                  insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {insight.impact} impact
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Predictive Analytics */}
        {predictions && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-900">Revenue Forecast (Next 4 Quarters)</h2>
            </div>
            <div className="space-y-3">
              {predictions.forecasts.map((forecast, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <div>
                    <p className="font-medium text-slate-900">{forecast.period}</p>
                    <p className="text-sm text-slate-500">Forecast: ${forecast.predicted.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Range: ${forecast.lower.toLocaleString()} - ${forecast.upper.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">95% confidence</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Smart Recommendations */}
        {recommendations && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-slate-900">Smart Recommendations</h2>
            </div>
            <div className="space-y-4">
              {recommendations.recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:border-amber-300 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-900">{rec.title}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{rec.description}</p>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Success: {(rec.successProbability * 100).toFixed(0)}%</span>
                    <span>Est. time: {rec.implementationWeeks} weeks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
