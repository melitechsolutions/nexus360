import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BookOpen, Search, ArrowLeft, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TYPE_COLORS: Record<string, string> = {
  asset: "#22c55e",
  liability: "#ef4444",
  equity: "#8b5cf6",
  revenue: "#3b82f6",
  expense: "#f59e0b",
  "cost of goods sold": "#06b6d4",
  "operating expense": "#ec4899",
  "capital expenditure": "#14b8a6",
  "other income": "#a3e635",
  "other expense": "#fb923c",
};

const ACCOUNT_TYPES = ["all", "asset", "liability", "equity", "revenue", "expense"];

function Badge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? "#6b7280";
  return (
    <span style={{ backgroundColor: color + "33", color, borderColor: color + "55" }}
      className="inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize">
      {type}
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
        <p className="text-white/50 text-sm mb-6">Accounting is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

export default function OrgAccounting() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: accounts = [], isLoading } = trpc.chartOfAccounts.list.useQuery(
    { limit: 200 },
    { staleTime: 60_000, enabled: !!featureMap.accounting }
  );

  const filtered = (accounts as any[]).filter((acc) => {
    const matchType = activeType === "all" || acc.type?.toLowerCase() === activeType;
    const matchSearch = !search ||
      acc.code?.toLowerCase().includes(search.toLowerCase()) ||
      acc.name?.toLowerCase().includes(search.toLowerCase()) ||
      acc.type?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Chart: account count by type
  const typeGroups = (accounts as any[]).reduce((acc, a) => {
    const t = a.type || "other";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const chartData = Object.entries(typeGroups).map(([name, value]) => ({ name, value }));

  const totalAccounts = (accounts as any[]).length;
  const assetCount = (accounts as any[]).filter((a) => a.type === "asset").length;
  const revenueCount = (accounts as any[]).filter((a) => a.type === "revenue").length;
  const expCount = (accounts as any[]).filter((a) => a.type === "expense" || a.type === "operating expense").length;

  const accessGranted = !myOrgData || featureMap.accounting;

  return (
    <OrgLayout title="Accounting">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Accounting" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Accounts", value: String(totalAccounts), color: "from-blue-600/20 to-blue-600/5" },
                { label: "Asset Accounts", value: String(assetCount), color: "from-green-600/20 to-green-600/5" },
                { label: "Revenue Accounts", value: String(revenueCount), color: "from-purple-600/20 to-purple-600/5" },
                { label: "Expense Accounts", value: String(expCount), color: "from-amber-600/20 to-amber-600/5" },
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

            {/* Type Distribution Chart */}
            {chartData.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">Accounts by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [value, "Accounts"]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={TYPE_COLORS[entry.name] ?? "#6b7280"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {ACCOUNT_TYPES.map((t) => (
                  <Button key={t} variant="ghost" size="sm"
                    className={`capitalize text-xs ${activeType === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
                    onClick={() => setActiveType(t)}>
                    {t} <span className="ml-1.5 text-white/30">
                      ({t === "all" ? accounts.length : (accounts as any[]).filter((a) => a.type?.toLowerCase() === t).length})
                    </span>
                  </Button>
                ))}
              </div>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts..."
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
            </div>

            {/* Accounts Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <BookOpen className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search || activeType !== "all" ? "No accounts match your filters" : "No accounts yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-2">Code</div>
                      <div className="col-span-5">Account Name</div>
                      <div className="col-span-3">Type</div>
                      <div className="col-span-2 text-right">Balance</div>
                    </div>
                    {filtered.map((acc: any) => (
                      <div key={acc.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-2">
                          <p className="text-sm font-mono text-white/70">{acc.code || "—"}</p>
                        </div>
                        <div className="col-span-5">
                          <p className="text-sm font-medium text-white">{acc.name}</p>
                          {acc.description && <p className="text-xs text-white/40 truncate">{acc.description}</p>}
                        </div>
                        <div className="col-span-3">
                          <Badge type={acc.type || "other"} />
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-semibold text-white">
                            {acc.balance !== undefined ? `KES ${Number(acc.balance).toLocaleString()}` : "—"}
                          </p>
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
