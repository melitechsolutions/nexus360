import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { UserCog, Search, Plus, ArrowLeft, Mail, Phone, Building2, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const DEPT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "active").toLowerCase();
  const map: Record<string, string> = {
    active: "bg-green-500/20 text-green-300 border-green-500/30",
    inactive: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    on_leave: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    terminated: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${map[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

export default function OrgHR() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: orgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = orgData?.featureMap ?? {};
  const hasAccess = !orgData || featureMap.hr;

  const { data: employees = [], isLoading } = trpc.employees.list.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!hasAccess,
  });

  const { data: analytics } = trpc.multiTenancy.getOrgAnalytics.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !!hasAccess,
  });

  const filtered = employees.filter((emp: any) =>
    !search ||
    emp.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.toLowerCase().includes(search.toLowerCase()) ||
    emp.position?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = employees.filter((e: any) => e.status === "active" || !e.status).length;
  const departments = [...new Set(employees.map((e: any) => e.department).filter(Boolean))].length;
  const deptChart = analytics?.employeeDeptChart ?? [];

  return (
    <OrgLayout title="HR — Employees" showOrgInfo={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "HR" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        {!hasAccess && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-20 text-center">
              <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
              <p className="text-white/50 text-sm mb-6">HR is not enabled for your organization plan.</p>
              <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setLocation(`/org/${slug}/dashboard`)}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        )}
        {hasAccess && (<>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Employees", value: String(employees.length), color: "from-indigo-600/20 to-indigo-600/5" },
            { label: "Active", value: String(activeCount), color: "from-green-600/20 to-green-600/5" },
            { label: "Departments", value: String(departments), color: "from-blue-600/20 to-blue-600/5" },
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

        {/* Department Chart */}
        {deptChart.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Employees by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={deptChart} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {deptChart.map((_: any, index: number) => (
                      <Cell key={index} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Search + Actions */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setLocation("/crm/employees/new")}>
            <Plus className="h-4 w-4 mr-1" /> Add Employee
          </Button>
        </div>

        {/* Employee Table */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <UserCog className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">{search ? "No employees match your search" : "No employees yet"}</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <div className="col-span-4">Employee</div>
                  <div className="col-span-3">Department / Role</div>
                  <div className="col-span-3">Contact</div>
                  <div className="col-span-2">Status</div>
                </div>
                {filtered.map((emp: any) => {
                  const fullName = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.name || "Unknown";
                  return (
                    <div key={emp.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/5 transition-colors">
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-600/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-indigo-300">{fullName[0]?.toUpperCase() ?? "?"}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{fullName}</p>
                            <p className="text-xs text-white/40">{emp.employeeNumber || `EMP-${emp.id}`}</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
                        {emp.department && (
                          <p className="text-sm text-white/70 flex items-center gap-1"><Building2 className="h-3 w-3 text-white/30" /> {emp.department}</p>
                        )}
                        {emp.position && <p className="text-xs text-white/40">{emp.position}</p>}
                      </div>
                      <div className="col-span-3">
                        {emp.email && <p className="text-xs text-white/60 flex items-center gap-1"><Mail className="h-3 w-3" /> {emp.email}</p>}
                        {emp.phone && <p className="text-xs text-white/60 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {emp.phone}</p>}
                      </div>
                      <div className="col-span-2">
                        <StatusBadge status={emp.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </>)}
      </div>
    </OrgLayout>
  );
}
