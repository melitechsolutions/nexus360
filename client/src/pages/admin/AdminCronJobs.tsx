import React, { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Plus, Edit2, Trash2, Play, Pause, Eye, Zap } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";

interface CronJob {
  id: string;
  name: string;
  description?: string;
  schedule: string; // Cron expression (e.g., "0 0 * * *" = daily at midnight)
  functionName: string; // Backend function to execute
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: "idle" | "running" | "failed" | "success";
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CRON_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Daily (midnight)", value: "0 0 * * *" },
  { label: "Daily (6 AM)", value: "0 6 * * *" },
  { label: "Weekly (Monday)", value: "0 0 * * 1" },
  { label: "Monthly (1st)", value: "0 0 1 * *" },
];

const AVAILABLE_FUNCTIONS = [
  { name: "sendReminderEmails", description: "Send payment reminder emails" },
  { name: "generateMonthlyReports", description: "Generate monthly financial reports" },
  { name: "backupDatabase", description: "Create database backup" },
  { name: "cleanupLogs", description: "Clean up old audit and system logs" },
  { name: "processFailedPayments", description: "Retry failed payment processing" },
  { name: "generateInvoices", description: "Generate recurring invoices" },
  { name: "syncData", description: "Sync data with external systems" },
  { name: "archiveOldRecords", description: "Archive records older than 1 year" },
];

export default function AdminCronJobs() {
  const utils = trpc.useUtils();
  const { data: cronJobs = [], isLoading } = trpc.cronJobs.list.useQuery();
  const createMutation = trpc.cronJobs.create.useMutation({
    onSuccess: () => { utils.cronJobs.list.invalidate(); toast.success("Cron job created"); setIsOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.cronJobs.update.useMutation({
    onSuccess: () => { utils.cronJobs.list.invalidate(); toast.success("Cron job updated"); setIsOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.cronJobs.delete.useMutation({
    onSuccess: () => { utils.cronJobs.list.invalidate(); toast.success("Cron job deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.cronJobs.toggle.useMutation({
    onSuccess: () => { utils.cronJobs.list.invalidate(); toast.success("Cron job updated"); },
    onError: (e) => toast.error(e.message),
  });
  const runMutation = trpc.cronJobs.run.useMutation({
    onSuccess: (data) => { utils.cronJobs.list.invalidate(); toast.success(`Cron job "${data.name}" executed successfully`); },
    onError: (e) => toast.error(e.message),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [form, setForm] = useState<CronJob>({
    id: "",
    name: "",
    description: "",
    schedule: "0 0 * * *",
    functionName: "",
    enabled: true,
    status: "idle",
  });

  const filteredJobs = cronJobs.filter(
    (job) =>
      job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.functionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingJob(null);
    setForm({
      id: `cron-${Date.now()}`,
      name: "",
      description: "",
      schedule: "0 0 * * *",
      functionName: "",
      enabled: true,
      status: "idle",
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (job: CronJob) => {
    setEditingJob(job);
    setForm(job);
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.schedule.trim() || !form.functionName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, name: form.name, description: form.description, schedule: form.schedule, functionName: form.functionName, enabled: form.enabled });
    } else {
      createMutation.mutate({ name: form.name, description: form.description, schedule: form.schedule, functionName: form.functionName, enabled: form.enabled });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this cron job?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleEnabled = (id: string) => {
    toggleMutation.mutate(id);
  };

  const handleRunNow = (id: string) => {
    runMutation.mutate(id);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      idle: "secondary",
      running: "default",
      success: "default",
      failed: "destructive",
    };
    const labels: Record<string, string> = {
      idle: "Idle",
      running: "Running...",
      success: "Success",
      failed: "Failed",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <ModuleLayout
      title="Cron Jobs"
      description="Manage scheduled background tasks and jobs"
      icon={<Timer className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm/super-admin" },
        { label: "Administration", href: "/admin/management" },
        { label: "Cron Jobs" },
      ]}
    >
      <div className="space-y-6">
        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{cronJobs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {cronJobs.filter((j) => j.enabled).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Last 24h Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {cronJobs.filter((j) => j.lastRun && j.lastRun > new Date(Date.now() - 86400000)).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search cron jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Cron Job
          </Button>
        </div>

        {/* Cron Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Jobs</CardTitle>
            <CardDescription>
              {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No cron jobs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{job.name}</p>
                            {job.description && (
                              <p className="text-xs text-muted-foreground mt-1">{job.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{job.functionName}</TableCell>
                        <TableCell className="font-mono text-xs">{job.schedule}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell className="text-sm">
                          {job.lastRun
                            ? format(job.lastRun, "MMM dd, HH:mm")
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.nextRun
                            ? format(job.nextRun, "MMM dd, HH:mm")
                            : "Unknown"}
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={job.enabled}
                            onChange={() => handleToggleEnabled(job.id)}
                            className="cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRunNow(job.id)}
                              disabled={!job.enabled || job.status === "running"}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowLogs(showLogs === job.id ? null : job.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(job)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(job.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Cron Expression Help */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cron Expression Help</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cron expressions use 5 fields: minute, hour, day of month, month, day of week<br/>
              Format: <code className="bg-muted px-2 py-1 rounded">minute hour day month day_of_week</code>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CRON_PRESETS.map((preset) => (
                <div key={preset.value} className="text-sm">
                  <code className="bg-muted px-2 py-1 rounded font-mono">{preset.value}</code>
                  <p className="text-muted-foreground">{preset.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingJob ? "Edit Cron Job" : "Create New Cron Job"}
            </DialogTitle>
            <DialogDescription>
              {editingJob
                ? "Update the scheduled job details below"
                : "Create a new background job to run on a schedule"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Job Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Daily Email Reminders"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter a description of what this job does"
                rows={2}
              />
            </div>

            {/* Function */}
            <div className="space-y-2">
              <Label htmlFor="functionName">Function to Execute *</Label>
              <Select
                value={form.functionName}
                onValueChange={(val) => setForm((prev) => ({ ...prev, functionName: val }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a function..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {AVAILABLE_FUNCTIONS.map((fn) => (
                    <SelectItem key={fn.name} value={fn.name}>
                      {fn.name} - {fn.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label htmlFor="schedule">Cron Schedule *</Label>
              <div className="flex gap-2">
                <Input
                  id="schedule"
                  value={form.schedule}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, schedule: e.target.value }))
                  }
                  placeholder="0 0 * * * (cron format)"
                  className="flex-1"
                />
                <Select
                  onValueChange={(val) => {
                    if (val) setForm((prev) => ({ ...prev, schedule: val }));
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Use preset..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {CRON_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: minute hour day month day_of_week (0-59, 0-23, 1-31, 1-12, 0-6)
              </p>
            </div>

            {/* Enabled */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enabled: e.target.checked }))
                }
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                Enable this job
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingJob ? "Update" : "Create"} Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
