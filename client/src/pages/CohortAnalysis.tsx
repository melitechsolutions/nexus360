import React, { useState } from "react";
import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CohortAnalysis() {
  const [cohortType, setCohortType] = useState<"SIGNUP_DATE" | "FIRST_PURCHASE" | "REGION">("SIGNUP_DATE");

  const cohortQuery = trpc.cohortAnalytics.getCohortAnalysis.useQuery({ cohortType, period: "MONTHLY" });
  const cohort = cohortQuery.data ? JSON.parse(JSON.stringify(cohortQuery.data)) : null;

  const cohorts = cohort?.cohorts || [];

  return (
    <ModuleLayout
      title="Cohort Analysis"
      icon={<Users className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Analytics" }, { label: "Cohort Analysis" }]}
    >
      <div className="flex justify-between items-center">
        <Select value={cohortType} onValueChange={(v) => setCohortType(v as any)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SIGNUP_DATE">By Signup Date</SelectItem>
            <SelectItem value="FIRST_PURCHASE">By First Purchase</SelectItem>
            <SelectItem value="REGION">By Region</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Cohorts</p>
            <p className="text-2xl font-bold">{cohorts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Overall Retention</p>
            <p className="text-2xl font-bold">{cohort?.overallRetention ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Best Performing</p>
            <p className="text-2xl font-bold">{cohort?.bestPerformingCohort || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Avg Churn Rate</p>
            <p className="text-2xl font-bold">
              {cohorts.length > 0
                ? (cohorts.reduce((s: number, c: any) => s + (c.churnRate || 0), 0) / cohorts.length).toFixed(1)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          {cohorts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Churn %</TableHead>
                    <TableHead className="text-center">Avg LTV</TableHead>
                    <TableHead className="text-center">Avg Retention Days</TableHead>
                    {(cohorts[0]?.retention || []).map((_: any, i: number) => (
                      <TableHead key={i} className="text-center">Period {i + 1}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.cohort}</TableCell>
                      <TableCell className="text-center">{row.users}</TableCell>
                      <TableCell className="text-center">{row.churnRate}%</TableCell>
                      <TableCell className="text-center">${row.avgLifetimeValue?.toLocaleString() ?? 0}</TableCell>
                      <TableCell className="text-center">{row.avgRetentionDays}</TableCell>
                      {(row.retention || []).map((val: number, i: number) => (
                        <TableCell key={i} className="text-center">{val}%</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No cohort data yet — cohort analyses will appear once data is populated</p>
          )}
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
