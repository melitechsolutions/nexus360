import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  Database,
  Table2,
  HardDrive,
  Activity,
  RefreshCw,
  Search,
  Server,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { Badge } from "@/components/ui/badge";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function DatabaseManagement() {
  const { allowed, isLoading: roleLoading } = useRequireRole(["ict_manager", "super_admin"]);
  const [search, setSearch] = useState("");

  const dbQ = trpc.ictManagement.getDatabaseInfo.useQuery(undefined, { refetchInterval: 30000 });
  const data = dbQ.data;

  if (roleLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  const filteredTables = (data?.tables || []).filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDataSize = (data?.tables || []).reduce((s: number, t: any) => s + (t.dataLength || 0), 0);
  const totalIndexSize = (data?.tables || []).reduce((s: number, t: any) => s + (t.indexLength || 0), 0);
  const totalRows = (data?.tables || []).reduce((s: number, t: any) => s + (t.rows || 0), 0);

  return (
    <ModuleLayout
      title="Database Management"
      description="Monitor database health, tables, and statistics"
      icon={<Database className="h-5 w-5" />}
      breadcrumbs={[{ label: "ICT", href: "/crm/ict" }, { label: "Database" }]}
    >
      <div className="space-y-6">
        {dbQ.isLoading ? (
          <div className="flex justify-center p-12"><Spinner className="size-8" /></div>
        ) : !data ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Failed to load database info</CardContent></Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <StatsCard
                label="Status"
                value={<Badge variant={data.status === "healthy" ? "default" : "destructive"}>{data.status}</Badge>}
                icon={<Activity className="h-5 w-5" />}
                color="border-l-green-500"
              />
              <StatsCard label="Tables" value={data.tables.length} icon={<Table2 className="h-5 w-5" />} color="border-l-blue-500" />
              <StatsCard label="Total Rows" value={totalRows.toLocaleString()} icon={<Database className="h-5 w-5" />} color="border-l-purple-500" />
              <StatsCard label="Data Size" value={formatBytes(totalDataSize)} icon={<HardDrive className="h-5 w-5" />} color="border-l-orange-500" />
            </div>

            {/* Server Stats */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Server Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Active Connections</span>
                      <Badge variant="outline">{data.activeConnections}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Uptime</span>
                      <Badge variant="outline">{data.uptime} hours</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Queries</span>
                      <Badge variant="outline">{data.totalQueries.toLocaleString()}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Slow Queries</span>
                      <Badge variant={data.slowQueries > 100 ? "destructive" : "outline"}>{data.slowQueries}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Data Received</span>
                      <Badge variant="outline">{formatBytes(data.bytesReceived)}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Data Sent</span>
                      <Badge variant="outline">{formatBytes(data.bytesSent)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" />Storage Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total Data Size</span>
                      <Badge variant="outline">{formatBytes(totalDataSize)}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Index Size</span>
                      <Badge variant="outline">{formatBytes(totalIndexSize)}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Combined Size</span>
                      <Badge variant="outline">{formatBytes(totalDataSize + totalIndexSize)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tables List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Database Tables</CardTitle>
                    <CardDescription>{data.tables.length} tables</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-8 w-60" placeholder="Search tables..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => dbQ.refetch()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4 font-medium">Table</th>
                        <th className="py-2 pr-4 font-medium text-right">Rows</th>
                        <th className="py-2 pr-4 font-medium text-right">Data Size</th>
                        <th className="py-2 pr-4 font-medium text-right">Index Size</th>
                        <th className="py-2 pr-4 font-medium">Engine</th>
                        <th className="py-2 font-medium">Collation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTables.map((t: any) => (
                        <tr key={t.name} className="border-b hover:bg-muted/50">
                          <td className="py-2 pr-4 font-mono text-xs">{t.name}</td>
                          <td className="py-2 pr-4 text-right">{t.rows.toLocaleString()}</td>
                          <td className="py-2 pr-4 text-right">{formatBytes(t.dataLength)}</td>
                          <td className="py-2 pr-4 text-right">{formatBytes(t.indexLength)}</td>
                          <td className="py-2 pr-4"><Badge variant="outline" className="text-xs">{t.engine}</Badge></td>
                          <td className="py-2 text-xs text-muted-foreground">{t.collation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
