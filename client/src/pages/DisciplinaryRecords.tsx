import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";
import { toast } from "sonner";
import { ShieldAlert, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const ACTION_TYPES = [
  { value: "verbal_warning", label: "Verbal Warning" },
  { value: "written_warning", label: "Written Warning" },
  { value: "suspension", label: "Suspension" },
  { value: "termination", label: "Termination" },
  { value: "probation", label: "Probation" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "open", label: "Open", variant: "destructive" as const },
  { value: "under_review", label: "Under Review", variant: "secondary" as const },
  { value: "resolved", label: "Resolved", variant: "default" as const },
  { value: "appealed", label: "Appealed", variant: "outline" as const },
];

export default function DisciplinaryRecordsPage() {
  const [filterAction, setFilterAction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editing, setEditing] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const employeesQ = trpc.employees.list.useQuery();
  const listQ = trpc.disciplinary.list.useQuery({
    actionType: filterAction === "all" ? undefined : filterAction,
    status: filterStatus === "all" ? undefined : filterStatus,
  });
  const statsQ = trpc.disciplinary.stats.useQuery();
  const createMut = trpc.disciplinary.create.useMutation({ onSuccess() { toast.success("Record created"); listQ.refetch(); statsQ.refetch(); closeForm(); } });
  const updateMut = trpc.disciplinary.update.useMutation({ onSuccess() { toast.success("Record updated"); listQ.refetch(); statsQ.refetch(); closeForm(); } });
  const deleteMut = trpc.disciplinary.delete.useMutation({ onSuccess() { toast.success("Record deleted"); listQ.refetch(); statsQ.refetch(); } });

  const emptyForm = { employeeId: "", actionType: "verbal_warning", reason: "", description: "", incidentDate: "", status: "open", outcome: "" };
  const [form, setForm] = useState(emptyForm);

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      employeeId: r.employeeId,
      actionType: r.actionType,
      reason: r.reason || "",
      description: r.description || "",
      incidentDate: r.incidentDate ? r.incidentDate.slice(0, 10) : "",
      status: r.status,
      outcome: r.outcome || "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.reason) { toast.error("Employee and reason are required"); return; }
    if (editing) {
      updateMut.mutate({ id: editing.id, ...form });
    } else {
      createMut.mutate(form as any);
    }
  };

  const stats = statsQ.data || { total: 0, open: 0, resolved: 0, warnings: 0, suspensions: 0 };
  const records = listQ.data || [];

  return (
    <ModuleLayout
      title="Disciplinary Records"
      description="Manage employee disciplinary actions, warnings, and outcomes"
      icon={<ShieldAlert className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "HR", href: "/hr" }, { label: "Disciplinary Records" }]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatsCard label="Total Records" value={stats.total} icon={<ShieldAlert className="h-5 w-5 text-gray-500" />} />
          <StatsCard label="Open Cases" value={stats.open} icon={<AlertTriangle className="h-5 w-5 text-red-500" />} />
          <StatsCard label="Resolved" value={stats.resolved} icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
          <StatsCard label="Warnings" value={stats.warnings} icon={<Clock className="h-5 w-5 text-amber-500" />} />
          <StatsCard label="Suspensions" value={stats.suspensions} icon={<ShieldAlert className="h-5 w-5 text-red-600" />} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-3">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTION_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Record
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Action Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Incident Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No disciplinary records found</TableCell></TableRow>
                )}
                {records.map((r: any) => {
                  const actionLabel = ACTION_TYPES.find((a) => a.value === r.actionType)?.label || r.actionType;
                  const statusMeta = STATUSES.find((s) => s.value === r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employeeName || r.employeeId}</TableCell>
                      <TableCell><Badge variant="outline">{actionLabel}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                      <TableCell>{r.incidentDate ? new Date(r.incidentDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell><Badge variant={statusMeta?.variant || "secondary"}>{statusMeta?.label || r.status}</Badge></TableCell>
                      <TableCell className="max-w-[150px] truncate">{r.outcome || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this record?")) deleteMut.mutate({ id: r.id }); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={showForm} onOpenChange={(v) => { if (!v) closeForm(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Disciplinary Record" : "Add Disciplinary Record"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Employee *</label>
                <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                  <option value="">Select employee...</option>
                  {(employeesQ.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Action Type</label>
                  <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTION_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Incident Date</label>
                <Input type="date" className="mt-1" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Reason *</label>
                <Textarea className="mt-1" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Outcome</label>
                <Textarea className="mt-1" rows={2} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
                <Button onClick={handleSubmit}>{editing ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
