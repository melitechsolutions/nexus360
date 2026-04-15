import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { FileText, Plus, Search, Eye, Edit2, Trash2, Calendar, Building2, DollarSign, ClipboardList, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";

const CONTRACT_TYPES = [
  { value: "service", label: "Service Agreement" },
  { value: "lease", label: "Lease Agreement" },
  { value: "supply", label: "Supply Contract" },
  { value: "maintenance", label: "Maintenance Contract" },
  { value: "consulting", label: "Consulting Agreement" },
  { value: "employment", label: "Employment Contract" },
  { value: "nda", label: "Non-Disclosure Agreement" },
  { value: "partnership", label: "Partnership Agreement" },
  { value: "licensing", label: "Licensing Agreement" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  name: "", vendor: "", startDate: "", endDate: "", value: "",
  status: "draft" as const, contractType: "", description: "", notes: "",
};

export default function ContractManagement() {
  const { allowed, isLoading: permissionLoading } = useRequireFeature("contracts:view");
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const utils = trpc.useUtils();
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setCreateOpen(true); }, []);

  const { data: rawData, isLoading: dataLoading } = trpc.contracts.list.useQuery({});
  const contracts = JSON.parse(JSON.stringify(rawData?.data ?? []));

  const createMutation = trpc.contracts.create.useMutation({
    onSuccess: () => { utils.contracts.list.invalidate(); toast.success("Contract created"); setCreateOpen(false); setForm({ ...emptyForm }); },
    onError: (err: any) => toast.error(err.message),
  });
  const updateMutation = trpc.contracts.update.useMutation({
    onSuccess: () => { utils.contracts.list.invalidate(); toast.success("Contract updated"); setEditingContract(null); },
    onError: (err: any) => toast.error(err.message),
  });
  const deleteMutation = trpc.contracts.delete.useMutation({
    onSuccess: () => { utils.contracts.list.invalidate(); toast.success("Contract deleted"); },
    onError: (err: any) => toast.error(err.message),
  });

  if (permissionLoading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  if (!allowed) return null;

  const filteredContracts = contracts.filter((c: any) =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.vendor || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColor = (status: string) => status === "active" ? "default" : status === "expired" ? "destructive" : "secondary";

  const openEdit = (c: any) => {
    setEditingContract(c);
    setForm({
      name: c.name || "", vendor: c.vendor || "", startDate: c.startDate || "",
      endDate: c.endDate || "", value: ((c.value || 0) / 100).toString(),
      status: c.status || "draft", contractType: c.contractType || "",
      description: c.description || "", notes: c.notes || "",
    });
  };

  const handleSubmit = (isEdit: boolean) => {
    if (!form.name || !form.vendor || !form.startDate || !form.endDate || !form.value) {
      toast.error("Please fill in all required fields"); return;
    }
    const payload = {
      name: form.name, vendor: form.vendor, startDate: form.startDate,
      endDate: form.endDate, value: parseFloat(form.value) || 0,
      status: form.status, contractType: form.contractType || undefined,
      description: form.description || undefined, notes: form.notes || undefined,
    };
    if (isEdit && editingContract) {
      updateMutation.mutate({ id: editingContract.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const ContractForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      {/* Contract Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Contract Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contract Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Office Lease 2025" />
            </div>
            <div className="space-y-2">
              <Label>Contract Type</Label>
              <Select value={form.contractType} onValueChange={v => setForm(f => ({ ...f, contractType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 md:w-1/2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendor / Party Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Vendor / Party Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Vendor / Party Name *</Label>
            <Input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="e.g. ABC Supplies Ltd" />
          </div>
        </CardContent>
      </Card>

      {/* Period & Value */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Period &amp; Value
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2 md:w-1/2">
            <Label>Contract Value (Ksh) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" step="0.01" min="0" className="pl-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description & Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Description &amp; Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Enter contract details, terms, and conditions..." minHeight="120px" />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <RichTextEditor value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Add any internal notes..." minHeight="100px" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ModuleLayout title="Contracts Management" description="Manage contracts, agreements, and vendor terms" icon={<FileText className="h-5 w-5" />} breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Contracts" }]}>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-bold">Contracts</h2><p className="text-sm text-muted-foreground">Manage all contracts and agreements</p></div>
          <Button onClick={() => { setForm({ ...emptyForm }); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" /> New Contract</Button>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contracts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
        </div>
        <Card>
          <CardHeader><CardTitle>Contracts</CardTitle><CardDescription>{filteredContracts.length} contracts</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Vendor</TableHead><TableHead>Period</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Spinner /></TableCell></TableRow>
                  ) : filteredContracts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contracts found. Click &quot;New Contract&quot; to add one.</TableCell></TableRow>
                  ) : filteredContracts.map((contract: any) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.name}</TableCell>
                      <TableCell className="text-sm">{CONTRACT_TYPES.find(t => t.value === contract.contractType)?.label || contract.contractType || "-"}</TableCell>
                      <TableCell>{contract.vendor}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : "-"} → {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>Ksh {((contract.value || 0) / 100).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={statusColor(contract.status || "draft")}>{contract.status || "draft"}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setLocation(`/contracts/${contract.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(contract)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete this contract?")) deleteMutation.mutate(contract.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm({ ...emptyForm }); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
          <ContractForm isEdit={false} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)}><X className="h-4 w-4 mr-2" />Cancel</Button>
            <Button onClick={() => handleSubmit(false)} disabled={createMutation.isPending || !form.name || !form.vendor || !form.startDate || !form.endDate || !form.value}>
              <Save className="h-4 w-4 mr-2" />{createMutation.isPending ? "Saving..." : "Create Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingContract} onOpenChange={v => { if (!v) setEditingContract(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Edit Contract</DialogTitle></DialogHeader>
          <ContractForm isEdit={true} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingContract(null)}><X className="h-4 w-4 mr-2" />Cancel</Button>
            <Button onClick={() => handleSubmit(true)} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />{updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
