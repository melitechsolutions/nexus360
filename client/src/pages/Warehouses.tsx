import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Warehouse,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  Phone,
  User,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Warehouses() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", contactPerson: "", phone: "", status: "active" });

  const utils = trpc.useUtils();
  const { data: rawData = [], isLoading } = trpc.warehouses.list.useQuery();
  const warehouses = JSON.parse(JSON.stringify(rawData)) as any[];

  const createMut = trpc.warehouses.create.useMutation({ onSuccess: () => { utils.warehouses.list.invalidate(); toast.success("Warehouse created"); setShowDialog(false); } });
  const updateMut = trpc.warehouses.update.useMutation({ onSuccess: () => { utils.warehouses.list.invalidate(); toast.success("Warehouse updated"); setEditing(null); setShowDialog(false); } });
  const deleteMut = trpc.warehouses.delete.useMutation({ onSuccess: () => { utils.warehouses.list.invalidate(); toast.success("Warehouse deleted"); } });

  const filtered = useMemo(() => {
    let result = warehouses;
    if (statusFilter !== "all") result = result.filter((w: any) => w.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((w: any) => w.name?.toLowerCase().includes(q) || w.code?.toLowerCase().includes(q) || w.address?.toLowerCase().includes(q));
    }
    return result;
  }, [warehouses, statusFilter, search]);

  const activeCount = warehouses.filter((w: any) => w.status === "active").length;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", address: "", contactPerson: "", phone: "", status: "active" });
    setShowDialog(true);
  };

  const openEdit = (w: any) => {
    setEditing(w);
    setForm({ name: w.name || "", code: w.code || "", address: w.address || "", contactPerson: w.contactPerson || "", phone: w.phone || "", status: w.status || "active" });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editing) {
      updateMut.mutate({ id: editing.id, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  return (
    <ModuleLayout
      title="Warehouses"
      description="Manage warehouse locations and stock storage"
      icon={<Warehouse className="h-5 w-5" />}
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Warehouse
        </Button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Warehouses</div>
          <div className="text-2xl font-bold mt-1">{warehouses.length}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{activeCount}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Inactive</div>
          <div className="text-2xl font-bold mt-1 text-slate-500">{warehouses.length - activeCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search warehouses..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No warehouses found.</p>
          <Button size="sm" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Warehouse</Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[90px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.code || "—"}</TableCell>
                  <TableCell>
                    {w.address ? (
                      <span className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3 text-muted-foreground" /> {w.address}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {w.contactPerson ? (
                      <span className="flex items-center gap-1 text-sm"><User className="h-3 w-3 text-muted-foreground" /> {w.contactPerson}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {w.phone ? (
                      <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-muted-foreground" /> {w.phone}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs border-0",
                      w.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {w.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                        if (confirm("Delete this warehouse?")) deleteMut.mutate({ id: w.id });
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={v => { if (!v) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Warehouse" : "New Warehouse"}</DialogTitle>
            <DialogDescription>Manage warehouse location details and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Main Warehouse" /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="WH-001" /></div>
            </div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2} placeholder="Full address" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} placeholder="John Doe" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254 700 000 000" /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button>
            <Button disabled={!form.name || createMut.isPending || updateMut.isPending} onClick={handleSave}>
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
