import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, Search, Plus, Mail, Phone, Building2, ArrowLeft, ExternalLink, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    active: "bg-green-500/20 text-green-300 border-green-500/30",
    inactive: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    lead: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    prospect: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${map[status] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {status}
    </span>
  );
}

export default function OrgCRM() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};
  const hasAccess = !myOrgData || featureMap.crm;
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading } = trpc.clients.list.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!hasAccess,
  });

  const { data: analytics } = trpc.multiTenancy.getOrgAnalytics.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: healthData } = trpc.multiTenancy.getClientsHealthScores.useQuery(undefined, {
    staleTime: 120_000,
    enabled: !!hasAccess,
  });
  const healthScores = healthData?.scores ?? {};

  const filtered = clients.filter((c: any) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const kpis = analytics?.kpis;

  return (
    <OrgLayout title="CRM / Clients" showOrgInfo={false}>
      <div className="space-y-6">
        {/* Breadcrumb + Back */}
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "CRM / Clients" }]} />
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white"
            onClick={() => setLocation(`/org/${slug}/dashboard`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!hasAccess && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-20 text-center">
              <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
              <p className="text-white/50 text-sm mb-6">CRM is not enabled for your organization plan.</p>
              <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation(`/org/${slug}/dashboard`)}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        )}
        {hasAccess && (<>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Clients", value: String(kpis?.totalClients ?? clients.length), color: "from-blue-600/20 to-blue-600/5" },
            { label: "Active Clients", value: String(kpis?.activeClients ?? 0), color: "from-green-600/20 to-green-600/5" },
            { label: "Showing", value: String(filtered.length), color: "from-white/10 to-white/5" },
            { label: "Leads", value: String(clients.filter((c: any) => c.status === "lead" || c.type === "lead").length), color: "from-purple-600/20 to-purple-600/5" },
          ].map((k) => (
            <Card key={k.label} className={`bg-gradient-to-br ${k.color} border-white/10`}>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-xs font-medium text-white/60">{k.label}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-2xl font-bold text-white">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + Actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setLocation("/crm/clients/new")}
          >
            <Plus className="h-4 w-4 mr-1" /> New Client
          </Button>
        </div>

        {/* Client Table */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">{search ? "No clients match your search" : "No clients yet"}</p>
                {!search && (
                  <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setLocation("/crm/clients/new")}>
                    <Plus className="h-4 w-4 mr-1" /> Add First Client
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table view */}
                <div className="hidden md:block divide-y divide-white/5">
                  {/* Header */}
                  <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                    <div className="col-span-3">Client</div>
                    <div className="col-span-3">Contact</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Health</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  {filtered.map((client: any) => {
                    const hs = healthScores[client.id];
                    return (
                    <div key={client.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-600/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-300">
                              {(client.name || client.company || "?")[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{client.name || client.company || "Unknown"}</p>
                            {client.company && client.name && (
                              <p className="text-xs text-white/40 flex items-center gap-1"><Building2 className="h-3 w-3" /> {client.company}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
                        {client.email && (
                          <p className="text-xs text-white/60 flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</p>
                        )}
                        {client.phone && (
                          <p className="text-xs text-white/60 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {client.phone}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <StatusBadge status={client.status || "active"} />
                      </div>
                      <div className="col-span-2">
                        {hs ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-12 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${hs.score}%`, background: hs.color }}
                              />
                            </div>
                            <span className="text-[11px] font-medium" style={{ color: hs.color }}>
                              {hs.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/50 hover:text-white h-7 px-2"
                          onClick={() => setLocation(`/org/${slug}/clients/${client.id}`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                  })}
                </div>

                {/* Mobile card view */}
                <div className="md:hidden divide-y divide-white/5">
                  {filtered.map((client: any) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                      onClick={() => setLocation(`/org/${slug}/clients/${client.id}`)}
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-blue-300">
                          {(client.name || client.company || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{client.name || client.company || "Unknown"}</p>
                        <p className="text-xs text-white/40 truncate">{client.email || client.phone || client.company || "—"}</p>
                      </div>
                      <StatusBadge status={client.status || "active"} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </>)}
      </div>
    </OrgLayout>
  );
}
