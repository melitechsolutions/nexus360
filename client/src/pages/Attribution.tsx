import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { GitBranch } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AttrModel = "FIRST_TOUCH" | "LAST_TOUCH" | "LINEAR" | "TIME_DECAY" | "POSITION_BASED";

export default function Attribution() {
  const [model, setModel] = useState<AttrModel>("LINEAR");

  const attrQuery = trpc.cohortAnalytics.getAttributionModel.useQuery({ model });
  const data = attrQuery.data ? JSON.parse(JSON.stringify(attrQuery.data)) : null;

  const channels = data?.channels || [];

  return (
    <ModuleLayout
      title="Attribution Modeling"
      icon={<GitBranch className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Analytics" }, { label: "Attribution" }]}
    >
      <div className="flex gap-3 items-center">
        <Select value={model} onValueChange={(v) => setModel(v as AttrModel)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="FIRST_TOUCH">First Touch</SelectItem>
            <SelectItem value="LAST_TOUCH">Last Touch</SelectItem>
            <SelectItem value="LINEAR">Linear</SelectItem>
            <SelectItem value="TIME_DECAY">Time Decay</SelectItem>
            <SelectItem value="POSITION_BASED">Position Based</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Model Type</p>
            <p className="text-2xl font-bold">{model.replace(/_/g, " ")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Conversions</p>
            <p className="text-2xl font-bold">{data?.totalConversions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Avg Touchpoints</p>
            <p className="text-2xl font-bold">{data?.avgTouchpoints ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Cycle Time</p>
            <p className="text-2xl font-bold">{data?.cycleTime ?? 0}d</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channel Attribution</CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="credit" fill="#6366f1" name="Credit Score" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No attribution data yet — add cohort analysis data to see channel attribution</p>
          )}
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
