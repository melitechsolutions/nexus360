import React, { useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Brain, TrendingUp, Filter, Lightbulb } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function AiRecommendations() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "quarter" | "year">("month");

  const dashboardQuery = trpc.aiInsights.getAiInsightsDashboard.useQuery({ period });
  const recsQuery = trpc.aiInsights.getSmartRecommendations.useQuery({ category: "general", limit: 10 });
  const modelQuery = trpc.aiInsights.getModelPerformance.useQuery({});

  const dashboard = dashboardQuery.data ? JSON.parse(JSON.stringify(dashboardQuery.data)) : null;
  const recs = recsQuery.data ? JSON.parse(JSON.stringify(recsQuery.data)) : null;
  const modelPerf = modelQuery.data ? JSON.parse(JSON.stringify(modelQuery.data)) : null;

  const insights = dashboard?.topInsights || [];
  const recommendations = recs?.recommendations || [];
  const models = modelPerf?.models || [];

  const confidenceDistribution = [
    { name: "High (≥80%)", value: insights.filter((i: any) => i.confidence >= 80).length || 0 },
    { name: "Medium (50-79%)", value: insights.filter((i: any) => i.confidence >= 50 && i.confidence < 80).length || 0 },
    { name: "Low (<50%)", value: insights.filter((i: any) => i.confidence < 50).length || 0 },
  ];

  const modelChartData = models.map((m: any) => ({ name: m.name || m.type, accuracy: m.accuracy }));

  return (
    <ModuleLayout
      title="AI Recommendations Engine"
      icon={<Brain className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "AI & Automation" }, { label: "AI Recommendations" }]}
    >
      <div className="flex justify-between items-center">
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Insights</p>
            <p className="text-2xl font-bold">{insights.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Recommendations</p>
            <p className="text-2xl font-bold">{recommendations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active Models</p>
            <p className="text-2xl font-bold">{models.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Model Health</p>
            <p className="text-2xl font-bold capitalize">{modelPerf?.overallHealth || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain size={20} /> Model Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {modelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modelChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="#3b82f6" name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No model performance data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp size={20} /> Insight Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={confidenceDistribution} cx="50%" cy="50%" outerRadius={80} label dataKey="value">
                    {confidenceDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No insights data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter size={20} /> Smart Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((rec: any) => (
                <div key={rec.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted">
                  <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"}>
                      {rec.priority}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">{rec.successProbability}% confidence</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No recommendations available — add AI insight data to see suggestions</p>
          )}
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
