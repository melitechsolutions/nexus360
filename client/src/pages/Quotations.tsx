import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Plus, Search, Edit2, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const emptyForm = { rfqNo: "", supplier: "", description: "", amount: "", dueDate: "", status: "draft" as const };

export default function QuotationsPage() {
  const { allowed, isLoading: permissionLoading } = useRequireFeature("quotations:view");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRFQ, setEditingRFQ] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setCreateOpen(true); }, []);

  const { data: quotationsData, isLoading: dataLoading } = trpc.quotations.list.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });
  const quotations = quotationsData?.data || [];

  const createMutation = trpc.quotations.create.useMutation({
    onSuccess: () => { utils.quotations.list.invalidate(); toast.success("RFQ created"); setCreateOpen(false); setForm({ ...emptyForm }); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMutation = trpc.quotations.update.useMutation({
    onSuccess: () => { utils.quotations.list.invalidate(); toast.success("RFQ updated"); setEditingRFQ(null); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = trpc.quotations.delete.useMutation({
    onSuccess: () => { utils.quotations.list.invalidate(); toast.success("RFQ deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  if (permissionLoading) return <div className="flex items-center justify-center h-screen"><Spinner/></div>;
  if (!allowed) return null;

  const filteredQuotations = quotations.filter(q =>
    q.rfqNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (status: string) => status === "approved" ? "default" : status === "under_review" ? "secondary" : "outline";

  const openEdit = (q: any) => {
    setEditingRFQ(q);
    setForm({ rfqNo: q.rfqNo || "", supplier: q.supplier || "", description: q.description || "", amount: ((q.amount || 0) / 100).toString(), dueDate: q.dueDate || "", status: q.status || "draft" });
  };

  const handleSubmit = (isEdit: boolean) => {
    const payload = { rfqNo: form.rfqNo, supplier: form.supplier, description: form.description || undefined, amount: parseFloat(form.amount) || 0, dueDate: form.dueDate || undefined, status: form.status };
    if (isEdit && editingRFQ) updateMutation.mutate({ id: editingRFQ.id, ...payload });
    else createMutation.mutate(payload);
  };

  const RFQForm = () => (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>RFQ Number *</Label><Input value={form.rfqNo} onChange={e => setForm(f => ({ ...f, rfqNo: e.target.value }))} placeholder="RFQ-001" /></div>
        <div className="space-y-1"><Label>Supplier *</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Amount (Ksh) *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
        <div className="space-y-1"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
      </div>
      <div className="space-y-1"><Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
    </div>
  );

  return (
    <ModuleLayout title="Quotations & RFQs" description="Request and manage quotations from suppliers" icon={<FileText className="h-5 w-5" />} breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Procurement", href: "/procurement" }, { label: "Quotations" }]}>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-bold">Quotations &amp; RFQs</h2><p className="text-sm text-muted-foreground">Request and compare supplier quotations</p></div>
          <Button onClick={() => { setForm({ ...emptyForm }); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" /> New RFQ</Button>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search quotations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
        </div>
        <Card>
          <CardHeader><CardTitle>Quotation Requests</CardTitle><CardDescription>{filteredQuotations.length} quotations</CardDescription></CardHeader>
          <CardContent>
            {dataLoading ? <div className="flex items-center justify-center h-32"><Spinner /></div> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RFQ #</TableHead><TableHead>Supplier</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotations.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No quotations found. Click &quot;New RFQ&quot; to add one.</TableCell></TableRow>
                    ) : filteredQuotations.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">{q.rfqNo}</TableCell>
                        <TableCell>{q.supplier}</TableCell>
                        <TableCell>{q.description || "—"}</TableCell>
                        <TableCell>Ksh {((q.amount || 0) / 100).toLocaleString()}</TableCell>
                        <TableCell>{q.dueDate ? new Date(q.dueDate).toLocaleDateString() : "—"}</TableCell>
                        <TableCell><Badge variant={statusColor(q.status)}>{q.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => setLocation(`/quotations/${q.id}`)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete this quotation?")) deleteMutation.mutate(q.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm({ ...emptyForm }); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New RFQ / Quotation</DialogTitle></DialogHeader>
          <RFQForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => handleSubmit(false)} disabled={createMutation.isPending || !form.rfqNo || !form.supplier || !form.amount}>
              {createMutation.isPending ? "Saving..." : "Create RFQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRFQ} onOpenChange={v => { if (!v) setEditingRFQ(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit Quotation</DialogTitle></DialogHeader>
          <RFQForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRFQ(null)}>Cancel</Button>
            <Button onClick={() => handleSubmit(true)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
