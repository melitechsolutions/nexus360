import { useState } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Download,
  Filter,
  Search,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/ui/stats-card";
import { exportToCsv } from "@/utils/exportCsv";

export default function SystemLogsViewer() {
  const { allowed, isLoading: roleLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntityType, setFilterEntityType] = useState("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 30;

  const logsQ = trpc.activityTrail.list.useQuery({
    page,
    limit,
    search: searchTerm || undefined,
    action: filterAction !== "all" ? filterAction : undefined,
    entityType: filterEntityType !== "all" ? filterEntityType : undefined,
  });

  const statsQ = trpc.activityTrail.getStats.useQuery();
  const entityTypesQ = trpc.activityTrail.getEntityTypes.useQuery();
  const actionsQ = trpc.activityTrail.getActions.useQuery();

  const logs = logsQ.data?.activities ?? [];
  const total = logsQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const entityTypes = entityTypesQ.data ?? [];
  const actions = actionsQ.data ?? [];
  const stats = statsQ.data;

  const getLevelColor = (action: string) => {
    const a = action?.toLowerCase() || "";
    if (a.includes("delete") || a.includes("fail") || a.includes("error")) return "bg-red-100 text-red-800";
    if (a.includes("warn") || a.includes("reject")) return "bg-yellow-100 text-yellow-800";
    if (a.includes("creat") || a.includes("approv") || a.includes("login")) return "bg-green-100 text-green-800";
    return "bg-blue-100 text-blue-800";
  };

  const handleExport = () => {
    if (!logs.length) return;
    exportToCsv(logs.map((l: any) => ({
      Date: l.createdAt ? new Date(l.createdAt).toLocaleString() : "",
      Action: l.action,
      Entity: l.entityType,
      Description: l.description,
      User: l.userId,
    })), "system-logs");
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  }
  if (!allowed) return null;

  return (
    <ModuleLayout
      title="System Logs"
      description="View and audit system activity and events"
      icon={<Monitor className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "ICT", href: "/dashboards/ict" },
        { label: "System Logs" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Total Activities" value={stats?.totalActivities ?? 0} description="All logged events" icon={<Clock className="h-5 w-5" />} color="border-l-blue-500" />
          <StatsCard label="Unique Users" value={stats?.uniqueUsers ?? 0} description="Active users" icon={<Monitor className="h-5 w-5" />} color="border-l-green-500" />
          <StatsCard label="Entity Types" value={entityTypes.length} description="Categories tracked" icon={<Filter className="h-5 w-5" />} color="border-l-purple-500" />
          <StatsCard label="Action Types" value={actions.length} description="Distinct actions" icon={<AlertCircle className="h-5 w-5" />} color="border-l-cyan-500" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input placeholder="Search logs..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="pl-9" />
              </div>
              <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterEntityType} onValueChange={(v) => { setFilterEntityType(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All entities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entity Types</SelectItem>
                  {entityTypes.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>Showing {logs.length} of {total} logs (page {page}/{totalPages})</CardDescription>
          </CardHeader>
          <CardContent>
            {logsQ.isLoading ? (
              <div className="flex justify-center py-8"><Spinner className="size-6" /></div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No logs matching your criteria</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedLogId(expandedLogId === String(log.id) ? null : String(log.id))}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className={getLevelColor(log.action)}>{log.action}</Badge>
                          <span className="text-sm text-muted-foreground">{log.entityType}</span>
                          <span className="text-xs text-muted-foreground">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</span>
                        </div>
                        <p className="text-sm">{log.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>User ID: {log.userId}</span>
                          {log.entityId && <span>Entity: {log.entityId}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm"><ChevronDown className={`w-4 h-4 transition-transform ${expandedLogId === String(log.id) ? "rotate-180" : ""}`} /></Button>
                    </div>
                    {expandedLogId === String(log.id) && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="bg-muted rounded p-3 text-sm font-mono break-words">
                          <p><strong>ID:</strong> {log.id}</p>
                          <p><strong>Action:</strong> {log.action}</p>
                          <p><strong>Entity Type:</strong> {log.entityType}</p>
                          <p><strong>Entity ID:</strong> {log.entityId}</p>
                          <p><strong>Description:</strong> {log.description}</p>
                          <p><strong>Created:</strong> {log.createdAt ? new Date(log.createdAt).toISOString() : ""}</p>
                          {log.metadata && <p><strong>Metadata:</strong> {typeof log.metadata === "string" ? log.metadata : JSON.stringify(log.metadata)}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4 mr-1" /> Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
