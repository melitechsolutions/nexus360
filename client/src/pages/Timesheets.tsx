import { useState, useMemo } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Plus,
  Filter,
  Search,
  DollarSign,
  TimerOff,
  Eye,
  Edit,
  Trash2,
  Download,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { downloadCSV } from "@/lib/export-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { trpc } from "@/lib/trpc";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  invoiced: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function Timesheets() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: rawEntries = [], isLoading } = trpc.timeEntries.list.useQuery({});
  const entries = JSON.parse(JSON.stringify(rawEntries));
  const { data: rawProjects = [] } = trpc.projects.list.useQuery();
  const projectsList = JSON.parse(JSON.stringify(rawProjects));
  const { data: rawEmployees = [] } = trpc.employees.list.useQuery();
  const employeesList = JSON.parse(JSON.stringify(rawEmployees));

  const projectMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of projectsList) m[p.id] = p.name;
    return m;
  }, [projectsList]);

  const userMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of employeesList) m[e.id] = `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email;
    return m;
  }, [employeesList]);

  const createMutation = trpc.timeEntries.create.useMutation({
    onSuccess: () => { utils.timeEntries.list.invalidate(); setDialogOpen(false); toast.success("Timesheet entry created"); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.timeEntries.delete.useMutation({
    onSuccess: () => { utils.timeEntries.list.invalidate(); toast.success("Entry deleted"); },
    onError: (err) => toast.error(err.message),
  });
  const submitMutation = trpc.timeEntries.submit.useMutation({
    onSuccess: () => { utils.timeEntries.list.invalidate(); toast.success("Entry submitted"); },
    onError: (err) => toast.error(err.message),
  });
  const approveMutation = trpc.timeEntries.approve.useMutation({
    onSuccess: () => { utils.timeEntries.list.invalidate(); toast.success("Entry approved"); },
    onError: (err) => toast.error(err.message),
  });

  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [billableFilter, setBillableFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  const tsColumns: ColumnConfig[] = [
    { key: "project", label: "Project" },
    { key: "task", label: "Task" },
    { key: "teamMember", label: "Team Member" },
    { key: "date", label: "Date" },
    { key: "hours", label: "Hours" },
    { key: "billable", label: "Billable" },
    { key: "status", label: "Status" },
  ];
  const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(tsColumns);

  // Form state
  const [formProject, setFormProject] = useState("");
  const [formTask, setFormTask] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formHours, setFormHours] = useState("1");
  const [formDescription, setFormDescription] = useState("");
  const [formBillable, setFormBillable] = useState(true);
  const [formNotes, setFormNotes] = useState("");

  // Unique team members from actual data for filter dropdown
  const teamMemberIds = useMemo(() => {
    const ids = new Set(entries.map((e: any) => e.userId));
    return Array.from(ids) as string[];
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries as any[];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e: any) =>
          (projectMap[e.projectId] || "").toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (userMap[e.userId] || "").toLowerCase().includes(q)
      );
    }
    if (memberFilter !== "all") {
      result = result.filter((e: any) => e.userId === memberFilter);
    }
    if (billableFilter !== "all") {
      result = result.filter((e: any) =>
        billableFilter === "billable" ? e.billable : !e.billable
      );
    }
    return result.sort((a: any, b: any) => (b.entryDate || "").localeCompare(a.entryDate || ""));
  }, [entries, search, memberFilter, billableFilter, projectMap, userMap]);

  const totalHours = entries.reduce((sum: number, e: any) => sum + (e.durationMinutes || 0) / 60, 0);
  const billableHours = entries.filter((e: any) => e.billable).reduce((sum: number, e: any) => sum + (e.durationMinutes || 0) / 60, 0);
  const invoicedHours = entries.filter((e: any) => e.status === "invoiced").reduce((sum: number, e: any) => sum + (e.durationMinutes || 0) / 60, 0);
  const notInvoicedHours = Math.max(0, billableHours - invoicedHours);

  function openCreate() {
    setFormProject(projectsList[0]?.id ?? "");
    setFormTask("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormHours("1");
    setFormDescription("");
    setFormBillable(true);
    setFormNotes("");
    setDialogOpen(true);
  }

  function handleSave() {
    if (!formProject) {
      toast.error("Project is required");
      return;
    }
    if (!formDescription.trim()) {
      toast.error("Description is required");
      return;
    }
    const hours = parseFloat(formHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Enter valid hours");
      return;
    }
    createMutation.mutate({
      projectId: formProject,
      entryDate: new Date(formDate).toISOString(),
      durationMinutes: Math.round(hours * 60),
      description: formDescription.trim(),
      billable: formBillable,
      notes: formNotes || undefined,
    });
  }

  return (
    <ModuleLayout
      title="Time Sheets"
      icon={<Clock className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Time Sheets" },
      ]}
      actions={<></>}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Hours Worked */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 p-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hours Worked</p>
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <Progress value={Math.min((totalHours / 160) * 100, 100)} className="h-2 [&>div]:bg-blue-500" />
            <p className="text-xs text-muted-foreground">{totalHours.toFixed(1)} / 160 target hours</p>
          </CardContent>
        </Card>

        {/* Invoiced */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-green-100 dark:bg-green-900/40 p-2">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoiced</p>
                  <p className="text-2xl font-bold">{invoicedHours.toFixed(1)}h</p>
                </div>
              </div>
            </div>
            <Progress
              value={billableHours > 0 ? (invoicedHours / billableHours) * 100 : 0}
              className="h-2 [&>div]:bg-green-500"
            />
            <p className="text-xs text-muted-foreground">{invoicedHours.toFixed(1)} of {billableHours.toFixed(1)} billable hours invoiced</p>
          </CardContent>
        </Card>

        {/* Not Invoiced */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-orange-100 dark:bg-orange-900/40 p-2">
                  <TimerOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Not Invoiced</p>
                  <p className="text-2xl font-bold">{notInvoicedHours.toFixed(1)}h</p>
                </div>
              </div>
            </div>
            <Progress
              value={billableHours > 0 ? (notInvoicedHours / billableHours) * 100 : 0}
              className="h-2 [&>div]:bg-orange-500"
            />
            <p className="text-xs text-muted-foreground">{notInvoicedHours.toFixed(1)} billable hours pending invoice</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <ListPageToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by project, task, or team member..."
        onCreateClick={openCreate}
        createLabel="Log Time"
        onExportClick={() => downloadCSV(filtered.map((e: any) => ({ Project: projectMap[e.projectId] || "", Task: e.description, TeamMember: userMap[e.userId] || "", Date: e.entryDate ? new Date(e.entryDate).toLocaleDateString() : "", Hours: ((e.durationMinutes || 0) / 60).toFixed(1), Billable: e.billable ? "Yes" : "No", Status: e.status })), "timesheets")}
        onPrintClick={() => window.print()}
        filterContent={
          <div className="flex gap-2">
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {teamMemberIds.map((uid) => (
                  <SelectItem key={uid} value={uid}>{userMap[uid] || uid}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billableFilter} onValueChange={setBillableFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="billable">Billable</SelectItem>
                <SelectItem value="non-billable">Non-Billable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Bulk Actions */}
      {selectedEntries.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
          <span className="text-sm font-medium">{selectedEntries.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => { const selected = filtered.filter((e: any) => selectedEntries.has(e.id)); downloadCSV(selected.map((e: any) => ({ Project: projectMap[e.projectId] || "", Task: e.description, TeamMember: userMap[e.userId] || "", Date: e.entryDate ? new Date(e.entryDate).toLocaleDateString() : "", Hours: ((e.durationMinutes || 0) / 60).toFixed(1), Billable: e.billable ? "Yes" : "No", Status: e.status })), "timesheets-selected"); }}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm" variant="outline" onClick={() => {
            selectedEntries.forEach((id) => approveMutation.mutate({ id, approve: true }));
            setSelectedEntries(new Set());
          }}>Approve</Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => {
            selectedEntries.forEach((id) => deleteMutation.mutate(id));
            setSelectedEntries(new Set());
          }}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedEntries(new Set())}>Clear</Button>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">{filtered.length} entries</span>
            <TableColumnSettings columns={tsColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selectedEntries.size === filtered.length && filtered.length > 0} onCheckedChange={() => { if (selectedEntries.size === filtered.length) setSelectedEntries(new Set()); else setSelectedEntries(new Set(filtered.map(e => e.id))); }} /></TableHead>
                {isVisible("project") && <TableHead>Project</TableHead>}
                {isVisible("task") && <TableHead>Task</TableHead>}
                {isVisible("teamMember") && <TableHead>Team Member</TableHead>}
                {isVisible("date") && <TableHead>Date</TableHead>}
                {isVisible("hours") && <TableHead className="text-right">Hours</TableHead>}
                {isVisible("billable") && <TableHead>Billable</TableHead>}
                {isVisible("status") && <TableHead>Status</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <Clock className="mx-auto h-10 w-10 mb-2 opacity-40" />
                    <p>{isLoading ? "Loading timesheet entries..." : "No timesheet entries found"}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry: any) => (
                  <TableRow key={entry.id} className={selectedEntries.has(entry.id) ? "bg-primary/5" : ""}>
                    <TableCell><Checkbox checked={selectedEntries.has(entry.id)} onCheckedChange={() => { const next = new Set(selectedEntries); if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id); setSelectedEntries(next); }} /></TableCell>
                    {isVisible("project") && <TableCell className="font-medium">{projectMap[entry.projectId] || "—"}</TableCell>}
                    {isVisible("task") && <TableCell>{entry.description}</TableCell>}
                    {isVisible("teamMember") && <TableCell>{userMap[entry.userId] || "—"}</TableCell>}
                    {isVisible("date") && <TableCell>{entry.entryDate ? new Date(entry.entryDate).toLocaleDateString() : "—"}</TableCell>}
                    {isVisible("hours") && <TableCell className="text-right font-mono">{((entry.durationMinutes || 0) / 60).toFixed(1)}</TableCell>}
                    {isVisible("billable") && <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          entry.billable
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {entry.billable ? "Billable" : "Non-Billable"}
                      </Badge>
                    </TableCell>}
                    {isVisible("status") && <TableCell>
                      <Badge variant="secondary" className={cn("text-xs capitalize", STATUS_STYLES[entry.status] || "")}>
                        {entry.status}
                      </Badge>
                    </TableCell>}
                    <TableCell className="text-right">
                      <RowActionsMenu
                        primaryActions={[
                          { label: "View", icon: actionIcons.view, onClick: () => navigate(`/timesheets/${entry.id}`) },
                          ...(entry.status === "draft" ? [{ label: "Submit", icon: actionIcons.edit, onClick: () => submitMutation.mutate(entry.id) }] : []),
                        ]}
                        menuActions={[
                          ...(entry.status === "submitted" ? [{ label: "Approve", icon: actionIcons.edit, onClick: () => approveMutation.mutate({ id: entry.id, approve: true }) }] : []),
                          { label: "Delete", icon: actionIcons.delete, onClick: () => deleteMutation.mutate(entry.id), variant: "destructive" as const, separator: true },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project *</Label>
              <Select value={formProject} onValueChange={setFormProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsList.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ts-desc">Description *</Label>
              <Textarea
                id="ts-desc"
                placeholder="Brief description of work done"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ts-date">Date</Label>
                <Input
                  id="ts-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ts-hours">Hours</Label>
                <Input
                  id="ts-hours"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ts-notes">Notes</Label>
              <Textarea
                id="ts-notes"
                placeholder="Additional notes (optional)"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ts-billable"
                checked={formBillable}
                onChange={(e) => setFormBillable(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="ts-billable" className="cursor-pointer">
                Billable
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
