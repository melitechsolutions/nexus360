import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
  Server,
  RefreshCw,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function PerformanceMetrics() {
  const { allowed, isLoading: roleLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);

  const perfQ = trpc.ictManagement.getPerformanceMetrics.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const data = perfQ.data;

  if (roleLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  const statusColor = (pct: number) =>
    pct > 90 ? "text-red-600" : pct > 75 ? "text-yellow-600" : "text-green-600";

  const progressColor = (pct: number) =>
    pct > 90 ? "[&>div]:bg-red-500" : pct > 75 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500";

  return (
    <ModuleLayout
      title="Performance Metrics"
      description="Real-time system performance monitoring"
      icon={<Activity className="h-5 w-5" />}
      breadcrumbs={[{ label: "ICT", href: "/crm/ict" }, { label: "Performance" }]}
    >
      <div className="space-y-6">
        {perfQ.isLoading ? (
          <div className="flex justify-center p-12"><Spinner className="size-8" /></div>
        ) : !data ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Failed to load metrics</CardContent></Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <StatsCard
                label="CPU Load"
                value={<span className={statusColor(data.cpu.loadPercent)}>{data.cpu.loadPercent}%</span>}
                icon={<Cpu className="h-5 w-5" />}
                color="border-l-blue-500"
              />
              <StatsCard
                label="Memory Usage"
                value={<span className={statusColor(data.memory.percent)}>{data.memory.percent}%</span>}
                icon={<MemoryStick className="h-5 w-5" />}
                color="border-l-green-500"
              />
              <StatsCard
                label="Process Uptime"
                value={`${data.process.uptimeHours}h`}
                icon={<Clock className="h-5 w-5" />}
                color="border-l-purple-500"
              />
              <StatsCard
                label="System Uptime"
                value={`${data.system.uptimeHours}h`}
                icon={<Server className="h-5 w-5" />}
                color="border-l-orange-500"
              />
            </div>

            {/* CPU Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" />CPU Details</CardTitle>
                <CardDescription>{data.cpu.model} — {data.cpu.cores} cores @ {data.cpu.speed}MHz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Overall CPU Load</span>
                    <span className={statusColor(data.cpu.loadPercent)}>{data.cpu.loadPercent}%</span>
                  </div>
                  <Progress value={data.cpu.loadPercent} className={progressColor(data.cpu.loadPercent)} />
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {data.cpu.perCore.map((c) => (
                    <div key={c.core} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Core {c.core}</span>
                        <span className={statusColor(c.percent)}>{c.percent}%</span>
                      </div>
                      <Progress value={c.percent} className={`h-2 ${progressColor(c.percent)}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Memory Details */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MemoryStick className="h-5 w-5" />System Memory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>Used: {data.memory.usedGB} GB / {data.memory.totalGB} GB</span>
                      <span className={statusColor(data.memory.percent)}>{data.memory.percent}%</span>
                    </div>
                    <Progress value={data.memory.percent} className={progressColor(data.memory.percent)} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{data.memory.totalGB}</p>
                      <p className="text-xs text-muted-foreground">Total GB</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{data.memory.usedGB}</p>
                      <p className="text-xs text-muted-foreground">Used GB</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{data.memory.freeGB}</p>
                      <p className="text-xs text-muted-foreground">Free GB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" />Process Memory (Node.js)</CardTitle>
                  <CardDescription>PID {data.process.pid} — {data.process.nodeVersion}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>RSS (Resident Set)</span>
                      <Badge variant="outline">{data.process.rss} MB</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Heap Total</span>
                      <Badge variant="outline">{data.process.heapTotal} MB</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Heap Used</span>
                      <Badge variant="outline">{data.process.heapUsed} MB</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>External</span>
                      <Badge variant="outline">{data.process.external} MB</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Platform</h4>
                    <p>{data.system.type} {data.system.release}</p>
                    <p className="text-sm text-muted-foreground">{data.system.platform} / {data.system.arch}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Hostname</h4>
                    <p>{data.system.hostname}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Load Average (1/5/15 min)</h4>
                    <p>{data.system.loadAvg.map((v: number) => v.toFixed(2)).join(" / ")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Refresh */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Auto-refreshes every 10s — Last: {new Date(data.timestamp).toLocaleTimeString()}</span>
              <Button variant="outline" size="sm" onClick={() => perfQ.refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />Refresh Now
              </Button>
            </div>
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
