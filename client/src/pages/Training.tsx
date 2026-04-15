import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Plus, Edit2, Trash2, Search, UserPlus, Users, BookOpen, Award, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";

export default function Training() {
  useRequireFeature("hr:view");
  const { formatAmount } = useCurrencySettings();
  const [activeTab, setActiveTab] = useState<"programs" | "enrollments">("programs");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showEnroll, setShowEnroll] = useState<string | null>(null);
  const [enrolleeIds, setEnrolleeIds] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", category: "", trainer: "",
    startDate: "", endDate: "", maxParticipants: 0, cost: 0,
    location: "", isOnline: false, isMandatory: false,
  });

  const programs = trpc.training.listPrograms.useQuery();
  const programDetail = trpc.training.getProgram.useQuery({ id: selectedProgram! }, { enabled: !!selectedProgram });
  const stats = trpc.training.stats.useQuery();
  const employees = trpc.employees.list.useQuery();
  const utils = trpc.useUtils();

  const createProgram = trpc.training.createProgram.useMutation({
    onSuccess: () => { toast.success("Program created"); closeForm(); utils.training.listPrograms.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateProgram = trpc.training.updateProgram.useMutation({
    onSuccess: () => { toast.success("Program updated"); closeForm(); utils.training.listPrograms.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteProgram = trpc.training.deleteProgram.useMutation({
    onSuccess: () => { toast.success("Deleted"); setDeleteId(null); utils.training.listPrograms.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const enroll = trpc.training.enroll.useMutation({
    onSuccess: (data) => {
      toast.success(`Enrolled ${data.enrolled} employees`);
      setShowEnroll(null);
      setEnrolleeIds([]);
      utils.training.listPrograms.invalidate();
      utils.training.getProgram.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateEnrollment = trpc.training.updateEnrollment.useMutation({
    onSuccess: () => { toast.success("Updated"); utils.training.getProgram.invalidate(); utils.training.stats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ name: "", description: "", category: "", trainer: "", startDate: "", endDate: "", maxParticipants: 0, cost: 0, location: "", isOnline: false, isMandatory: false });
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name, description: p.description || "", category: p.category || "",
      trainer: p.trainer || "", startDate: (p.startDate || "").split("T")[0],
      endDate: (p.endDate || "").split("T")[0], maxParticipants: p.maxParticipants || 0,
      cost: p.cost || 0, location: p.location || "",
      isOnline: !!p.isOnline, isMandatory: !!p.isMandatory,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (editId) {
      updateProgram.mutate({ id: editId, ...form, maxParticipants: form.maxParticipants || undefined, cost: form.cost || undefined });
    } else {
      createProgram.mutate({ ...form, maxParticipants: form.maxParticipants || undefined, cost: form.cost || undefined });
    }
  };

  const filtered = (programs.data || []).filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const activePrograms = (stats.data?.programs || []).find((s: any) => s.status === "active")?.cnt || 0;
  const completedEnrollments = (stats.data?.enrollments || []).find((s: any) => s.status === "completed")?.cnt || 0;
  const totalEnrollments = (stats.data?.enrollments || []).reduce((sum: number, s: any) => sum + Number(s.cnt || 0), 0);

  const statusColors: Record<string, string> = { active: "default", completed: "secondary", cancelled: "destructive", draft: "outline" };

  return (
    <ModuleLayout
      title="Training Management"
      description="Manage training programs and employee enrollments"
      icon={GraduationCap}
      breadcrumbs={[{ label: "HR", href: "/employees" }, { label: "Training" }]}
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard label="Active Programs" value={activePrograms} icon={<BookOpen className="h-5 w-5" />} color="border-l-blue-500" />
        <StatsCard label="Total Enrollments" value={totalEnrollments} icon={<Users className="h-5 w-5" />} color="border-l-green-500" />
        <StatsCard label="Completed" value={completedEnrollments} icon={<Award className="h-5 w-5" />} color="border-l-purple-500" />
        <StatsCard label="Programs" value={(programs.data || []).length} icon={<BarChart3 className="h-5 w-5" />} color="border-l-orange-500" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search programs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> New Program</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {programs.isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No training programs found</TableCell></TableRow>
                ) : filtered.map((p: any) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedProgram(p.id)}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.isMandatory ? <Badge variant="destructive" className="ml-2 text-xs">Mandatory</Badge> : null}
                    </TableCell>
                    <TableCell>{p.category || "-"}</TableCell>
                    <TableCell>{p.trainer || "-"}</TableCell>
                    <TableCell>
                      {p.startDate ? format(new Date(p.startDate), "MMM d") : "-"}
                      {p.endDate ? ` - ${format(new Date(p.endDate), "MMM d, yyyy")}` : ""}
                    </TableCell>
                    <TableCell>{p.enrollmentCount || 0}{p.maxParticipants ? `/${p.maxParticipants}` : ""}</TableCell>
                    <TableCell><Badge variant="outline">{p.isOnline ? "Online" : "In-person"}</Badge></TableCell>
                    <TableCell><Badge variant={statusColors[p.status] as any || "outline"}>{p.status}</Badge></TableCell>
                    <TableCell className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => setShowEnroll(p.id)} title="Enroll"><UserPlus className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Edit"><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(p.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Program Detail Dialog */}
      <Dialog open={!!selectedProgram} onOpenChange={() => setSelectedProgram(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{programDetail.data?.name || "Program Details"}</DialogTitle>
            <DialogDescription>{programDetail.data?.description}</DialogDescription>
          </DialogHeader>
          {programDetail.isLoading ? <Spinner /> : programDetail.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Category</div><div className="font-medium">{programDetail.data.category || "-"}</div>
                <div>Trainer</div><div className="font-medium">{programDetail.data.trainer || "-"}</div>
                <div>Location</div><div className="font-medium">{programDetail.data.location || "-"}</div>
                <div>Cost</div><div className="font-medium">{programDetail.data.cost ? formatAmount(programDetail.data.cost) : "-"}</div>
              </div>
              <hr />
              <h4 className="font-semibold">Enrollments ({(programDetail.data.enrollments || []).length})</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(programDetail.data.enrollments || []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No enrollments yet</TableCell></TableRow>
                  ) : (programDetail.data.enrollments || []).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.firstName} {e.lastName}</TableCell>
                      <TableCell>{e.department || "-"}</TableCell>
                      <TableCell>
                        <Select value={e.status} onValueChange={(v) => updateEnrollment.mutate({ id: e.id, status: v as any })}>
                          <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enrolled">Enrolled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="dropped">Dropped</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{e.score || "-"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                          // remove enrollment handled inline
                        }}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Program Dialog */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Program" : "New Training Program"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Program name *" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Category" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} />
              <Input placeholder="Trainer" value={form.trainer} onChange={(e) => setForm(p => ({ ...p, trainer: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">Start Date</label><Input type="date" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              <div><label className="text-xs font-medium">End Date</label><Input type="date" value={form.endDate} onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">Max Participants</label><Input type="number" value={form.maxParticipants || ""} onChange={(e) => setForm(p => ({ ...p, maxParticipants: Number(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs font-medium">Cost</label><Input type="number" value={form.cost || ""} onChange={(e) => setForm(p => ({ ...p, cost: Number(e.target.value) || 0 }))} /></div>
            </div>
            <Input placeholder="Location" value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} />
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isOnline} onChange={(e) => setForm(p => ({ ...p, isOnline: e.target.checked }))} /> Online</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isMandatory} onChange={(e) => setForm(p => ({ ...p, isMandatory: e.target.checked }))} /> Mandatory</label>
            </div>
            <Button className="w-full" disabled={!form.name || createProgram.isPending || updateProgram.isPending} onClick={handleSave}>
              {(createProgram.isPending || updateProgram.isPending) ? <Spinner className="mr-2" /> : null}
              {editId ? "Update" : "Create"} Program
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={!!showEnroll} onOpenChange={() => { setShowEnroll(null); setEnrolleeIds([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Employees</DialogTitle>
            <DialogDescription>Select employees to enroll in this program</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {(employees.data || []).map((e: any) => (
              <label key={e.id} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" checked={enrolleeIds.includes(e.id)} onChange={(ev) => {
                  setEnrolleeIds(prev => ev.target.checked ? [...prev, e.id] : prev.filter(i => i !== e.id));
                }} />
                <div>
                  <div className="font-medium text-sm">{e.firstName} {e.lastName}</div>
                  <div className="text-xs text-muted-foreground">{e.department} - {e.position}</div>
                </div>
              </label>
            ))}
          </div>
          <Button className="w-full" disabled={enrolleeIds.length === 0 || enroll.isPending}
            onClick={() => showEnroll && enroll.mutate({ programId: showEnroll, employeeIds: enrolleeIds })}>
            {enroll.isPending ? <Spinner className="mr-2" /> : null}
            Enroll {enrolleeIds.length} Employee{enrolleeIds.length !== 1 ? "s" : ""}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Program?</AlertDialogTitle>
          <AlertDialogDescription>This will also remove all enrollments. This cannot be undone.</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteProgram.mutate({ id: deleteId })}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}
