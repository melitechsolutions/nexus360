import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ShoppingCart, Search, ArrowLeft, Lock, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  ordered: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  received: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  cancelled: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const CAT_STYLES: Record<string, string> = {
  equipment: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  supplies: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  services: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  materials: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "pending").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_STYLES[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s}
    </span>
  );
}

function CatBadge({ cat }: { cat?: string }) {
  const c = (cat ?? "").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${CAT_STYLES[c] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {c || "General"}
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
        <p className="text-white/50 text-sm mb-6">Procurement is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["all", "pending", "approved", "ordered", "received", "rejected"];

export default function OrgProcurement() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: requests = [], isLoading } = trpc.procurement.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.procurement }
  );

  const accessGranted = !myOrgData || featureMap.procurement;

  const filtered = (requests as any[]).filter((r) => {
    const matchStatus = activeStatus === "all" || r.status?.toLowerCase() === activeStatus;
    const matchSearch = !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalValue = (requests as any[]).reduce((s, r) => s + (Number(r.price || 0) * Number(r.quantity || 1)), 0);
  const pending = (requests as any[]).filter((r) => r.status === "pending").length;
  const approved = (requests as any[]).filter((r) => r.status === "approved").length;

  return (
    <OrgLayout title="Procurement">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Procurement" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Requests", value: String(requests.length), color: "from-blue-600/20 to-blue-600/5" },
                { label: "Pending", value: String(pending), color: "from-yellow-600/20 to-yellow-600/5" },
                { label: "Approved", value: String(approved), color: "from-green-600/20 to-green-600/5" },
                { label: "Total Value", value: `KES ${totalValue.toLocaleString()}`, color: "from-purple-600/20 to-purple-600/5" },
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
                      ({s === "all" ? requests.length : (requests as any[]).filter((r) => r.status?.toLowerCase() === s).length})
                    </span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search procurement requests..."
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setLocation("/crm/procurement/new")}>
                  <Plus className="h-4 w-4 mr-1" /> New Request
                </Button>
              </div>
            </div>

            {/* Procurement Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <ShoppingCart className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search || activeStatus !== "all" ? "No requests match your filters" : "No procurement requests yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-4">Item</div>
                      <div className="col-span-2">Category</div>
                      <div className="col-span-2">Qty × Price</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2 text-right">Total</div>
                    </div>
                    {filtered.map((r: any) => {
                      const total = Number(r.price || 0) * Number(r.quantity || 1);
                      return (
                        <div key={r.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                          <div className="col-span-4">
                            <p className="text-sm font-medium text-white truncate">{r.name}</p>
                            <p className="text-xs text-white/40 truncate">{r.description || "—"}</p>
                          </div>
                          <div className="col-span-2"><CatBadge cat={r.category} /></div>
                          <div className="col-span-2">
                            <p className="text-sm text-white/70">{r.quantity || 1} × {Number(r.price || 0).toLocaleString()}</p>
                          </div>
                          <div className="col-span-2"><StatusBadge status={r.status} /></div>
                          <div className="col-span-2 text-right">
                            <p className="text-sm font-semibold text-white">KES {total.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
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
