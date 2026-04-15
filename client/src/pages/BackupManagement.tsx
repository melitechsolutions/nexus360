import React, { useState, useRef, useCallback } from "react";
import {
  Database, Clock, HardDrive, Download, Upload, Trash2, Plus, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, FileArchive, Building2, Table2, Loader2,
} from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function timeAgo(dateStr: string | null | undefined) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    completed: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    running: { variant: "secondary", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
    pending: { variant: "outline", icon: <Clock className="h-3 w-3 mr-1" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    completed_with_errors: { variant: "secondary", icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
  };
  const cfg = map[status] || map.pending;
  return (
    <Badge variant={cfg.variant} className="flex items-center w-fit">
      {cfg.icon}{status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function BackupManagement() {
  const [activeTab, setActiveTab] = useState("create");

  // ─── Queries ───────────────────────────────────────────────
  const stats = trpc.sysAdmin.getBackupStats.useQuery(undefined, { refetchInterval: 30000 });
  const history = trpc.sysAdmin.listHistory.useQuery({ limit: 100 });
  const schedules = trpc.sysAdmin.listSchedules.useQuery();
  const tables = trpc.sysAdmin.listTables.useQuery();
  const orgs = trpc.sysAdmin.listOrganizations.useQuery();

  // ─── Mutations ─────────────────────────────────────────────
  const createBackup = trpc.sysAdmin.createBackup.useMutation();
  const restoreBackup = trpc.sysAdmin.restoreBackup.useMutation();
  const deleteEntry = trpc.sysAdmin.deleteHistoryEntry.useMutation();
  const createSchedule = trpc.sysAdmin.scheduleBackup.useMutation();
  const deleteSchedule = trpc.sysAdmin.deleteSchedule.useMutation();

  // ─── Create Backup State ──────────────────────────────────
  const [backupName, setBackupName] = useState("");
  const [backupScope, setBackupScope] = useState<"full" | "organization" | "tables">("full");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // ─── Restore State ────────────────────────────────────────
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [restoreSelectedTables, setRestoreSelectedTables] = useState<string[]>([]);
  const [restorePreview, setRestorePreview] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Schedule Dialog State ────────────────────────────────
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [schedName, setSchedName] = useState("");
  const [schedType, setSchedType] = useState<"full" | "incremental" | "differential">("full");
  const [schedCron, setSchedCron] = useState("0 2 * * 0");
  const [schedRetention, setSchedRetention] = useState(30);

  // ─── Create Backup Handler ────────────────────────────────
  const handleCreateBackup = useCallback(async () => {
    if (!backupName.trim()) { toast.error("Please enter a backup name"); return; }
    if (backupScope === "organization" && !selectedOrg) { toast.error("Please select an organization"); return; }
    if (backupScope === "tables" && selectedTables.length === 0) { toast.error("Please select at least one table"); return; }

    setCreating(true);
    try {
      const result = await createBackup.mutateAsync({
        name: backupName.trim(),
        scope: backupScope,
        organizationId: backupScope === "organization" ? selectedOrg : undefined,
        selectedTables: backupScope === "tables" ? selectedTables : undefined,
      });

      // Download backup file
      const blob = new Blob([JSON.stringify(result.backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Backup created: ${result.stats.totalRecords} records from ${result.stats.tablesBackedUp} tables`);
      setBackupName("");
      setBackupScope("full");
      setSelectedOrg("");
      setSelectedTables([]);
      history.refetch();
      stats.refetch();
    } catch (err: any) {
      toast.error(err.message || "Backup failed");
    } finally {
      setCreating(false);
    }
  }, [backupName, backupScope, selectedOrg, selectedTables, createBackup, history, stats]);

  // ─── File Upload Handler ──────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!json.metadata || !json.data) {
          toast.error("Invalid backup file format");
          setRestorePreview(null);
          return;
        }
        const tableSummary = Object.entries(json.data).map(([k, v]) => ({
          key: k,
          count: Array.isArray(v) ? v.length : 0,
        }));
        setRestorePreview({ metadata: json.metadata, tables: tableSummary, rawSize: (ev.target?.result as string).length });
        setRestoreSelectedTables(tableSummary.map((t: any) => t.key));
      } catch {
        toast.error("Could not parse backup file");
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  }, []);

  // ─── Restore Handler ─────────────────────────────────────
  const handleRestore = useCallback(async () => {
    if (!restoreFile) return;
    setRestoring(true);
    setShowRestoreConfirm(false);
    try {
      const text = await restoreFile.text();
      const result = await restoreBackup.mutateAsync({
        backupData: text,
        mode: restoreMode,
        selectedTables: restoreSelectedTables.length > 0 ? restoreSelectedTables : undefined,
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(`Restored with errors: ${result.message}`);
      }
      setRestoreFile(null);
      setRestorePreview(null);
      setRestoreSelectedTables([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      history.refetch();
    } catch (err: any) {
      toast.error(err.message || "Restore failed");
    } finally {
      setRestoring(false);
    }
  }, [restoreFile, restoreMode, restoreSelectedTables, restoreBackup, history]);

  // ─── Schedule Handler ─────────────────────────────────────
  const handleCreateSchedule = useCallback(async () => {
    if (!schedName.trim()) { toast.error("Enter a schedule name"); return; }
    try {
      await createSchedule.mutateAsync({
        name: schedName.trim(),
        backupType: schedType,
        schedule: schedCron,
        retentionDays: schedRetention,
      });
      toast.success("Schedule created");
      setShowScheduleDialog(false);
      setSchedName("");
      schedules.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create schedule");
    }
  }, [schedName, schedType, schedCron, schedRetention, createSchedule, schedules]);

  // ─── Table toggle ─────────────────────────────────────────
  const toggleTable = (key: string, list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(key) ? list.filter(t => t !== key) : [...list, key]);
  };

  return (
    <ModuleLayout
      title="Backup Management"
      description="Create, manage and restore database backups"
      icon={<Database className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Admin", href: "/admin/management" },
        { label: "Backup Management" },
      ]}
    >
      <div className="space-y-6">
        {/* ─── Stats Cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Last Backup</p>
              <p className="text-2xl font-bold">{timeAgo(stats.data?.lastBackup?.completedAt)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><FileArchive className="h-3.5 w-3.5" /> Total Backups</p>
              <p className="text-2xl font-bold">{stats.data?.totalBackups ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" /> Total Size</p>
              <p className="text-2xl font-bold">{formatBytes(Number(stats.data?.totalSizeBytes) || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Schedules</p>
              <p className="text-2xl font-bold">{stats.data?.totalSchedules ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Tabs ──────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create">Create Backup</TabsTrigger>
            <TabsTrigger value="history">Backup History</TabsTrigger>
            <TabsTrigger value="restore">Restore</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
          </TabsList>

          {/* ─── CREATE BACKUP ─────────────────────────────── */}
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Create New Backup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label htmlFor="backupName">Backup Name</Label>
                  <Input id="backupName" placeholder="e.g. Daily Full Backup" value={backupName} onChange={e => setBackupName(e.target.value)} className="mt-1" />
                </div>

                <div>
                  <Label>Scope</Label>
                  <Select value={backupScope} onValueChange={(v) => setBackupScope(v as any)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Database</SelectItem>
                      <SelectItem value="organization">Single Organization</SelectItem>
                      <SelectItem value="tables">Selected Tables</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {backupScope === "organization" && (
                  <div>
                    <Label>Organization</Label>
                    <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select organization" /></SelectTrigger>
                      <SelectContent>
                        {(orgs.data || []).map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {o.name}</div>
                          </SelectItem>
                        ))}
                        {(!orgs.data || orgs.data.length === 0) && (
                          <SelectItem value="__none" disabled>No organizations found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {backupScope === "tables" && (
                  <div>
                    <Label>Tables</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {(tables.data || []).map(t => (
                        <label key={t.key} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted transition-colors">
                          <Checkbox checked={selectedTables.includes(t.key)} onCheckedChange={() => toggleTable(t.key, selectedTables, setSelectedTables)} />
                          <span className="text-sm">{t.label}</span>
                        </label>
                      ))}
                    </div>
                    {selectedTables.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{selectedTables.length} table(s) selected</p>
                    )}
                  </div>
                )}

                <Button onClick={handleCreateBackup} disabled={creating} className="w-full sm:w-auto">
                  {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Download className="h-4 w-4 mr-2" /> Create & Download Backup</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── BACKUP HISTORY ────────────────────────────── */}
          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><FileArchive className="h-5 w-5" /> Backup History</CardTitle>
                <Button variant="outline" size="sm" onClick={() => history.refetch()}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {history.isLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : !history.data || history.data.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No backup history yet. Create your first backup above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Records</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.data.map((h: any) => (
                          <TableRow key={h.id}>
                            <TableCell className="font-medium">{h.name}</TableCell>
                            <TableCell><Badge variant="outline">{h.backupType}</Badge></TableCell>
                            <TableCell><Badge variant="secondary">{h.scope}</Badge></TableCell>
                            <TableCell>{statusBadge(h.status)}</TableCell>
                            <TableCell>{(h.recordCount || 0).toLocaleString()}</TableCell>
                            <TableCell>{formatBytes(h.sizeBytes || 0)}</TableCell>
                            <TableCell className="text-muted-foreground">{timeAgo(h.createdAt)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={async () => {
                                await deleteEntry.mutateAsync({ id: h.id });
                                toast.success("Entry deleted");
                                history.refetch();
                                stats.refetch();
                              }}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── RESTORE ───────────────────────────────────── */}
          <TabsContent value="restore">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Restore from Backup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Upload Backup File (.json)</Label>
                  <Input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="mt-1" />
                </div>

                {restorePreview && (
                  <div className="space-y-4">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-semibold">Backup Info</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Name:</span> <strong>{restorePreview.metadata.name}</strong></div>
                          <div><span className="text-muted-foreground">Scope:</span> <strong>{restorePreview.metadata.scope}</strong></div>
                          <div><span className="text-muted-foreground">Created:</span> <strong>{new Date(restorePreview.metadata.timestamp).toLocaleDateString()}</strong></div>
                          <div><span className="text-muted-foreground">Size:</span> <strong>{formatBytes(restorePreview.rawSize)}</strong></div>
                        </div>
                      </CardContent>
                    </Card>

                    <div>
                      <Label>Restore Mode</Label>
                      <Select value={restoreMode} onValueChange={(v) => setRestoreMode(v as any)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="merge">Merge — skip duplicates, add new records only</SelectItem>
                          <SelectItem value="replace">Replace — overwrite existing data (destructive)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tables to Restore ({restoreSelectedTables.length} of {restorePreview.tables.length})</Label>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {restorePreview.tables.map((t: any) => (
                          <label key={t.key} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted transition-colors">
                            <Checkbox
                              checked={restoreSelectedTables.includes(t.key)}
                              onCheckedChange={() => toggleTable(t.key, restoreSelectedTables, setRestoreSelectedTables)}
                            />
                            <span className="text-sm">{t.key} <span className="text-muted-foreground">({t.count})</span></span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {restoreMode === "replace" && (
                      <div className="p-3 border border-destructive/50 rounded-lg bg-destructive/5 flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <strong className="text-destructive">Warning:</strong> Replace mode will delete all existing data in the selected tables
                          before inserting the backup records. This operation is destructive and cannot be undone.
                        </div>
                      </div>
                    )}

                    <Button onClick={() => setShowRestoreConfirm(true)} disabled={restoring || restoreSelectedTables.length === 0}>
                      {restoring ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Restoring...</> : <><Upload className="h-4 w-4 mr-2" /> Start Restore</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── SCHEDULES ─────────────────────────────────── */}
          <TabsContent value="schedules">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Backup Schedules</CardTitle>
                <Button size="sm" onClick={() => setShowScheduleDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Schedule
                </Button>
              </CardHeader>
              <CardContent>
                {schedules.isLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : !schedules.data || schedules.data.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No backup schedules configured.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.data.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                            <span>Type: <Badge variant="outline" className="ml-1">{s.backupType}</Badge></span>
                            <span>Schedule: <code className="bg-muted px-1 rounded">{s.schedule}</code></span>
                            <span>Retention: {s.retentionDays}d</span>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            <span>Last run: {timeAgo(s.lastRun)}</span>
                            <span>Next run: {s.nextRun ? new Date(s.nextRun).toLocaleString() : "—"}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={async () => {
                          await deleteSchedule.mutateAsync({ id: s.id });
                          toast.success("Schedule deleted");
                          schedules.refetch();
                          stats.refetch();
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Restore Confirm Dialog ──────────────────────────── */}
      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Restore</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>You are about to restore data from backup <strong>{restorePreview?.metadata?.name}</strong>.</p>
            <p>Mode: <Badge variant="outline">{restoreMode}</Badge></p>
            <p>Tables: {restoreSelectedTables.length} selected</p>
            <p className="text-muted-foreground">This action cannot be easily undone. Ensure you have a current backup before proceeding.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>Cancel</Button>
            <Button onClick={handleRestore} disabled={restoring}>
              {restoring ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Restoring...</> : "Confirm Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Schedule Dialog ─────────────────────────────────── */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Backup Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Schedule Name</Label>
              <Input placeholder="e.g. Weekly Full Backup" value={schedName} onChange={e => setSchedName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Backup Type</Label>
              <Select value={schedType} onValueChange={(v) => setSchedType(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="incremental">Incremental</SelectItem>
                  <SelectItem value="differential">Differential</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cron Schedule</Label>
              <Input placeholder="0 2 * * 0" value={schedCron} onChange={e => setSchedCron(e.target.value)} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Format: minute hour day-of-month month day-of-week</p>
            </div>
            <div>
              <Label>Retention (days)</Label>
              <Input type="number" value={schedRetention} onChange={e => setSchedRetention(Number(e.target.value))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSchedule}>Create Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
