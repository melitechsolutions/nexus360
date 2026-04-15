import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Ticket, Search, ArrowLeft, Lock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "in-progress": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  resolved: "bg-green-500/20 text-green-300 border-green-500/30",
  closed: "bg-white/10 text-white/50 border-white/20",
  cancelled: "bg-white/10 text-white/40 border-white/20",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-white/10 text-white/60 border-white/20",
  medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-300 border-red-500/30",
  critical: "bg-red-600/30 text-red-200 border-red-500/50",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "open").toLowerCase();
  const label = s.replace("_", "-");
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_STYLES[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {label}
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
        <p className="text-white/50 text-sm mb-6">Tickets is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["all", "open", "in-progress", "resolved", "closed"];

export default function OrgTickets() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: ticketsData, isLoading } = trpc.tickets.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.tickets }
  );

  const accessGranted = !myOrgData || featureMap.tickets;
  const allTickets = Array.isArray(ticketsData) ? ticketsData : (ticketsData as any)?.data ?? [];

  const filtered = (allTickets as any[]).filter((t) => {
    const matchStatus = activeStatus === "all" ||
      t.status?.toLowerCase() === activeStatus ||
      t.status?.toLowerCase() === activeStatus.replace("-", "_");
    const matchSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const total = (allTickets as any[]).length;
  const open = (allTickets as any[]).filter((t) => t.status === "open").length;
  const inProgress = (allTickets as any[]).filter((t) => ["in-progress", "in_progress"].includes(t.status)).length;
  const resolved = (allTickets as any[]).filter((t) => t.status === "resolved").length;

  return (
    <OrgLayout title="Tickets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Tickets" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Tickets", value: String(total), color: "from-violet-600/20 to-violet-600/5" },
                { label: "Open", value: String(open), color: "from-blue-600/20 to-blue-600/5" },
                { label: "In Progress", value: String(inProgress), color: "from-yellow-600/20 to-yellow-600/5" },
                { label: "Resolved", value: String(resolved), color: "from-green-600/20 to-green-600/5" },
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1">
                {STATUSES.map((s) => (
                  <Button key={s} variant="ghost" size="sm"
                    className={`capitalize text-xs ${activeStatus === s ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
                    onClick={() => setActiveStatus(s)}>
                    {s}
                  </Button>
                ))}
              </div>
              <div className="relative sm:ml-auto max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets..."
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white whitespace-nowrap"
                onClick={() => setLocation("/crm/tickets/new")}>
                <AlertCircle className="h-4 w-4 mr-1" /> New Ticket
              </Button>
            </div>

            {/* Tickets Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <Ticket className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search || activeStatus !== "all" ? "No tickets match your filters" : "No tickets yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-4">Title</div>
                      <div className="col-span-2">Category</div>
                      <div className="col-span-2">Priority</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Created</div>
                    </div>
                    {filtered.map((t: any) => (
                      <div key={t.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-4">
                          <p className="text-sm font-medium text-white truncate">{t.title || "Untitled"}</p>
                          {t.description && <p className="text-xs text-white/40 truncate">{t.description}</p>}
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-white/60 capitalize">{t.category || "—"}</span>
                        </div>
                        <div className="col-span-2"><PriorityBadge priority={t.priority} /></div>
                        <div className="col-span-2"><StatusBadge status={t.status} /></div>
                        <div className="col-span-2">
                          <p className="text-xs text-white/60">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</p>
                          {t.requestedDueDate && (
                            <p className="text-xs text-white/40">Due: {new Date(t.requestedDueDate).toLocaleDateString()}</p>
                          )}
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
