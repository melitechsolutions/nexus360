import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Target,
  Plus,
  Search,
  Loader2,
  ArrowRight,
  DollarSign,
  User,
  Calendar,
  Tag,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Stage = "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

const COLUMNS: { id: Stage; label: string; color: string; border: string; header: string }[] = [
  { id: "lead", label: "New Leads", color: "bg-slate-50 dark:bg-slate-900/50", border: "border-t-slate-400", header: "text-slate-600 dark:text-slate-400" },
  { id: "qualified", label: "Qualified", color: "bg-blue-50 dark:bg-blue-900/10", border: "border-t-blue-500", header: "text-blue-600 dark:text-blue-400" },
  { id: "proposal", label: "Proposal Sent", color: "bg-violet-50 dark:bg-violet-900/10", border: "border-t-violet-500", header: "text-violet-600 dark:text-violet-400" },
  { id: "negotiation", label: "Negotiation", color: "bg-amber-50 dark:bg-amber-900/10", border: "border-t-amber-500", header: "text-amber-600 dark:text-amber-400" },
  { id: "closed_won", label: "Converted", color: "bg-emerald-50 dark:bg-emerald-900/10", border: "border-t-emerald-500", header: "text-emerald-600 dark:text-emerald-400" },
  { id: "closed_lost", label: "Lost", color: "bg-red-50 dark:bg-red-900/10", border: "border-t-red-500", header: "text-red-600 dark:text-red-400" },
];

const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  lead: "qualified",
  qualified: "proposal",
  proposal: "negotiation",
  negotiation: "closed_won",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function fmt(v: number) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

interface LeadCard {
  id: string | number;
  title: string;
  clientName?: string;
  value?: number | string;
  stage: Stage;
  priority?: string;
  source?: string;
  assignedTo?: string;
  closeDate?: string;
}

export default function Leads() {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setShowAdd(true); }, []);
  const [form, setForm] = useState({ title: "", value: "", stage: "lead" as Stage, priority: "medium", source: "" });

  const { data: opps = [], isLoading, refetch } = trpc.opportunities.list.useQuery({});
  const updateMutation = trpc.opportunities.update.useMutation({
    onSuccess: () => { refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const createMutation = trpc.opportunities.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); setForm({ title: "", value: "", stage: "lead", priority: "medium", source: "" }); },
    onError: (err) => toast.error(err.message),
  });

  const leads: LeadCard[] = useMemo(() =>
    (opps as any[]).map((o: any) => ({
      id: o.id,
      title: o.name || o.title || "Untitled",
      clientName: o.clientName || o.contactName || "",
      value: o.value || o.amount || 0,
      stage: (o.stage || "lead") as Stage,
      priority: o.priority || "medium",
      source: o.source || "",
      assignedTo: o.assignedToName || "",
      closeDate: o.expectedCloseDate || o.closeDate || "",
    })), [opps]);

  const filtered = useMemo(() => leads.filter(l => {
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) && !l.clientName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== "all" && l.priority !== priorityFilter) return false;
    return true;
  }), [leads, search, priorityFilter]);

  const byStage = useMemo(() => {
    const m: Record<Stage, LeadCard[]> = { lead: [], qualified: [], proposal: [], negotiation: [], closed_won: [], closed_lost: [] };
    filtered.forEach(l => { (m[l.stage] || m.lead).push(l); });
    return m;
  }, [filtered]);

  const totalValue = useMemo(() => leads.filter(l => l.stage !== "closed_lost").reduce((a, l) => a + Number(l.value || 0), 0), [leads]);
  const wonValue = useMemo(() => leads.filter(l => l.stage === "closed_won").reduce((a, l) => a + Number(l.value || 0), 0), [leads]);

  function moveStage(lead: LeadCard, nextStage: Stage) {
    updateMutation.mutate({ id: String(lead.id), stage: nextStage });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    createMutation.mutate({
      title: form.title,
      value: parseFloat(form.value) || 0,
      stage: form.stage,
      source: form.source,
    } as any);
  }

  return (
    <ModuleLayout
      title="Leads"
      description="Track and manage your sales pipeline from lead to close"
      icon={<Target className="h-5 w-5" />}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Leads</p>
          <p className="text-2xl font-bold">{leads.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Pipeline Value</p>
          <p className="text-2xl font-bold text-violet-600">{fmt(totalValue)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Converted</p>
          <p className="text-2xl font-bold text-emerald-600">{leads.filter(l => l.stage === "closed_won").length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Revenue Won</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(wonValue)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => {
            const cards = byStage[col.id] || [];
            const colValue = cards.reduce((a, l) => a + Number(l.value || 0), 0);
            return (
              <div key={col.id} className={cn("flex flex-col min-w-[240px] flex-1 rounded-lg border-t-4 border", col.border, col.color)}>
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={cn("font-semibold text-sm", col.header)}>{col.label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmt(colValue)} · {cards.length} leads</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{cards.length}</Badge>
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[520px]">
                  {cards.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No leads here</p>
                  )}
                  {cards.map(lead => (
                    <div key={lead.id} className="bg-background border rounded-lg p-3 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-sm leading-tight">{lead.title}</p>
                        {lead.priority && (
                          <Badge variant="outline" className={cn("text-[10px] border-0 shrink-0", PRIORITY_STYLES[lead.priority])}>
                            {lead.priority}
                          </Badge>
                        )}
                      </div>
                      {lead.clientName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" /> {lead.clientName}
                        </p>
                      )}
                      {Number(lead.value) > 0 && (
                        <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {fmt(Number(lead.value))}
                        </p>
                      )}
                      {lead.source && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {lead.source}
                        </p>
                      )}
                      {lead.closeDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(lead.closeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </p>
                      )}
                      {NEXT_STAGE[col.id] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs gap-1 mt-1"
                          disabled={updateMutation.isPending}
                          onClick={() => moveStage(lead, NEXT_STAGE[col.id]!)}
                        >
                          Move to {COLUMNS.find(c => c.id === NEXT_STAGE[col.id])?.label}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                      {col.id === "negotiation" && (
                        <div className="flex gap-1 mt-1">
                          <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-emerald-600 gap-1" disabled={updateMutation.isPending} onClick={() => moveStage(lead, "closed_won")}>
                            <CheckCircle2 className="h-3 w-3" /> Won
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs text-red-600 gap-1" disabled={updateMutation.isPending} onClick={() => moveStage(lead, "closed_lost")}>
                            <XCircle className="h-3 w-3" /> Lost
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" /> Add Lead
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="lead-title">Lead Title *</Label>
              <Input id="lead-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Website Redesign for Acme" className="mt-1" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lead-value">Value ($)</Label>
                <Input id="lead-value" type="number" min="0" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="lead-stage">Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v as Stage }))}>
                  <SelectTrigger className="mt-1" id="lead-stage"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lead-priority">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1" id="lead-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="lead-source">Source</Label>
                <Input id="lead-source" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Referral, Web, etc." className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
