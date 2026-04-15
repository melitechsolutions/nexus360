import React, { useState } from "react";
import { useParams } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus, DollarSign, TrendingUp, CheckCircle2, XCircle, GripVertical,
  Target, BarChart3, Lock,
} from "lucide-react";

const STAGE_ORDER = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];

const STAGE_META: Record<string, { label: string; color: string; headerBg: string }> = {
  lead: { label: "Lead", color: "text-blue-400", headerBg: "bg-blue-500/10 border-blue-500/20" },
  qualified: { label: "Qualified", color: "text-cyan-400", headerBg: "bg-cyan-500/10 border-cyan-500/20" },
  proposal: { label: "Proposal", color: "text-yellow-400", headerBg: "bg-yellow-500/10 border-yellow-500/20" },
  negotiation: { label: "Negotiating", color: "text-orange-400", headerBg: "bg-orange-500/10 border-orange-500/20" },
  closed_won: { label: "Won ✓", color: "text-green-400", headerBg: "bg-green-500/10 border-green-500/20" },
  closed_lost: { label: "Lost", color: "text-red-400", headerBg: "bg-red-500/10 border-red-500/20" },
};

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${n.toFixed(0)}`;
}

type Opportunity = {
  id: string;
  clientId: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  source: string | null;
  notes: string | null;
};

export default function OrgSalesPipeline() {
  const params = useParams();
  const slug = params.slug as string;

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [moveDialog, setMoveDialog] = useState<{ oppId: string; newStage: string } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [form, setForm] = useState({
    clientId: "", title: "", description: "", value: 0,
    probability: 50, expectedCloseDate: "", source: "",
  });

  const { data: orgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = orgData?.featureMap ?? {};
  const hasAccess = !orgData || featureMap.crm;

  const boardQuery = trpc.salesPipeline.getPipelineBoard.useQuery(undefined, { enabled: !!hasAccess });
  const clientsQuery = trpc.clients.list.useQuery(undefined, { enabled: !!hasAccess });

  const createMutation = trpc.salesPipeline.create.useMutation({
    onSuccess: () => { toast.success("Opportunity created"); boardQuery.refetch(); setCreateOpen(false); setForm({ clientId: "", title: "", description: "", value: 0, probability: 50, expectedCloseDate: "", source: "" }); },
    onError: (e) => toast.error(e.message || "Failed to create"),
  });

  const moveMutation = trpc.salesPipeline.moveOpportunity.useMutation({
    onSuccess: () => { toast.success("Deal moved"); boardQuery.refetch(); setMoveDialog(null); setReasonText(""); },
    onError: (e) => toast.error(e.message || "Failed to move"),
  });

  const handleDragStart = (e: React.DragEvent, oppId: string, stage: string) => {
    setDraggedId(oppId);
    setDragSource(stage);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedId || dragSource === targetStage) { setDraggedId(null); return; }
    if (targetStage === "closed_won" || targetStage === "closed_lost") {
      setMoveDialog({ oppId: draggedId, newStage: targetStage });
    } else {
      moveMutation.mutate({ id: draggedId, newStage: targetStage as any });
    }
    setDraggedId(null);
    setDragSource(null);
  };

  const handleConfirmMove = () => {
    if (!moveDialog) return;
    if (!reasonText) { toast.error("Please provide a reason"); return; }
    const isWon = moveDialog.newStage === "closed_won";
    moveMutation.mutate({
      id: moveDialog.oppId,
      newStage: moveDialog.newStage as any,
      winReason: isWon ? reasonText : undefined,
      lossReason: !isWon ? reasonText : undefined,
    });
  };

  const board = boardQuery.data;
  const clients = clientsQuery.data || [];

  // Stats
  const allOpps: Opportunity[] = board?.stages?.flatMap((s: any) => s.opportunities) ?? [];
  const wonOpps = allOpps.filter((o) => o.stage === "closed_won");
  const activeOpps = allOpps.filter((o) => !["closed_won", "closed_lost"].includes(o.stage));
  const totalPipeline = activeOpps.reduce((s, o) => s + (o.value || 0), 0);
  const weightedForecast = activeOpps.reduce((s, o) => s + (o.value || 0) * ((o.probability || 0) / 100), 0);

  if (!hasAccess) {
    return (
      <OrgLayout title="Sales Pipeline">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-20 text-center">
            <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg">CRM Access Required</p>
            <p className="text-white/50 text-sm mt-2">Enable the CRM module to use the sales pipeline.</p>
          </CardContent>
        </Card>
      </OrgLayout>
    );
  }

  return (
    <OrgLayout title="Sales Pipeline">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Sales Pipeline" }]} />
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Deal
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {boardQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 bg-white/5 rounded-lg" />)
          ) : (
            <>
              <Card className="bg-blue-600/10 border-blue-500/20">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-blue-300/70 uppercase tracking-wide">Active Deals</p>
                  <p className="text-2xl font-bold text-white mt-1">{activeOpps.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-600/10 border-purple-500/20">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-purple-300/70 uppercase tracking-wide">Pipeline Value</p>
                  <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalPipeline)}</p>
                </CardContent>
              </Card>
              <Card className="bg-teal-600/10 border-teal-500/20">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-teal-300/70 uppercase tracking-wide">Weighted Forecast</p>
                  <p className="text-2xl font-bold text-white mt-1">{formatCurrency(weightedForecast)}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-600/10 border-green-500/20">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-green-300/70 uppercase tracking-wide">Won This Period</p>
                  <p className="text-2xl font-bold text-white mt-1">{wonOpps.length}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Kanban Board — horizontal scroll on mobile */}
        {boardQuery.isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-52 shrink-0 bg-white/5 rounded-lg" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
            {STAGE_ORDER.map((stageId) => {
              const meta = STAGE_META[stageId];
              const stageData = board?.stages?.find((s: any) => s.id === stageId);
              const opps: Opportunity[] = stageData?.opportunities ?? [];
              const stageValue = opps.reduce((s, o) => s + (o.value || 0), 0);

              return (
                <div
                  key={stageId}
                  className="shrink-0 w-52 sm:w-60 flex flex-col rounded-xl border bg-white/3 border-white/10"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, stageId)}
                >
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b ${meta.headerBg}`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>{meta.label}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{formatCurrency(stageValue)}</p>
                    </div>
                    <Badge variant="outline" className="border-white/10 text-white/50 text-[10px] h-5">
                      {opps.length}
                    </Badge>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto" style={{ maxHeight: 480 }}>
                    {opps.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-8 text-white/20 text-xs text-center gap-1">
                        <Target className="h-6 w-6 opacity-40" />
                        <span>Drop deals here</span>
                      </div>
                    ) : (
                      opps.map((opp) => (
                        <div
                          key={opp.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, opp.id, stageId)}
                          className={`group rounded-lg bg-white/5 border border-white/10 p-3 cursor-grab active:cursor-grabbing hover:bg-white/8 hover:border-white/20 transition-all ${draggedId === opp.id ? "opacity-40 scale-95" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{opp.title}</p>
                            <GripVertical className="h-3.5 w-3.5 text-white/20 shrink-0 mt-0.5 group-hover:text-white/40" />
                          </div>
                          <p className="text-sm font-bold text-white/90 mt-1.5">{formatCurrency(opp.value)}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-white/40">{opp.probability}% likely</span>
                            {opp.expectedCloseDate && (
                              <span className="text-[10px] text-white/40">
                                {new Date(opp.expectedCloseDate).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                          {/* Probability bar */}
                          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${opp.probability}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Opportunity Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-[#1a1f2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">New Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-white/70 text-xs">Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name || c.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Deal Title *</Label>
              <Input
                className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder="e.g. Website Redesign Project"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70 text-xs">Deal Value (KES)</Label>
                <Input
                  type="number"
                  className="mt-1 bg-white/5 border-white/10 text-white"
                  value={form.value || ""}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Probability (%)</Label>
                <Input
                  type="number"
                  min={0} max={100}
                  className="mt-1 bg-white/5 border-white/10 text-white"
                  value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Expected Close Date</Label>
              <Input
                type="date"
                className="mt-1 bg-white/5 border-white/10 text-white"
                value={form.expectedCloseDate}
                onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" className="text-white/50 hover:text-white" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  if (!form.clientId || !form.title) { toast.error("Client and title are required"); return; }
                  createMutation.mutate({
                    clientId: form.clientId,
                    title: form.title,
                    value: form.value,
                    probability: form.probability,
                    expectedCloseDate: form.expectedCloseDate ? `${form.expectedCloseDate}T12:00:00Z` : undefined,
                    source: form.source || undefined,
                  });
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Reason Dialog */}
      <Dialog open={!!moveDialog} onOpenChange={() => { setMoveDialog(null); setReasonText(""); }}>
        <DialogContent className="max-w-sm bg-[#1a1f2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {moveDialog?.newStage === "closed_won" ? "Mark as Won 🎉" : "Mark as Lost"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Label className="text-white/70 text-xs">
              {moveDialog?.newStage === "closed_won" ? "Win reason" : "Loss reason"} *
            </Label>
            <Textarea
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              placeholder={moveDialog?.newStage === "closed_won" ? "e.g. Strong relationship, competitive pricing" : "e.g. Budget constraints, went with competitor"}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="text-white/50" onClick={() => { setMoveDialog(null); setReasonText(""); }}>Cancel</Button>
              <Button
                className={moveDialog?.newStage === "closed_won" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                onClick={handleConfirmMove}
                disabled={moveMutation.isPending}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OrgLayout>
  );
}
