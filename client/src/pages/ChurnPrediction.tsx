import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ChurnPrediction() {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1).toISOString().split("T")[0];
  const endDate = today.toISOString().split("T")[0];

  const retentionQuery = trpc.cohortAnalytics.runCohortRetention.useQuery({ startDate, endDate });
  const cohortQuery = trpc.cohortAnalytics.getCohortAnalysis.useQuery({ cohortType: "SIGNUP_DATE", period: "MONTHLY" });

  const retention = retentionQuery.data ? JSON.parse(JSON.stringify(retentionQuery.data)) : null;
  const cohort = cohortQuery.data ? JSON.parse(JSON.stringify(cohortQuery.data)) : null;

  const insights = retention?.retentionInsights || {};
  const cohorts = cohort?.cohorts || [];

  // Build churn risk chart from cohort churn rates
  const churnChartData = cohorts.slice(0, 10).map((c: any) => ({
    cohort: c.cohort,
    churnRate: c.churnRate || 0,
  }));

  // Categorize cohorts by churn risk
  const highRisk = cohorts.filter((c: any) => (c.churnRate || 0) > 30);
  const medRisk = cohorts.filter((c: any) => (c.churnRate || 0) > 15 && (c.churnRate || 0) <= 30);
  const lowRisk = cohorts.filter((c: any) => (c.churnRate || 0) <= 15);

  return (
    <ModuleLayout
      title="Churn Prediction"
      icon={<TrendingDown className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Analytics" }, { label: "Churn Prediction" }]}
    >
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">High Risk Cohorts</p>
            <p className="text-2xl font-bold text-red-600">{highRisk.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Medium Risk</p>
            <p className="text-2xl font-bold text-orange-600">{medRisk.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Low Risk</p>
            <p className="text-2xl font-bold text-green-600">{lowRisk.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Cumulative Churn</p>
            <p className="text-2xl font-bold text-purple-600">{retention?.cumulativeChurn ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingDown size={20} /> Retention Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day 1 Retention</span>
              <span className="font-semibold">{insights.d1Retention ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day 7 Retention</span>
              <span className="font-semibold">{insights.d7Retention ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day 30 Retention</span>
              <span className="font-semibold">{insights.d30Retention ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day 90 Retention</span>
              <span className="font-semibold">{insights.d90Retention ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Retention Trend</span>
              <Badge variant={retention?.retentionTrend === "IMPROVING" ? "default" : retention?.retentionTrend === "DECLINING" ? "destructive" : "secondary"}>
                {retention?.retentionTrend || "STABLE"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Churn Rate by Cohort</CardTitle>
          </CardHeader>
          <CardContent>
            {churnChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={churnChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cohort" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="churnRate" fill="#ef4444" name="Churn %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No cohort churn data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users size={20} /> High-Risk Cohorts</CardTitle>
        </CardHeader>
        <CardContent>
          {highRisk.length > 0 ? (
            <div className="space-y-2">
              {highRisk.map((coh: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{coh.cohort}</p>
                    <p className="text-sm text-muted-foreground">{coh.users} users | LTV: ${(coh.avgLifetimeValue || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{coh.churnRate}%</p>
                    <p className="text-xs text-muted-foreground">Avg Retention: {coh.avgRetentionDays}d</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No high-risk cohorts detected — churn data will populate once cohort analyses are available</p>
          )}
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
