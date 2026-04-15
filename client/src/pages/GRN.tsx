import React, { useState, useEffect } from "react";
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
import { BoxIcon, Plus, Search, Eye, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";

const emptyForm = { grnNo: "", supplier: "", invNo: "", receivedDate: "", items: "", value: "", status: "pending" as const, notes: "" };

// ─── Hoisted outside parent to keep stable component reference (prevents focus loss) ──
type GRNFormData = typeof emptyForm;
function GRNFormFields({ form, setForm }: { form: GRNFormData; setForm: React.Dispatch<React.SetStateAction<GRNFormData>> }) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>GRN Number *</Label><Input value={form.grnNo} onChange={e => setForm(f => ({ ...f, grnNo: e.target.value }))} placeholder="GRN-001" /></div>
        <div className="space-y-1"><Label>Supplier *</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Invoice Number</Label><Input value={form.invNo} onChange={e => setForm(f => ({ ...f, invNo: e.target.value }))} placeholder="INV-001" /></div>
        <div className="space-y-1"><Label>Received Date *</Label><Input type="date" value={form.receivedDate} onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Number of Items *</Label><Input type="number" value={form.items} onChange={e => setForm(f => ({ ...f, items: e.target.value }))} placeholder="0" /></div>
        <div className="space-y-1"><Label>Value (Ksh) *</Label><Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0" /></div>
      </div>
      <div className="space-y-1"><Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
    </div>
  );
}

export default function GoodsReceivedNotes() {
  const { allowed, isLoading: permissionLoading } = useRequireFeature("grn:view");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGRN, setEditingGRN] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const utils = trpc.useUtils();
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setCreateOpen(true); }, []);
  const [, setLocation] = useLocation();

  const { data: grnData, isLoading: dataLoading } = trpc.grn.list.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });
  const grnList = grnData?.data || [];

  const createMutation = trpc.grn.create.useMutation({
    onSuccess: () => { utils.grn.list.invalidate(); toast.success("GRN created"); setCreateOpen(false); setForm({ ...emptyForm }); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMutation = trpc.grn.update.useMutation({
    onSuccess: () => { utils.grn.list.invalidate(); toast.success("GRN updated"); setEditingGRN(null); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = trpc.grn.delete.useMutation({
    onSuccess: () => { utils.grn.list.invalidate(); toast.success("GRN deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  if (permissionLoading) return <div className="flex items-center justify-center h-screen"><Spinner/></div>;
  if (!allowed) return null;

  const filteredGRNs = grnList.filter(g =>
    g.grnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (status: string) => status === "accepted" ? "default" : status === "partial" ? "secondary" : "destructive";

  const openEdit = (g: any) => {
    setEditingGRN(g);
    setForm({ grnNo: g.grnNo || "", supplier: g.supplier || "", invNo: g.invNo || "", receivedDate: g.receivedDate || "", items: String(g.items || ""), value: ((g.value || 0) / 100).toString(), status: g.status || "pending", notes: g.notes || "" });
  };

  const handleSubmit = (isEdit: boolean) => {
    const parsedItems = parseInt(form.items);
    const parsedValue = parseFloat(form.value);
    if (!parsedItems || parsedItems <= 0) { toast.error("Number of items must be greater than 0"); return; }
    if (!parsedValue || parsedValue <= 0) { toast.error("Value must be greater than 0"); return; }
    const payload = { grnNo: form.grnNo, supplier: form.supplier, invNo: form.invNo || undefined, receivedDate: form.receivedDate, items: parsedItems, value: parsedValue, status: form.status, notes: form.notes || undefined };
    if (isEdit && editingGRN) updateMutation.mutate({ id: editingGRN.id, ...payload });
    else createMutation.mutate(payload);
  };

  return (
    <ModuleLayout title="Goods Received Notes" description="Manage goods received and acceptance" icon={<BoxIcon className="h-5 w-5" />} breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Procurement", href: "/procurement" }, { label: "GRN" }]}>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-bold">Goods Received Notes</h2><p className="text-sm text-muted-foreground">Record and track received goods</p></div>
          <Button onClick={() => { setForm({ ...emptyForm }); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" /> New GRN</Button>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search GRNs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
        </div>
        <Card>
          <CardHeader><CardTitle>GRN Registry</CardTitle><CardDescription>{filteredGRNs.length} goods received notes</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN #</TableHead><TableHead>Supplier</TableHead><TableHead>Invoice #</TableHead><TableHead>Items</TableHead><TableHead>Value</TableHead><TableHead>Received Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Spinner /></TableCell></TableRow>
                  ) : filteredGRNs.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No GRNs found. Click &quot;New GRN&quot; to add one.</TableCell></TableRow>
                  ) : filteredGRNs.map(grn => (
                    <TableRow key={grn.id}>
                      <TableCell className="font-medium">{grn.grnNo}</TableCell>
                      <TableCell>{grn.supplier}</TableCell>
                      <TableCell>{grn.invNo || "—"}</TableCell>
                      <TableCell>{grn.items}</TableCell>
                      <TableCell>Ksh {((grn.value || 0) / 100).toLocaleString()}</TableCell>
                      <TableCell>{grn.receivedDate}</TableCell>
                      <TableCell><Badge variant={statusColor(grn.status)}>{grn.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setLocation(`/grn/${grn.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(grn)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete this GRN?")) deleteMutation.mutate(grn.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm({ ...emptyForm }); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Goods Received Note</DialogTitle></DialogHeader>
          <GRNFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => handleSubmit(false)} disabled={createMutation.isPending || !form.grnNo || !form.supplier || !form.receivedDate || !form.items || !form.value}>
              {createMutation.isPending ? "Saving..." : "Create GRN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingGRN} onOpenChange={v => { if (!v) setEditingGRN(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit GRN</DialogTitle></DialogHeader>
          <GRNFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGRN(null)}>Cancel</Button>
            <Button onClick={() => handleSubmit(true)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
