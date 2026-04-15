import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Briefcase, Search, ArrowLeft, Lock, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  planning: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "on-hold": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  completed: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  high: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "planning").toLowerCase();
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

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-white/30";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/50 w-9 text-right">{pct}%</span>
    </div>
  );
}

function AccessDenied({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="py-20 text-center">
        <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
        <p className="text-white/50 text-sm mb-6">Projects is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["all", "active", "planning", "on-hold", "completed", "cancelled"];

export default function OrgProjects() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: projects = [], isLoading } = trpc.projects.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.projects }
  );

  const accessGranted = !myOrgData || featureMap.projects;

  const filtered = (projects as any[]).filter((p) => {
    const matchStatus = activeStatus === "all" || p.status?.toLowerCase() === activeStatus;
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.projectNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const active = (projects as any[]).filter((p) => p.status === "active").length;
  const completed = (projects as any[]).filter((p) => p.status === "completed").length;
  const totalBudget = (projects as any[]).reduce((s, p) => s + Number(p.budget || 0), 0);
  const avgProgress = projects.length > 0
    ? Math.round((projects as any[]).reduce((s, p) => s + Number(p.progress || 0), 0) / projects.length)
    : 0;

  return (
    <OrgLayout title="Projects">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Projects" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Projects", value: String(projects.length), color: "from-blue-600/20 to-blue-600/5" },
                { label: "Active", value: String(active), color: "from-green-600/20 to-green-600/5" },
                { label: "Completed", value: String(completed), color: "from-slate-600/20 to-slate-600/5" },
                { label: "Avg. Progress", value: `${avgProgress}%`, color: "from-indigo-600/20 to-indigo-600/5" },
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

            {/* Filters + Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {STATUSES.map((s) => (
                  <Button key={s} variant="ghost" size="sm"
                    className={`capitalize text-xs ${activeStatus === s ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
                    onClick={() => setActiveStatus(s)}>
                    {s} <span className="ml-1.5 text-white/30">
                      ({s === "all" ? projects.length : (projects as any[]).filter((p) => p.status?.toLowerCase() === s).length})
                    </span>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..."
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setLocation("/crm/projects/new")}>
                  <Plus className="h-4 w-4 mr-1" /> New Project
                </Button>
              </div>
            </div>

            {/* Projects Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <Briefcase className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search || activeStatus !== "all" ? "No projects match your filters" : "No projects yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-4">Project</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Priority</div>
                      <div className="col-span-3">Progress</div>
                      <div className="col-span-1 text-right">Budget</div>
                    </div>
                    {filtered.map((p: any) => (
                      <div key={p.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setLocation(`/org/${slug}/projects/${p.id}`)}>
                        <div className="col-span-4">
                          <p className="text-sm font-medium text-white truncate">{p.name}</p>
                          <p className="text-xs text-white/40">{p.projectNumber || `PRJ-${p.id.slice(0, 8)}`}</p>
                        </div>
                        <div className="col-span-2"><StatusBadge status={p.status} /></div>
                        <div className="col-span-2"><PriorityBadge priority={p.priority} /></div>
                        <div className="col-span-3"><ProgressBar value={Number(p.progress || 0)} /></div>
                        <div className="col-span-1 text-right">
                          <p className="text-xs text-white/60">{p.budget ? `${(Number(p.budget) / 1000).toFixed(0)}K` : "—"}</p>
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
