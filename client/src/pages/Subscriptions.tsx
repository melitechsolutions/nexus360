import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";
import {
  Repeat2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Users,
  Loader2,
  Eye,
  Pencil,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
  trial: { label: "Trial", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", icon: <Clock className="h-3 w-3" /> },
  suspended: { label: "Suspended", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", icon: <AlertTriangle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: <XCircle className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.active;
  return (
    <Badge variant="outline" className={cn("gap-1 border-0 font-medium text-xs", s.className)}>
      {s.icon} {s.label}
    </Badge>
  );
}

// Demo/mock subscriptions data when backend has none


export default function Subscriptions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setCreateOpen(true); }, []);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [form, setForm] = useState({
    clientId: "",
    frequency: "monthly" as "weekly" | "biweekly" | "monthly" | "quarterly" | "annually",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    description: "",
    noteToInvoice: "",
  });

  // Load from recurringInvoices router (available in appRouter)
  const { data: riData = [], isLoading, refetch } = trpc.recurringInvoices.list.useQuery({ activeOnly: false });
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: invoicesList = [] } = trpc.invoices.list.useQuery();

  const createMutation = trpc.recurringInvoices.create.useMutation({
    onSuccess: () => { toast.success("Subscription created"); setCreateOpen(false); refetch(); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.recurringInvoices.update.useMutation({
    onSuccess: () => { toast.success("Subscription updated"); setEditOpen(false); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.recurringInvoices.delete.useMutation({
    onSuccess: () => { toast.success("Subscription deleted"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggleMutation = trpc.recurringInvoices.toggleActive.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({ clientId: "", frequency: "monthly", startDate: new Date().toISOString().split("T")[0], endDate: "", description: "", noteToInvoice: "" });

  // Map recurring invoices to subscription shape
  const subs: any[] = useMemo(() => (riData as any[]).map((ri: any) => ({
    id: ri.id,
    clientId: ri.clientId,
    clientName: ri.clientName || "",
    planId: ri.id,
    planName: ri.description || ri.title || "Subscription",
    status: ri.isActive ? "active" : "cancelled",
    billingCycle: ri.frequency === "yearly" ? "annual" : "monthly",
    currentPrice: ri.amount || "0",
    startDate: ri.startDate,
    renewalDate: ri.nextDueDate,
    usersCount: 1,
    autoRenew: ri.isActive ? 1 : 0,
  })), [riData]);
  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    (clients as any[]).forEach((c: any) => { m[c.id] = c.name || c.businessName; });
    return m;
  }, [clients]);

  const enriched = useMemo(() => subs.map((s: any) => ({
    ...s,
    clientName: s.clientName || clientMap[s.clientId] || "—",
  })), [subs, clientMap]);

  const filtered = useMemo(() => enriched.filter((s: any) => {
    if (search && !s.clientName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (cycleFilter !== "all" && s.billingCycle !== cycleFilter) return false;
    return true;
  }), [enriched, search, statusFilter, cycleFilter]);

  const stats = useMemo(() => {
    const active = subs.filter((s: any) => s.status === "active").length;
    const trial = subs.filter((s: any) => s.status === "trial").length;
    const suspended = subs.filter((s: any) => s.status === "suspended" || s.status === "cancelled" || s.status === "expired").length;
    const mrr = subs.filter((s: any) => s.status === "active" && s.billingCycle === "monthly")
      .reduce((acc: number, s: any) => acc + parseFloat(s.currentPrice || "0"), 0);
    const arr = subs.filter((s: any) => s.status === "active" && s.billingCycle === "annual")
      .reduce((acc: number, s: any) => acc + parseFloat(s.currentPrice || "0"), 0);
    return { active, trial, suspended, mrr, arr };
  }, [subs]);

  return (
    <ModuleLayout
      title="Subscriptions"
      description="Manage client subscription plans and recurring billing"
      icon={<Repeat2 className="h-5 w-5" />}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatsCard
          label="Active Subscriptions"
          value={stats.active}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          color="border-l-emerald-500"
        />
        <StatsCard
          label="Trial"
          value={stats.trial}
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          color="border-l-blue-500"
        />
        <StatsCard
          label="Monthly Recurring Revenue"
          value={`$${stats.mrr.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          icon={<DollarSign className="h-4 w-4 text-violet-500" />}
          color="border-l-violet-500"
        />
        <StatsCard
          label="Suspended / Cancelled"
          value={stats.suspended}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          color="border-l-amber-500"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-36">
            <RefreshCw className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-2" onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> New Subscription
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Client</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing Cycle</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Renewal Date</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Auto-Renew</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <Repeat2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub: any) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{sub.clientName}</TableCell>
                    <TableCell>{sub.planName || sub.planId}</TableCell>
                    <TableCell><StatusBadge status={sub.status} /></TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                        {sub.billingCycle === "annual" ? "Annual" : "Monthly"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {parseFloat(sub.currentPrice || "0") === 0 ? (
                        <span className="text-muted-foreground">Free Trial</span>
                      ) : (
                        <span>${parseFloat(sub.currentPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        {sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" /> {sub.usersCount || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs border-0", sub.autoRenew ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40" : "bg-slate-100 text-slate-600 dark:bg-slate-800")}>
                        {sub.autoRenew ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedSub(sub); setViewOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setSelectedSub(sub);
                          setForm({
                            clientId: sub.clientId || "",
                            frequency: sub.billingCycle === "annual" ? "annually" : "monthly",
                            startDate: sub.startDate ? new Date(sub.startDate).toISOString().split("T")[0] : "",
                            endDate: sub.renewalDate ? new Date(sub.renewalDate).toISOString().split("T")[0] : "",
                            description: sub.planName || "",
                            noteToInvoice: "",
                          });
                          setEditOpen(true);
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                          if (confirm("Delete this subscription?")) deleteMutation.mutate(sub.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Subscription Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Subscription</DialogTitle>
            <DialogDescription>Create a recurring billing subscription for a client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {(clients as any[]).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name || c.businessName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly hosting plan" />
            </div>
            <div>
              <Label>Template Invoice (optional)</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, templateInvoiceId: v } as any))}>
                <SelectTrigger><SelectValue placeholder="Select an invoice as template" /></SelectTrigger>
                <SelectContent>
                  {(invoicesList as any[]).slice(0, 50).map((inv: any) => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.clientName || "Client"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note to Invoice</Label>
              <Textarea value={form.noteToInvoice} onChange={e => setForm(f => ({ ...f, noteToInvoice: e.target.value }))} placeholder="Optional note added to generated invoices" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.clientId || createMutation.isPending}
              onClick={() => {
                const templateId = (form as any).templateInvoiceId;
                if (!templateId) {
                  toast.error("Please select a template invoice");
                  return;
                }
                createMutation.mutate({
                  clientId: form.clientId,
                  templateInvoiceId: templateId,
                  frequency: form.frequency,
                  startDate: new Date(form.startDate).toISOString(),
                  endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                  description: form.description || undefined,
                  noteToInvoice: form.noteToInvoice || undefined,
                });
              }}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>Update the subscription details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={selectedSub?.status === "active" ? "true" : "false"} onValueChange={v => {
                if (selectedSub) toggleMutation.mutate({ id: selectedSub.id, isActive: v === "true" });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => {
                if (!selectedSub) return;
                updateMutation.mutate({
                  id: selectedSub.id,
                  frequency: form.frequency,
                  endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                  description: form.description || undefined,
                });
              }}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Subscription Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-medium">{selectedSub.clientName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium">{selectedSub.planName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={selectedSub.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Billing Cycle</span><span>{selectedSub.billingCycle === "annual" ? "Annual" : "Monthly"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">${parseFloat(selectedSub.currentPrice || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Start Date</span><span>{selectedSub.startDate ? new Date(selectedSub.startDate).toLocaleDateString() : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Renewal Date</span><span>{selectedSub.renewalDate ? new Date(selectedSub.renewalDate).toLocaleDateString() : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Auto-Renew</span><span>{selectedSub.autoRenew ? "Yes" : "No"}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
