import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdvancedAnalytics() {
  const [period, setPeriod] = useState("WEEKLY");

  const trendsQuery = trpc.analyticsEngine.getTrendAnalysis.useQuery({ period });
  const metricsQuery = trpc.analyticsEngine.getPerformanceMetrics.useQuery({});
  const anomalyQuery = trpc.analyticsEngine.getAnomalyInsights.useQuery({});

  const trends = trendsQuery.data ? JSON.parse(JSON.stringify(trendsQuery.data)) : null;
  const metrics = metricsQuery.data ? JSON.parse(JSON.stringify(metricsQuery.data)) : null;
  const anomalies = anomalyQuery.data ? JSON.parse(JSON.stringify(anomalyQuery.data)) : null;

  const trendPoints = trends?.trends || [];
  const anomalyList = anomalies?.anomalies || [];
  const highSeverity = anomalyList.filter((a: any) => a.severity === "HIGH" || a.severity === "CRITICAL").length;
  const medSeverity = anomalyList.filter((a: any) => a.severity === "MEDIUM").length;
  const lowSeverity = anomalyList.filter((a: any) => a.severity === "LOW").length;

  return (
    <ModuleLayout
      title="Advanced Analytics"
      icon={<BarChart3 className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Analytics" }, { label: "Advanced Analytics" }]}
    >
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DAILY">Daily</SelectItem>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">KPI Score</p>
          <p className="text-2xl font-bold">{metrics?.kpiScore ?? 0}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Benchmark Delta</p>
          <p className="text-2xl font-bold text-blue-600">{metrics?.benchmarkDelta ?? 0}%</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Forecast Accuracy</p>
          <p className="text-2xl font-bold text-green-600">{metrics?.forecastAccuracy ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Anomalies Detected</p>
          <p className="text-2xl font-bold text-red-600">{anomalyList.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Trend Analysis & Forecast</CardTitle></CardHeader>
        <CardContent>
          {trendPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" name="Actual" />
                <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeDasharray="5 5" name="Forecast" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No trend data yet</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Anomaly Detection</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>High severity:</span>
              <span className="font-bold text-red-600">{highSeverity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Medium severity:</span>
              <span className="font-bold text-yellow-600">{medSeverity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Low severity:</span>
              <span className="font-bold text-blue-600">{lowSeverity}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Response Time:</span>
              <span className="font-bold">{metrics?.avgResponseTime ?? 0}ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Throughput:</span>
              <span className="font-bold">{metrics?.throughput ?? 0}/s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Error Rate:</span>
              <span className="font-bold text-red-600">{metrics?.errorRate ?? 0}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
