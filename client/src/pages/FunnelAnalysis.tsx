import React, { useState } from "react";
import { Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FunnelAnalysis() {
  const [funnelId, setFunnelId] = useState("sales");

  const funnelQuery = trpc.cohortAnalytics.analyzeFunnels.useQuery({ funnelId, timeRange: "30d" });
  const data = funnelQuery.data ? JSON.parse(JSON.stringify(funnelQuery.data)) : null;

  const steps = data?.steps || [];
  const maxUsers = steps.length > 0 ? Math.max(...steps.map((s: any) => s.users || 0), 1) : 1;

  return (
    <ModuleLayout
      title="Funnel Analysis"
      icon={<Filter className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Analytics" }, { label: "Funnel Analysis" }]}
    >
      <div className="flex gap-3 items-center">
        <Select value={funnelId} onValueChange={setFunnelId}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales Funnel</SelectItem>
            <SelectItem value="onboarding">Onboarding Funnel</SelectItem>
            <SelectItem value="trial">Trial Conversion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Funnel</p>
            <p className="text-2xl font-bold">{data?.funnelName || funnelId}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-bold">{data?.overallConversionRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Biggest Drop</p>
            <p className="text-2xl font-bold">{data?.biggestDropoff?.step || "—"}</p>
            <p className="text-xs text-muted-foreground">{data?.biggestDropoff?.percentage ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Avg Step Time</p>
            <p className="text-2xl font-bold">{data?.avgTimePerStep ?? 0}s</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funnel Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length > 0 ? (
            <div className="space-y-3">
              {steps.map((step: any, idx: number) => {
                const width = ((step.users || 0) / maxUsers) * 100;
                const convRate = maxUsers > 0 ? (((step.users || 0) / maxUsers) * 100).toFixed(1) : "0";
                return (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{step.name || `Step ${idx + 1}`}</span>
                      <span className="text-sm text-muted-foreground">{(step.users || 0).toLocaleString()} users ({convRate}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded h-8">
                      <div
                        className="h-8 rounded bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(width, 2)}%` }}
                      >
                        {width > 15 && <span className="text-white text-xs font-bold">{convRate}%</span>}
                      </div>
                    </div>
                    {step.dropoff > 0 && (
                      <p className="text-sm text-red-600 mt-1">↓ {step.dropoff.toLocaleString()} dropped off</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No funnel data yet — configure funnels to see step-by-step analysis</p>
          )}
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
