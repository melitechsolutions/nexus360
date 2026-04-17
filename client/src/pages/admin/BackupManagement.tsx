import { useState, useRef } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  Download,
  Upload,
  AlertCircle,
  Trash2,
  Play,
  HardDrive,
  CheckCircle2,
  Clock,
  Monitor,
  RefreshCw,
  Calendar,
  FileJson,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useToast } from "@/hooks/use-toast";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function timeAgo(date: string | Date | null): string {
  if (!date) return "Never";
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 60000) return "Just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

export default function BackupManagement() {
  const { allowed, isLoading: roleLoading } = useRequireRole(["ict_manager", "super_admin", "admin"]);
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const [backupName, setBackupName] = useState("");
  const [backupScope, setBackupScope] = useState<"full" | "organization" | "tables">("full");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreTables, setRestoreTables] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scheduleName, setScheduleName] = useState("");
  const [scheduleType, setScheduleType] = useState<"full" | "incremental" | "differential">("full");
  const [scheduleCron, setScheduleCron] = useState("0 2 * * *");
  const [scheduleRetention, setScheduleRetention] = useState(30);

  const [statusFilter, setStatusFilter] = useState<string>("");

  const statsQ = trpc.sysAdmin.getBackupStats.useQuery();
  const historyQ = trpc.sysAdmin.listHistory.useQuery({ limit: 50, status: statusFilter || undefined });
  const tablesQ = trpc.sysAdmin.listTables.useQuery();
  const orgsQ = trpc.sysAdmin.listOrganizations.useQuery();
  const schedulesQ = trpc.sysAdmin.listSchedules.useQuery();

  const createBackup = trpc.sysAdmin.createBackup.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup Created", description: `${data.stats.totalRecords} records from ${data.stats.tablesBackedUp} tables (${formatBytes(data.stats.sizeBytes)})` });
      setShowCreateDialog(false);
      setBackupName("");
      setBackupScope("full");
      setSelectedTables([]);
      setSelectedOrgId("");
      statsQ.refetch();
      historyQ.refetch();
    },
    onError: (err) => {
      toast({ title: "Backup Failed", description: err.message, variant: "destructive" });
    },
  });

  const restoreBackup = trpc.sysAdmin.restoreBackup.useMutation({
    onSuccess: (data) => {
      toast({
        title: data.success ? "Restore Complete" : "Restore Completed with Errors",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      setShowRestoreDialog(false);
      setRestoreFile(null);
      setRestoreTables([]);
      historyQ.refetch();
      statsQ.refetch();
    },
    onError: (err) => {
      toast({ title: "Restore Failed", description: err.message, variant: "destructive" });
    },
  });

  const scheduleBackupMut = trpc.sysAdmin.scheduleBackup.useMutation({
    onSuccess: () => {
      toast({ title: "Schedule Created" });
      setShowScheduleDialog(false);
      setScheduleName("");
      schedulesQ.refetch();
    },
    onError: (err) => {
      toast({ title: "Schedule Failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteHistory = trpc.sysAdmin.deleteHistoryEntry.useMutation({
    onSuccess: () => { historyQ.refetch(); statsQ.refetch(); },
  });

  const deleteSchedule = trpc.sysAdmin.deleteSchedule.useMutation({
    onSuccess: () => { schedulesQ.refetch(); },
  });

  const handleCreateBackup = () => {
    if (!backupName.trim()) return;
    createBackup.mutate({
      name: backupName,
      scope: backupScope,
      organizationId: backupScope === "organization" ? selectedOrgId : undefined,
      selectedTables: backupScope === "tables" ? selectedTables : undefined,
    });
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    const text = await restoreFile.text();
    restoreBackup.mutate({
      backupData: text,
      mode: restoreMode,
      selectedTables: restoreTables.length > 0 ? restoreTables : undefined,
    });
  };

  const handleDownloadFromHistory = (entry: any) => {
    createBackup.mutate({
      name: `Re-download: ${entry.name}`,
      scope: entry.scope || "full",
    });
  };

  const toggleTable = (key: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "running": return "bg-blue-100 text-blue-800";
      case "failed": return "bg-red-100 text-red-800";
      case "completed_with_errors": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "running": return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case "failed": return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  }
  if (!allowed) return null;

  const stats = statsQ.data;
  const history = historyQ.data ?? [];
  const tables = tablesQ.data ?? [];
  const orgs = orgsQ.data ?? [];
  const schedules = schedulesQ.data ?? [];

  return (
    <ModuleLayout
      title="Backup Management"
      description="Manage database and system backups"
      icon={<Monitor className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "ICT", href: "/dashboards/ict" },
        { label: "Backups" },
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Total Backups" value={stats?.totalBackups ?? 0} description="All backup records" icon={<HardDrive className="h-5 w-5" />} color="border-l-blue-500" />
          <StatsCard label="Schedules" value={stats?.totalSchedules ?? 0} description="Active schedules" icon={<Calendar className="h-5 w-5 text-purple-500" />} color="border-l-purple-500" />
          <StatsCard label="Total Storage" value={formatBytes(stats?.totalSizeBytes ?? 0)} description="Backup storage used" icon={<HardDrive className="h-5 w-5" />} color="border-l-green-500" />
          <StatsCard label="Last Backup" value={timeAgo(stats?.lastBackup?.completedAt ?? null)} description="Most recent" icon={<Clock className="h-5 w-5" />} color="border-l-cyan-500" />
        </div>

        <Card>
          <CardHeader><CardTitle>Backup Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={() => setShowCreateDialog(true)}><Play className="w-4 h-4" /> Run Backup Now</Button>
              <Button variant="outline" className="gap-2" onClick={() => setShowScheduleDialog(true)}><Clock className="w-4 h-4" /> Schedule Backup</Button>
              <Button variant="outline" className="gap-2" onClick={() => setShowRestoreDialog(true)}><Upload className="w-4 h-4" /> Restore from File</Button>
              <Button variant="outline" className="gap-2" onClick={() => { historyQ.refetch(); statsQ.refetch(); }}><RefreshCw className="w-4 h-4" /> Refresh</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle>Backup History</CardTitle><CardDescription>Recent backup and restore operations</CardDescription></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {historyQ.isLoading ? (
              <div className="flex justify-center py-8"><Spinner className="size-6" /></div>
            ) : history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No backup history yet. Run your first backup above.</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry: any) => (
                  <div key={entry.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={getStatusColor(entry.status)}><span className="flex items-center gap-1">{getStatusIcon(entry.status)} {entry.status}</span></Badge>
                          <Badge variant="outline">{entry.backupType}</Badge>
                          <Badge variant="secondary">{entry.scope || "full"}</Badge>
                          {entry.sizeBytes > 0 && <Badge variant="secondary">{formatBytes(entry.sizeBytes)}</Badge>}
                        </div>
                        <p className="font-medium text-sm">{entry.name}</p>
                        {entry.errorMessage && <p className="text-xs text-red-600 mt-1">{entry.errorMessage}</p>}
                      </div>
                      <div className="flex gap-1">
                        {entry.status === "completed" && entry.backupType !== "restore" && (
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => handleDownloadFromHistory(entry)}><Download className="w-4 h-4" /> Re-download</Button>
                        )}
                        <Button variant="ghost" size="sm" className="gap-1 text-red-600" onClick={() => deleteHistory.mutate({ id: entry.id })}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-4 text-sm text-muted-foreground">
                      <div><p className="text-xs opacity-70">Created</p><p>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}</p></div>
                      <div><p className="text-xs opacity-70">Completed</p><p>{entry.completedAt ? new Date(entry.completedAt).toLocaleString() : "—"}</p></div>
                      <div><p className="text-xs opacity-70">Records</p><p>{entry.recordCount ?? 0}</p></div>
                      <div><p className="text-xs opacity-70">Tables</p><p>{entry.tablesList || "—"}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {schedules.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Backup Schedules</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.backupType} • {s.schedule} • Retain {s.retentionDays} days</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteSchedule.mutate({ id: s.id })}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogTitle>Create Backup</AlertDialogTitle>
          <AlertDialogDescription>Configure and run a new backup.</AlertDialogDescription>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Backup Name</Label>
              <Input value={backupName} onChange={(e) => setBackupName(e.target.value)} placeholder="Daily Backup - March 2025" />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={backupScope} onValueChange={(v: any) => setBackupScope(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Backup (all tables)</SelectItem>
                  <SelectItem value="organization">Organization-scoped</SelectItem>
                  <SelectItem value="tables">Selected tables only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {backupScope === "organization" && (
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o: any) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {backupScope === "tables" && (
              <div className="space-y-2">
                <Label>Tables</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                  {tables.map((t: any) => (
                    <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedTables.includes(t.key)} onCheckedChange={() => toggleTable(t.key, selectedTables, setSelectedTables)} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateBackup} disabled={!backupName.trim() || createBackup.isPending}>
              {createBackup.isPending ? <><Spinner className="size-4 mr-2" /> Creating...</> : <><Play className="w-4 h-4 mr-2" /> Run Backup</>}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogTitle>Restore from Backup</AlertDialogTitle>
          <AlertDialogDescription>Upload a backup JSON file to restore data. This operation cannot be undone.</AlertDialogDescription>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Backup File (.json)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                <FileJson className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                {restoreFile ? (
                  <p className="text-sm font-medium">{restoreFile.name} ({formatBytes(restoreFile.size)})</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Click to select backup file</p>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-2">
              <Label>Restore Mode</Label>
              <Select value={restoreMode} onValueChange={(v: any) => setRestoreMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge (skip duplicates)</SelectItem>
                  <SelectItem value="replace">Replace (delete existing data first)</SelectItem>
                </SelectContent>
              </Select>
              {restoreMode === "replace" && <p className="text-xs text-red-600">Warning: Replace mode will delete all existing data in restored tables before inserting.</p>}
            </div>
            <div className="space-y-2">
              <Label>Restore specific tables (optional)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                {tables.map((t: any) => (
                  <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={restoreTables.includes(t.key)} onCheckedChange={() => toggleTable(t.key, restoreTables, setRestoreTables)} />
                    {t.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to restore all tables from backup.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={!restoreFile || restoreBackup.isPending} className="bg-red-600 hover:bg-red-700">
              {restoreBackup.isPending ? <><Spinner className="size-4 mr-2" /> Restoring...</> : <><Upload className="w-4 h-4 mr-2" /> Restore</>}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogTitle>Schedule Backup</AlertDialogTitle>
          <AlertDialogDescription>Set up automatic backups on a schedule.</AlertDialogDescription>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Schedule Name</Label>
              <Input value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} placeholder="Nightly Full Backup" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="incremental">Incremental</SelectItem>
                  <SelectItem value="differential">Differential</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cron Schedule</Label>
              <Input value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} placeholder="0 2 * * *" />
              <p className="text-xs text-muted-foreground">Default: 0 2 * * * (daily at 2:00 AM)</p>
            </div>
            <div className="space-y-2">
              <Label>Retention (days)</Label>
              <Input type="number" value={scheduleRetention} onChange={(e) => setScheduleRetention(Number(e.target.value))} min={1} />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => scheduleBackupMut.mutate({ name: scheduleName, backupType: scheduleType, schedule: scheduleCron, retentionDays: scheduleRetention })} disabled={!scheduleName.trim() || scheduleBackupMut.isPending}>
              {scheduleBackupMut.isPending ? "Creating..." : "Create Schedule"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}
