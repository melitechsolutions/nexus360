import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FileText, Search, Plus, ArrowLeft, Download, Eye, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-500/20 text-green-300 border-green-500/30",
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  overdue: "bg-red-500/20 text-red-300 border-red-500/30",
  partial: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  cancelled: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "draft").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s}
    </span>
  );
}

const TABS = ["all", "draft", "sent", "paid", "overdue", "partial"];

export default function OrgInvoices() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: orgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, {
    staleTime: 300_000,
  });

  const org = orgData?.organization;
  const featureMap = orgData?.featureMap ?? {};
  const hasAccess = !orgData || featureMap.invoicing;

  const { data: invoices = [], isLoading } = trpc.invoices.list.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!hasAccess,
  });

  const filtered = invoices.filter((inv: any) => {
    const matchTab = activeTab === "all" || inv.status?.toLowerCase() === activeTab;
    const matchSearch = !search ||
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + Number(inv.total || 0), 0);
  const totalPaid = invoices.reduce((sum: number, inv: any) => sum + Number(inv.paidAmount || 0), 0);
  const outstanding = totalInvoiced - totalPaid;

  return (
    <OrgLayout title="Invoices" showOrgInfo={false}>
      <div className="space-y-6">
        {/* Breadcrumb + Back */}
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Invoices" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        {!hasAccess && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-20 text-center">
              <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
              <p className="text-white/50 text-sm mb-6">Invoicing is not enabled for your organization plan.</p>
              <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation(`/org/${slug}/dashboard`)}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        )}
        {hasAccess && (<>

        {/* Org address banner */}
        {org && (
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg px-4 py-3 text-sm text-blue-300">
            <span className="font-medium">{org.name}</span>
            {org.address && <span className="text-blue-300/70 ml-2">· {org.address}</span>}
            {org.email && <span className="text-blue-300/70 ml-2">· {org.email}</span>}
            <span className="text-blue-300/50 ml-2 text-xs">(used as sender on new invoices)</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Invoiced", value: `KES ${totalInvoiced.toLocaleString()}`, color: "from-blue-600/20 to-blue-600/5" },
            { label: "Total Paid", value: `KES ${totalPaid.toLocaleString()}`, color: "from-green-600/20 to-green-600/5" },
            { label: "Outstanding", value: `KES ${outstanding.toLocaleString()}`, color: "from-yellow-600/20 to-yellow-600/5" },
            { label: "Total Invoices", value: String(invoices.length), color: "from-white/10 to-white/5" },
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

        {/* Tabs + Search + Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map((tab) => (
              <Button
                key={tab}
                variant="ghost"
                size="sm"
                className={`capitalize text-xs ${activeTab === tab ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                <span className="ml-1.5 text-white/30">
                  ({tab === "all" ? invoices.length : invoices.filter((i: any) => i.status?.toLowerCase() === tab).length})
                </span>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoices..."
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setLocation("/crm/invoices/new")}>
              <Plus className="h-4 w-4 mr-1" /> New Invoice
            </Button>
          </div>
        </div>

        {/* Invoice Table */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">{search || activeTab !== "all" ? "No invoices match your filters" : "No invoices yet"}</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <div className="col-span-3">Invoice #</div>
                  <div className="col-span-3">Client</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {filtered.map((inv: any) => (
                  <div key={inv.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-white">{inv.invoiceNumber}</p>
                      <p className="text-xs text-white/40">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-white/70">{inv.clientName || "—"}</p>
                      {inv.dueDate && <p className="text-xs text-white/40">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>}
                    </div>
                    <div className="col-span-2">
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm font-semibold text-white">KES {Number(inv.total || 0).toLocaleString()}</p>
                      {Number(inv.paidAmount) > 0 && (
                        <p className="text-xs text-green-400">Paid: {Number(inv.paidAmount).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="text-white/50 hover:text-white h-7 px-2" onClick={() => setLocation(`/crm/invoices/${inv.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </>)}
      </div>
    </OrgLayout>
  );
}
