import React, { useState } from "react";
import { FileText, Download, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useUserLookup } from "@/hooks/useUserLookup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";

export default function AuditLogs() {
  const { getUserName } = useUserLookup();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: rawData, isLoading } = trpc.activityTrail.list.useQuery({
    limit: 100,
    search: search || undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
  });
  const { data: rawStats } = trpc.activityTrail.getStats.useQuery();
  const { data: actions = [] } = trpc.activityTrail.getActions.useQuery();

  const rawLogs = Array.isArray(rawData) ? rawData : (rawData as any)?.activities || [];
  const logs: any[] = JSON.parse(JSON.stringify(rawLogs));
  const statsObj = rawStats as any;
  const stats: any[] = statsObj?.actions || (Array.isArray(rawStats) ? rawStats : []);

  const totalEvents = statsObj?.totalActivities ?? logs.length;
  const topAction = stats.length > 0 ? `${stats[0]?.action}: ${stats[0]?.count}` : "N/A";

  return (
    <ModuleLayout
      title="Audit Logs"
      description="Track all system activity and user actions"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Administration", href: "/admin" },
        { label: "Audit Logs" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard label="Total Events" value={totalEvents} description="Loaded" color="border-l-blue-500" />
          <StatsCard label="Top Action" value={topAction} description="Most frequent" color="border-l-purple-500" />
          <StatsCard label="Tracked Actions" value={actions.length} description="Event types" color="border-l-green-500" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((a: string) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log: any, i: number) => (
                        <TableRow key={log.id || i}>
                          <TableCell className="text-sm">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.entityType || "—"}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{log.description || "—"}</TableCell>
                          <TableCell className="text-sm">{getUserName(log.userId) || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
