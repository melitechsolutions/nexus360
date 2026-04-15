import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { DollarSign, Search, ArrowLeft, Eye, CreditCard, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, string> = {
    completed: "bg-green-500/20 text-green-300 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
    refunded: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${map[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s || "—"}
    </span>
  );
}

export default function OrgPayments() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: orgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = orgData?.featureMap ?? {};
  const hasAccess = !orgData || featureMap.payments;

  const { data: payments = [], isLoading } = trpc.payments.list.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!hasAccess,
  });

  const filtered = payments.filter((p: any) =>
    !search ||
    p.reference?.toLowerCase().includes(search.toLowerCase()) ||
    p.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.method?.toLowerCase().includes(search.toLowerCase())
  );

  const totalReceived = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const completedCount = payments.filter((p: any) => p.status === "completed").length;

  return (
    <OrgLayout title="Payments" showOrgInfo={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Payments" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        {!hasAccess && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-20 text-center">
              <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
              <p className="text-white/50 text-sm mb-6">Payments is not enabled for your organization plan.</p>
              <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation(`/org/${slug}/dashboard`)}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        )}
        {hasAccess && (<>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Received", value: `KES ${totalReceived.toLocaleString()}`, color: "from-green-600/20 to-green-600/5" },
            { label: "Total Payments", value: String(payments.length), color: "from-blue-600/20 to-blue-600/5" },
            { label: "Completed", value: String(completedCount), color: "from-teal-600/20 to-teal-600/5" },
            { label: "Showing", value: String(filtered.length), color: "from-white/10 to-white/5" },
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

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payments..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Payments Table */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <CreditCard className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">{search ? "No payments match your search" : "No payments recorded yet"}</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <div className="col-span-3">Reference</div>
                  <div className="col-span-3">Invoice</div>
                  <div className="col-span-2">Method</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {filtered.map((p: any) => (
                  <div key={p.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-white">{p.reference || p.id?.toString().slice(0, 8) || "—"}</p>
                      <p className="text-xs text-white/40">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-white/70">{p.invoiceNumber || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-white/60 capitalize">{p.method || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm font-semibold text-white">KES {Number(p.amount || 0).toLocaleString()}</p>
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
