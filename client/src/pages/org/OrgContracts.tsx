import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FileCheck, Search, ArrowLeft, Lock, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  signed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  expired: "bg-red-500/20 text-red-300 border-red-500/30",
  terminated: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  completed: "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "draft").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_STYLES[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s}
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
        <p className="text-white/50 text-sm mb-6">Contracts is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["all", "active", "draft", "pending", "signed", "expired", "terminated"];

export default function OrgContracts() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: contractsData, isLoading } = trpc.contracts.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.contracts }
  );

  const accessGranted = !myOrgData || featureMap.contracts;
  const contracts = (contractsData as any)?.data ?? (Array.isArray(contractsData) ? contractsData : []);

  const filtered = (contracts as any[]).filter((c) => {
    const matchStatus = activeStatus === "all" || c.status?.toLowerCase() === activeStatus;
    const matchSearch = !search ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.contractNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      c.partyName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const active = (contracts as any[]).filter((c) => c.status === "active").length;
  const expiring = (contracts as any[]).filter((c) => {
    if (!c.endDate) return false;
    const days = (new Date(c.endDate).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 30;
  }).length;
  const totalValue = (contracts as any[]).reduce((s, c) => s + Number(c.value || c.totalValue || 0), 0);

  return (
    <OrgLayout title="Contracts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Contracts" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Contracts", value: String(contracts.length), color: "from-blue-600/20 to-blue-600/5" },
                { label: "Active", value: String(active), color: "from-green-600/20 to-green-600/5" },
                { label: "Expiring (30 days)", value: String(expiring), color: "from-amber-600/20 to-amber-600/5" },
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
                      ({s === "all" ? contracts.length : (contracts as any[]).filter((c) => c.status?.toLowerCase() === s).length})
                    </span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contracts..."
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setLocation("/crm/contracts/new")}>
                  <Plus className="h-4 w-4 mr-1" /> New Contract
                </Button>
              </div>
            </div>

            {/* Contracts Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <FileCheck className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search || activeStatus !== "all" ? "No contracts match your filters" : "No contracts yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-4">Contract</div>
                      <div className="col-span-3">Party / Client</div>
                      <div className="col-span-2">End Date</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1 text-right">Value</div>
                    </div>
                    {filtered.map((c: any) => {
                      const isExpiringSoon = c.endDate && (() => {
                        const days = (new Date(c.endDate).getTime() - Date.now()) / 86400000;
                        return days >= 0 && days <= 30;
                      })();
                      return (
                        <div key={c.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                          <div className="col-span-4">
                            <p className="text-sm font-medium text-white truncate">{c.title || c.name || "Untitled"}</p>
                            <p className="text-xs text-white/40">{c.contractNumber || `CON-${c.id?.slice(0, 8)}`}</p>
                          </div>
                          <div className="col-span-3">
                            <p className="text-sm text-white/70 truncate">{c.clientName || c.partyName || c.counterparty || "—"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className={`text-sm ${isExpiringSoon ? "text-amber-400 font-medium" : "text-white/60"}`}>
                              {c.endDate ? new Date(c.endDate).toLocaleDateString() : "—"}
                            </p>
                            {isExpiringSoon && <p className="text-xs text-amber-400/70">Expiring soon</p>}
                          </div>
                          <div className="col-span-2"><StatusBadge status={c.status} /></div>
                          <div className="col-span-1 text-right">
                            <p className="text-xs text-white/60">
                              {c.value || c.totalValue ? `${(Number(c.value || c.totalValue) / 1000).toFixed(0)}K` : "—"}
                            </p>
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
