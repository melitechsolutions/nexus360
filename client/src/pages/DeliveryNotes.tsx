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
import { Package, Plus, Search, Eye, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";

const emptyForm = { dnNo: "", supplier: "", orderId: "", deliveryDate: "", items: "", status: "pending" as const, notes: "" };

export default function DeliveryNotes() {
  const { allowed, isLoading: permissionLoading } = useRequireFeature("delivery_notes:view");
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDN, setEditingDN] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const utils = trpc.useUtils();
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setCreateOpen(true); }, []);

  const { data: notesData, isLoading: dataLoading } = trpc.deliveryNotes.list.useQuery({ limit: 50, offset: 0 }, { enabled: allowed });
  const deliveryNotes = notesData?.data || [];

  const createMutation = trpc.deliveryNotes.create.useMutation({
    onSuccess: () => { utils.deliveryNotes.list.invalidate(); toast.success("Delivery note created"); setCreateOpen(false); setForm({ ...emptyForm }); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMutation = trpc.deliveryNotes.update.useMutation({
    onSuccess: () => { utils.deliveryNotes.list.invalidate(); toast.success("Delivery note updated"); setEditingDN(null); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = trpc.deliveryNotes.delete.useMutation({
    onSuccess: () => { utils.deliveryNotes.list.invalidate(); toast.success("Delivery note deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  if (permissionLoading) return <div className="flex items-center justify-center h-screen"><Spinner/></div>;
  if (!allowed) return null;

  const filteredNotes = deliveryNotes.filter(d =>
    d.dnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (status: string) => status === "delivered" ? "default" : status === "partial" ? "secondary" : "outline";

  const openEdit = (d: any) => {
    setEditingDN(d);
    setForm({ dnNo: d.dnNo || "", supplier: d.supplier || "", orderId: d.orderId || "", deliveryDate: d.deliveryDate || "", items: String(d.items || ""), status: d.status || "pending", notes: d.notes || "" });
  };

  const handleSubmit = (isEdit: boolean) => {
    const payload = { dnNo: form.dnNo, supplier: form.supplier, orderId: form.orderId || undefined, deliveryDate: form.deliveryDate, items: parseInt(form.items) || 0, status: form.status, notes: form.notes || undefined };
    if (isEdit && editingDN) updateMutation.mutate({ id: editingDN.id, ...payload });
    else createMutation.mutate(payload);
  };

  const DNForm = () => (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>DN Number *</Label><Input value={form.dnNo} onChange={e => setForm(f => ({ ...f, dnNo: e.target.value }))} placeholder="DN-001" /></div>
        <div className="space-y-1"><Label>Supplier *</Label><Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Order Reference</Label><Input value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))} placeholder="PO-001" /></div>
        <div className="space-y-1"><Label>Delivery Date *</Label><Input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Number of Items *</Label><Input type="number" value={form.items} onChange={e => setForm(f => ({ ...f, items: e.target.value }))} placeholder="0" /></div>
        <div className="space-y-1"><Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
    </div>
  );

  return (
    <ModuleLayout title="Delivery Notes" description="Track incoming shipments and deliveries" icon={<Package className="h-5 w-5" />} breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Procurement", href: "/procurement" }, { label: "Delivery Notes" }]}>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-bold">Delivery Notes</h2><p className="text-sm text-muted-foreground">Track and manage incoming deliveries</p></div>
          <Button onClick={() => { setForm({ ...emptyForm }); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" /> New Delivery Note</Button>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search delivery notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
        </div>
        <Card>
          <CardHeader><CardTitle>Delivery Records</CardTitle><CardDescription>{filteredNotes.length} delivery notes</CardDescription></CardHeader>
          <CardContent>
            {dataLoading ? <div className="flex items-center justify-center h-32"><Spinner /></div> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DN #</TableHead><TableHead>Supplier</TableHead><TableHead>Order Ref</TableHead><TableHead>Items</TableHead><TableHead>Delivery Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotes.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No delivery notes found. Click &quot;New Delivery Note&quot; to add one.</TableCell></TableRow>
                    ) : filteredNotes.map(dn => (
                      <TableRow key={dn.id}>
                        <TableCell className="font-medium">{dn.dnNo}</TableCell>
                        <TableCell>{dn.supplier}</TableCell>
                        <TableCell>{dn.orderId || "—"}</TableCell>
                        <TableCell>{dn.items}</TableCell>
                        <TableCell>{dn.deliveryDate}</TableCell>
                        <TableCell><Badge variant={statusColor(dn.status)}>{dn.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => setLocation(`/delivery-notes/${dn.id}`)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(dn)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete this delivery note?")) deleteMutation.mutate(dn.id); }}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>New Delivery Note</DialogTitle></DialogHeader>
          <DNForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => handleSubmit(false)} disabled={createMutation.isPending || !form.dnNo || !form.supplier || !form.deliveryDate || !form.items}>
              {createMutation.isPending ? "Saving..." : "Create Delivery Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDN} onOpenChange={v => { if (!v) setEditingDN(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit Delivery Note</DialogTitle></DialogHeader>
          <DNForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDN(null)}>Cancel</Button>
            <Button onClick={() => handleSubmit(true)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
