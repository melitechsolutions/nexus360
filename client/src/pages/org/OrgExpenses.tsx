import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Receipt, Search, Plus, ArrowLeft, Eye, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    approved: "bg-green-500/20 text-green-300 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    paid: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${map[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s}
    </span>
  );
}

const TABS = ["all", "pending", "approved", "rejected", "draft"];

export default function OrgExpenses() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: orgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = orgData?.featureMap ?? {};
  const hasAccess = !orgData || featureMap.expenses;

  const { data: expenses = [], isLoading } = trpc.expenses.list.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!hasAccess,
  });

  const { data: analytics } = trpc.multiTenancy.getOrgAnalytics.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!hasAccess,
  });

  const filtered = expenses.filter((exp: any) => {
    const matchTab = activeTab === "all" || exp.status?.toLowerCase() === activeTab;
    const matchSearch = !search ||
      exp.expenseNumber?.toLowerCase().includes(search.toLowerCase()) ||
      exp.category?.toLowerCase().includes(search.toLowerCase()) ||
      exp.description?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const total = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  const pending = expenses.filter((e: any) => e.status === "pending").length;
  const categoryChart = analytics?.expenseCategoryChart?.slice(0, 8) ?? [];

  return (
    <OrgLayout title="Expenses" showOrgInfo={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Expenses" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        {!hasAccess && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-20 text-center">
              <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
              <p className="text-white/50 text-sm mb-6">Expenses is not enabled for your organization plan.</p>
              <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation(`/org/${slug}/dashboard`)}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        )}
        {hasAccess && (<>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Expenses", value: `KES ${total.toLocaleString()}`, color: "from-red-600/20 to-red-600/5" },
            { label: "Total Records", value: String(expenses.length), color: "from-blue-600/20 to-blue-600/5" },
            { label: "Pending Approval", value: String(pending), color: "from-yellow-600/20 to-yellow-600/5" },
            { label: "Categories", value: String(new Set(expenses.map((e: any) => e.category).filter(Boolean)).size), color: "from-white/10 to-white/5" },
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

        {/* Category Chart */}
        {categoryChart.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={categoryChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }} formatter={(value: number) => [`KES ${value.toLocaleString()}`, "Amount"]} />
                  <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

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
                  ({tab === "all" ? expenses.length : expenses.filter((e: any) => e.status?.toLowerCase() === tab).length})
                </span>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses..." className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setLocation("/crm/expenses/new")}>
              <Plus className="h-4 w-4 mr-1" /> New Expense
            </Button>
          </div>
        </div>

        {/* Expenses Table */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Receipt className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">{search || activeTab !== "all" ? "No expenses match your filters" : "No expenses yet"}</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <div className="col-span-3">Expense #</div>
                  <div className="col-span-3">Category</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {filtered.map((exp: any) => (
                  <div key={exp.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-white">{exp.expenseNumber || `EXP-${exp.id}`}</p>
                      <p className="text-xs text-white/40 truncate">{exp.description || "—"}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm text-white/70 capitalize">{exp.category || "General"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-white/60">{exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <StatusBadge status={exp.status} />
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-sm font-semibold text-white">KES {Number(exp.amount || 0).toLocaleString()}</p>
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
