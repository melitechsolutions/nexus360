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
import { Star, Plus, Pencil, Trash2, ClipboardCheck, Clock, CheckCircle, TrendingUp } from "lucide-react";

const STATUSES = [
  { value: "pending", label: "Pending", variant: "secondary" as const },
  { value: "in_progress", label: "In Progress", variant: "outline" as const },
  { value: "completed", label: "Completed", variant: "default" as const },
];

function StarRating({ rating, onChange, readonly }: { rating: number; onChange?: (r: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} ${!readonly ? "cursor-pointer hover:text-amber-300" : ""}`}
          onClick={() => !readonly && onChange?.(i)}
        />
      ))}
    </div>
  );
}

export default function PerformanceReviewsPage() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const employeesQ = trpc.employees.list.useQuery();
  const listQ = trpc.performanceReviews.list.useQuery({ status: filterStatus === "all" ? undefined : filterStatus });
  const statsQ = trpc.performanceReviews.stats.useQuery();
  const createMut = trpc.performanceReviews.create.useMutation({ onSuccess() { toast.success("Review created"); listQ.refetch(); statsQ.refetch(); closeForm(); } });
  const updateMut = trpc.performanceReviews.update.useMutation({ onSuccess() { toast.success("Review updated"); listQ.refetch(); statsQ.refetch(); closeForm(); } });
  const deleteMut = trpc.performanceReviews.delete.useMutation({ onSuccess() { toast.success("Review deleted"); listQ.refetch(); statsQ.refetch(); } });

  const emptyForm = { employeeId: "", reviewerId: "", rating: 5, comments: "", goals: "", strengths: "", improvements: "", kpiScore: "", status: "pending", reviewDate: "" };
  const [form, setForm] = useState(emptyForm);

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      employeeId: r.employeeId, reviewerId: r.reviewerId, rating: r.rating || 5,
      comments: r.comments || "", goals: r.goals || "", strengths: r.strengths || "",
      improvements: r.improvements || "", kpiScore: r.kpiScore?.toString() || "",
      status: r.status || "pending", reviewDate: r.reviewDate ? r.reviewDate.slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.employeeId || !form.reviewerId) { toast.error("Employee and reviewer are required"); return; }
    const data: any = {
      ...form,
      rating: Number(form.rating),
      kpiScore: form.kpiScore ? Number(form.kpiScore) : undefined,
      reviewDate: form.reviewDate ? new Date(form.reviewDate) : undefined,
    };
    if (editing) updateMut.mutate({ id: editing.id, ...data });
    else createMut.mutate(data);
  };

  const stats = statsQ.data || { total: 0, pending: 0, inProgress: 0, completed: 0, averageRating: 0 };
  const reviews = listQ.data || [];

  return (
    <ModuleLayout
      title="Performance Reviews"
      description="Create and manage employee performance reviews with KPI tracking"
      icon={<Star className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "HR", href: "/hr" }, { label: "Performance Reviews" }]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatsCard label="Total Reviews" value={stats.total} icon={<ClipboardCheck className="h-5 w-5 text-blue-500" />} />
          <StatsCard label="Pending" value={stats.pending} icon={<Clock className="h-5 w-5 text-amber-500" />} />
          <StatsCard label="In Progress" value={stats.inProgress} icon={<TrendingUp className="h-5 w-5 text-purple-500" />} />
          <StatsCard label="Completed" value={stats.completed} icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
          <StatsCard label="Avg Rating" value={Number(stats.averageRating || 0).toFixed(1)} icon={<Star className="h-5 w-5 text-amber-400" />} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Review
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>KPI Score</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Strengths</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No performance reviews found</TableCell></TableRow>
                )}
                {reviews.map((r: any) => {
                  const statusMeta = STATUSES.find((s) => s.value === r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employeeName || r.employeeId}</TableCell>
                      <TableCell>{r.reviewerName || r.reviewerId}</TableCell>
                      <TableCell><StarRating rating={r.rating || 0} readonly /></TableCell>
                      <TableCell>{r.kpiScore != null ? `${Number(r.kpiScore).toFixed(1)}%` : "-"}</TableCell>
                      <TableCell>{r.reviewDate ? new Date(r.reviewDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell><Badge variant={statusMeta?.variant || "secondary"}>{statusMeta?.label || r.status}</Badge></TableCell>
                      <TableCell className="max-w-[150px] truncate">{r.strengths || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this review?")) deleteMut.mutate(r.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Performance Review" : "New Performance Review"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Employee *</label>
                  <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} disabled={!!editing}>
                    <option value="">Select employee...</option>
                    {(employeesQ.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Reviewer *</label>
                  <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm" value={form.reviewerId} onChange={(e) => setForm({ ...form, reviewerId: e.target.value })}>
                    <option value="">Select reviewer...</option>
                    {(employeesQ.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Rating</label>
                  <div className="mt-2"><StarRating rating={Number(form.rating)} onChange={(r) => setForm({ ...form, rating: r })} /></div>
                </div>
                <div>
                  <label className="text-sm font-medium">KPI Score (%)</label>
                  <Input type="number" min={0} max={100} step={0.1} className="mt-1" value={form.kpiScore} onChange={(e) => setForm({ ...form, kpiScore: e.target.value })} placeholder="e.g. 85.5" />
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
                <label className="text-sm font-medium">Review Date</label>
                <Input type="date" className="mt-1" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Strengths</label>
                <Textarea className="mt-1" rows={2} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} placeholder="Key strengths observed..." />
              </div>
              <div>
                <label className="text-sm font-medium">Areas for Improvement</label>
                <Textarea className="mt-1" rows={2} value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} placeholder="Areas needing improvement..." />
              </div>
              <div>
                <label className="text-sm font-medium">Goals</label>
                <Textarea className="mt-1" rows={2} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="Goals for next review period..." />
              </div>
              <div>
                <label className="text-sm font-medium">Comments</label>
                <Textarea className="mt-1" rows={2} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} placeholder="Additional comments..." />
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

