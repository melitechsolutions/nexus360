import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { useUserLookup } from "@/hooks/useUserLookup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Wrench, Search, ArrowLeft, Lock, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  open: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "in-progress": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  completed: "bg-green-500/20 text-green-300 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  high: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "open").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_STYLES[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = (priority ?? "medium").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${PRIORITY_STYLES[p] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {p}
    </span>
  );
}

function AccessDenied({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="py-20 text-center">
        <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
        <p className="text-white/50 text-sm mb-6">Work Orders is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["all", "open", "in-progress", "completed", "draft", "cancelled"];

export default function OrgWorkOrders() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const { getUserName } = useUserLookup();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: workOrders = [], isLoading } = trpc.workOrders.list.useQuery(
    undefined,
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.work_orders }
  );

  const accessGranted = !myOrgData || featureMap.work_orders;

  const filtered = (workOrders as any[]).filter((w) => {
    const matchStatus = activeStatus === "all" || w.status?.toLowerCase() === activeStatus;
    const matchSearch = !search ||
      w.workOrderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      w.description?.toLowerCase().includes(search.toLowerCase()) ||
      w.assignedTo?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const open = (workOrders as any[]).filter((w) => w.status === "open").length;
  const inProgress = (workOrders as any[]).filter((w) => w.status === "in-progress").length;
  const completed = (workOrders as any[]).filter((w) => w.status === "completed").length;
  const totalCost = (workOrders as any[]).reduce((s, w) => s + Number(w.total || 0), 0);

  return (
    <OrgLayout title="Work Orders">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Work Orders" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Work Orders", value: String(workOrders.length), color: "from-blue-600/20 to-blue-600/5" },
                { label: "Open", value: String(open), color: "from-indigo-600/20 to-indigo-600/5" },
                { label: "In Progress", value: String(inProgress), color: "from-amber-600/20 to-amber-600/5" },
                { label: "Completed", value: String(completed), color: "from-green-600/20 to-green-600/5" },
              ].map((k) => (
                <Card key={k.label} className={`bg-gradient-to-br ${k.color} border-white/10`}>
                  <CardHeader className="pb-1 pt-4">
                    <CardTitle className="text-xs font-medium text-white/60">{k.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-xl font-bold text-white">{k.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {STATUSES.map((s) => (
                  <Button key={s} variant="ghost" size="sm"
                    className={`capitalize text-xs ${activeStatus === s ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
                    onClick={() => setActiveStatus(s)}>
                    {s} <span className="ml-1.5 text-white/30">
                      ({s === "all" ? workOrders.length : (workOrders as any[]).filter((w) => w.status?.toLowerCase() === s).length})
                    </span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search work orders..."
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setLocation("/crm/work-orders/new")}>
                  <Plus className="h-4 w-4 mr-1" /> New Work Order
                </Button>
              </div>
            </div>

            {/* Work Orders Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <Wrench className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search || activeStatus !== "all" ? "No work orders match your filters" : "No work orders yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-3">Work Order #</div>
                      <div className="col-span-3">Description</div>
                      <div className="col-span-2">Priority</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2 text-right">Total Cost</div>
                    </div>
                    {filtered.map((w: any) => (
                      <div key={w.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-3">
                          <p className="text-sm font-medium text-white">{w.workOrderNumber || `WO-${w.id?.slice(0, 8)}`}</p>
                          <p className="text-xs text-white/40">{w.issueDate ? new Date(w.issueDate).toLocaleDateString() : "—"}</p>
                        </div>
                        <div className="col-span-3">
                          <p className="text-sm text-white/70 truncate">{w.description || "—"}</p>
                          {w.assignedTo && <p className="text-xs text-white/40">Assigned: {getUserName(w.assignedTo)}</p>}
                        </div>
                        <div className="col-span-2"><PriorityBadge priority={w.priority} /></div>
                        <div className="col-span-2"><StatusBadge status={w.status} /></div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-semibold text-white">KES {Number(w.total || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </OrgLayout>
  );
}
