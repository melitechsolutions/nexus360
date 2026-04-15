import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Target, Search, ArrowLeft, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function AccessDenied({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="py-20 text-center">
        <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
        <p className="text-white/50 text-sm mb-6">Budgets is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

function BudgetBar({ allocated, remaining }: { allocated: number; remaining: number }) {
  const spent = allocated - remaining;
  const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>{pct}% used</span>
        <span>KES {remaining.toLocaleString()} left</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function OrgBudgets() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: budgets = [], isLoading } = trpc.budgets.list.useQuery(
    undefined,
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.budgets }
  );

  const accessGranted = !myOrgData || featureMap.budgets;

  const filtered = (budgets as any[]).filter((b) =>
    !search ||
    b.departmentName?.toLowerCase().includes(search.toLowerCase()) ||
    String(b.fiscalYear)?.includes(search)
  );

  const total = (budgets as any[]).reduce((s, b) => s + Number(b.amount || 0), 0);
  const totalRemaining = (budgets as any[]).reduce((s, b) => s + Number(b.remaining || 0), 0);
  const totalSpent = total - totalRemaining;
  const currentYear = new Date().getFullYear();
  const thisYear = (budgets as any[]).filter((b) => b.fiscalYear === currentYear).length;

  return (
    <OrgLayout title="Budgets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Budgets" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Budgeted", value: `KES ${total.toLocaleString()}`, color: "from-blue-600/20 to-blue-600/5" },
                { label: "Total Spent", value: `KES ${totalSpent.toLocaleString()}`, color: "from-red-600/20 to-red-600/5" },
                { label: "Total Remaining", value: `KES ${totalRemaining.toLocaleString()}`, color: "from-green-600/20 to-green-600/5" },
                { label: `FY ${currentYear} Budgets`, value: String(thisYear), color: "from-white/10 to-white/5" },
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
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by department or year..."
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>

            {/* Budgets Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <Target className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search ? "No budgets match your search" : "No budgets yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-4">Department</div>
                      <div className="col-span-2">Fiscal Year</div>
                      <div className="col-span-2 text-right">Allocated</div>
                      <div className="col-span-4">Usage</div>
                    </div>
                    {filtered.map((b: any) => (
                      <div key={b.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-4">
                          <p className="text-sm font-medium text-white">{b.departmentName || "General"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-white/60">{b.fiscalYear || "—"}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-semibold text-white">KES {Number(b.amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="col-span-4 pl-4">
                          <BudgetBar allocated={Number(b.amount || 0)} remaining={Number(b.remaining ?? b.amount ?? 0)} />
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
