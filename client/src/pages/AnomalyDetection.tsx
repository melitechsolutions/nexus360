import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Zap, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AnomalyDetection() {
  const [entityType, setEntityType] = useState("revenue");
  const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");

  const anomalyQuery = trpc.aiInsights.detectAnomalies.useQuery({ entityType, sensitivity, lookbackDays: 30 });
  const data = anomalyQuery.data ? JSON.parse(JSON.stringify(anomalyQuery.data)) : null;

  const anomalies = data?.anomalies || [];
  const stats = data?.summaryStats || { totalAnomalies: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 };

  const severityData = [
    { severity: "Critical", count: stats.criticalCount },
    { severity: "High", count: stats.highCount },
    { severity: "Medium", count: stats.mediumCount },
    { severity: "Low", count: stats.lowCount },
  ];

  return (
    <ModuleLayout
      title="Anomaly Detection"
      icon={<AlertTriangle className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Analytics" }, { label: "Anomaly Detection" }]}
    >
      <div className="flex gap-3 items-center">
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="expenses">Expenses</SelectItem>
            <SelectItem value="invoices">Invoices</SelectItem>
            <SelectItem value="clients">Clients</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sensitivity} onValueChange={(v) => setSensitivity(v as any)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        {anomalies.length > 0 && (
          <Badge variant="destructive">{anomalies.length} Anomalies Detected</Badge>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Anomalies</p>
            <p className="text-2xl font-bold">{stats.totalAnomalies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Critical</p>
            <p className="text-2xl font-bold text-red-600">{stats.criticalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">High</p>
            <p className="text-2xl font-bold text-orange-600">{stats.highCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Sensitivity</p>
            <p className="text-2xl font-bold capitalize">{sensitivity}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap size={20} /> Active Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            {anomalies.length > 0 ? (
              <div className="space-y-3">
                {anomalies.map((anom: any) => (
                  <div key={anom.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{anom.type}</p>
                        <p className="text-sm text-muted-foreground">{anom.description}</p>
                        {anom.recommendation && <p className="text-sm text-blue-600 mt-1">{anom.recommendation}</p>}
                      </div>
                      <Badge variant={anom.severity === "critical" || anom.severity === "high" ? "destructive" : "secondary"}>
                        {anom.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Confidence: {anom.confidence}%</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No anomalies detected for this period</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp size={20} /> Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
