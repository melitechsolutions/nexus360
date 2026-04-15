import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Calendar, Search, ArrowLeft, Lock, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  cancelled: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "pending").toLowerCase();
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
        <p className="text-white/50 text-sm mb-6">Leave Management is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["all", "pending", "approved", "rejected", "cancelled"];
const LEAVE_TYPES = ["all", "annual", "sick", "maternity", "paternity", "unpaid", "study", "compassionate"];

export default function OrgLeave() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: leaves = [], isLoading } = trpc.leave.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.leave }
  );

  const accessGranted = !myOrgData || featureMap.leave;

  const filtered = (leaves as any[]).filter((l) => {
    const matchStatus = activeStatus === "all" || l.status?.toLowerCase() === activeStatus;
    const matchSearch = !search ||
      l.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      l.leaveType?.toLowerCase().includes(search.toLowerCase()) ||
      l.reason?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pending = (leaves as any[]).filter((l) => l.status === "pending").length;
  const approved = (leaves as any[]).filter((l) => l.status === "approved").length;
  const totalDays = (leaves as any[]).reduce((s, l) => {
    if (!l.startDate || !l.endDate) return s;
    const diff = (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000;
    return s + Math.max(0, diff + 1);
  }, 0);

  return (
    <OrgLayout title="Leave Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Leave" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Requests", value: String(leaves.length), color: "from-blue-600/20 to-blue-600/5" },
                { label: "Pending", value: String(pending), color: "from-yellow-600/20 to-yellow-600/5" },
                { label: "Approved", value: String(approved), color: "from-green-600/20 to-green-600/5" },
                { label: "Total Days Off", value: String(Math.round(totalDays)), color: "from-indigo-600/20 to-indigo-600/5" },
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
                      ({s === "all" ? leaves.length : (leaves as any[]).filter((l) => l.status?.toLowerCase() === s).length})
                    </span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by employee or leave type..."
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setLocation("/crm/leave/new")}>
                  <Plus className="h-4 w-4 mr-1" /> New Request
                </Button>
              </div>
            </div>

            {/* Leave Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <Calendar className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search || activeStatus !== "all" ? "No leave requests match your filters" : "No leave requests yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-4">Employee</div>
                      <div className="col-span-2">Leave Type</div>
                      <div className="col-span-3">Dates</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1 text-right">Days</div>
                    </div>
                    {filtered.map((l: any) => {
                      const days = l.startDate && l.endDate
                        ? Math.max(1, Math.round((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1)
                        : "—";
                      return (
                        <div key={l.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-white/5 transition-colors">
                          <div className="col-span-4">
                            <p className="text-sm font-medium text-white">{l.employeeName || "Unknown"}</p>
                            <p className="text-xs text-white/40">{l.employeeEmail || "—"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-white/70 capitalize">{l.leaveType || "Annual"}</p>
                          </div>
                          <div className="col-span-3">
                            <p className="text-xs text-white/60">
                              {l.startDate ? new Date(l.startDate).toLocaleDateString() : "—"}
                              {l.endDate && ` – ${new Date(l.endDate).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="col-span-2"><StatusBadge status={l.status} /></div>
                          <div className="col-span-1 text-right">
                            <p className="text-sm text-white/60">{days}</p>
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
