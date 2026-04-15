import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";
import { toast } from "sonner";
import { FileCheck, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Clock, FileX } from "lucide-react";

const CONTRACT_TYPES: Record<string, string> = { permanent: "Permanent", fixed_term: "Fixed Term", probation: "Probation", casual: "Casual", internship: "Internship" };
const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  expired: { label: "Expired", variant: "destructive" },
  terminated: { label: "Terminated", variant: "destructive" },
  renewed: { label: "Renewed", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
};

export default function EmployeeContractsPage() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const employeesQ = trpc.employees.list.useQuery();
  const statsQ = trpc.employeeContracts.stats.useQuery();
  const listQ = trpc.employeeContracts.list.useQuery({
    status: filterStatus === "all" ? undefined : filterStatus,
    contractType: filterType === "all" ? undefined : filterType,
  });

  const createMut = trpc.employeeContracts.create.useMutation({ onSuccess() { toast.success("Contract created"); listQ.refetch(); statsQ.refetch(); setShowCreate(false); } });
  const updateMut = trpc.employeeContracts.update.useMutation({ onSuccess() { toast.success("Contract updated"); listQ.refetch(); statsQ.refetch(); setShowEdit(false); setEditing(null); } });
  const deleteMut = trpc.employeeContracts.delete.useMutation({ onSuccess() { toast.success("Contract deleted"); listQ.refetch(); statsQ.refetch(); } });

  const [form, setForm] = useState({ employeeId: "", contractType: "permanent" as string, title: "", startDate: "", endDate: "", salary: "", terms: "", renewalDate: "", noticePeriod: "30" });

  const resetForm = () => setForm({ employeeId: "", contractType: "permanent", title: "", startDate: "", endDate: "", salary: "", terms: "", renewalDate: "", noticePeriod: "30" });
  const stats = statsQ.data || { total: 0, active: 0, expired: 0, expiringSoon: 0 };
  const contracts = listQ.data || [];

  return (
    <ModuleLayout
      title="Employee Contracts"
      description="Manage employment contracts, renewals, and terms"
      icon={<FileCheck className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "HR", href: "/hr" }, { label: "Contracts" }]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Contracts" value={stats.total} icon={<FileCheck className="h-5 w-5 text-blue-500" />} />
          <StatsCard label="Active" value={stats.active} icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
          <StatsCard label="Expired" value={stats.expired} icon={<FileX className="h-5 w-5 text-red-500" />} />
          <StatsCard label="Expiring Soon" value={stats.expiringSoon} icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(CONTRACT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { resetForm(); setShowCreate(true); }}><Plus className="h-4 w-4 mr-2" /> New Contract</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contracts found</TableCell></TableRow>
                )}
                {contracts.map((c: any) => {
                  const s = STATUS_MAP[c.status] || { label: c.status, variant: "outline" as const };
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.employeeName || c.employeeId}</TableCell>
                      <TableCell>{CONTRACT_TYPES[c.contractType] || c.contractType}</TableCell>
                      <TableCell>{c.startDate ? new Date(c.startDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{c.endDate ? new Date(c.endDate).toLocaleDateString() : "Open-ended"}</TableCell>
                      <TableCell>{c.salary ? `${c.currency || "KES"} ${Number(c.salary).toLocaleString()}` : "-"}</TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setForm({ employeeId: c.employeeId, contractType: c.contractType, title: c.title || "", startDate: c.startDate?.split("T")[0] || "", endDate: c.endDate?.split("T")[0] || "", salary: c.salary?.toString() || "", terms: c.terms || "", renewalDate: c.renewalDate?.split("T")[0] || "", noticePeriod: c.noticePeriod?.toString() || "30" }); setShowEdit(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this contract?")) deleteMut.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Employee Contract</DialogTitle></DialogHeader>
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
                  <label className="text-sm font-medium">Contract Type</label>
                  <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTRACT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input className="mt-1" placeholder="e.g. Employment Agreement" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Start Date *</label><Input type="date" className="mt-1" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                <div><label className="text-sm font-medium">End Date</label><Input type="date" className="mt-1" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Monthly Salary (KES)</label><Input type="number" className="mt-1" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Notice Period (days)</label><Input type="number" className="mt-1" value={form.noticePeriod} onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium">Terms & Conditions</label><textarea className="mt-1 w-full border rounded-md px-3 py-2 text-sm min-h-[80px]" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={() => { if (!form.employeeId || !form.startDate) { toast.error("Employee and start date are required"); return; } createMut.mutate({ employeeId: form.employeeId, contractType: form.contractType as any, title: form.title || undefined, startDate: form.startDate, endDate: form.endDate || undefined, salary: form.salary ? Number(form.salary) : undefined, terms: form.terms || undefined, noticePeriod: form.noticePeriod ? Number(form.noticePeriod) : undefined }); }}>Create Contract</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEdit} onOpenChange={(open) => { if (!open) { setShowEdit(false); setEditing(null); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Edit Contract</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><label className="text-sm font-medium">Employee</label><Input value={(contracts.find((c: any) => c.id === editing?.id) as any)?.employeeName || form.employeeId} disabled className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Contract Type</label>
                  <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CONTRACT_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">Title</label><Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Start Date</label><Input type="date" className="mt-1" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                <div><label className="text-sm font-medium">End Date</label><Input type="date" className="mt-1" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Salary (KES)</label><Input type="number" className="mt-1" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Notice Period (days)</label><Input type="number" className="mt-1" value={form.noticePeriod} onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium">Terms</label><textarea className="mt-1 w-full border rounded-md px-3 py-2 text-sm min-h-[80px]" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowEdit(false); setEditing(null); }}>Cancel</Button>
                <Button onClick={() => { if (!editing) return; updateMut.mutate({ id: editing.id, contractType: form.contractType as any, title: form.title, startDate: form.startDate, endDate: form.endDate || undefined, salary: form.salary ? Number(form.salary) : undefined, terms: form.terms, noticePeriod: form.noticePeriod ? Number(form.noticePeriod) : undefined }); }}>Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
