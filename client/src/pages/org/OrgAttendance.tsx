import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Clock, Search, ArrowLeft, Lock, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function AccessDenied({ slug }: { slug: string }) {
  const [, setLocation] = useLocation();
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="py-20 text-center">
        <Lock className="h-12 w-12 text-white/20 mx-auto mb-4" />
        <p className="text-white font-semibold text-lg mb-2">Access Restricted</p>
        <p className="text-white/50 text-sm mb-6">Attendance is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

function durationHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "—";
  try {
    const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000;
    if (diff < 0) return "—";
    return `${diff.toFixed(1)}h`;
  } catch {
    return "—";
  }
}

export default function OrgAttendance() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: records = [], isLoading } = trpc.attendance.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.attendance }
  );

  const accessGranted = !myOrgData || featureMap.attendance;

  const filtered = (records as any[]).filter((r) =>
    !search ||
    r.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
    r.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toDateString();
  const todayCount = (records as any[]).filter((r) => r.checkIn && new Date(r.checkIn).toDateString() === today).length;
  const checkedOut = (records as any[]).filter((r) => r.checkOut).length;
  const stillIn = (records as any[]).filter((r) => r.checkIn && !r.checkOut).length;

  return (
    <OrgLayout title="Attendance">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Attendance" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Records", value: String(records.length), color: "from-blue-600/20 to-blue-600/5" },
                { label: "Today's Check-ins", value: String(todayCount), color: "from-green-600/20 to-green-600/5" },
                { label: "Still Checked In", value: String(stillIn), color: "from-amber-600/20 to-amber-600/5" },
                { label: "Checked Out", value: String(checkedOut), color: "from-slate-600/20 to-slate-600/5" },
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
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by employee..."
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>

            {/* Attendance Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <Clock className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search ? "No records match your search" : "No attendance records yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-4">Employee</div>
                      <div className="col-span-3">Check In</div>
                      <div className="col-span-3">Check Out</div>
                      <div className="col-span-1">Hours</div>
                      <div className="col-span-1 text-center">Status</div>
                    </div>
                    {filtered.map((r: any) => (
                      <div key={r.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-4">
                          <p className="text-sm font-medium text-white">{r.employeeName || r.employeeId || "Unknown"}</p>
                          <p className="text-xs text-white/40">{r.date ? new Date(r.date).toLocaleDateString() : "—"}</p>
                        </div>
                        <div className="col-span-3">
                          <p className="text-sm text-white/70">
                            {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                        </div>
                        <div className="col-span-3">
                          <p className="text-sm text-white/70">
                            {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                        </div>
                        <div className="col-span-1">
                          <p className="text-sm text-white/60">{durationHours(r.checkIn, r.checkOut)}</p>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {r.checkOut
                            ? <CheckCircle className="h-4 w-4 text-green-400" />
                            : r.checkIn
                              ? <Clock className="h-4 w-4 text-amber-400" />
                              : <XCircle className="h-4 w-4 text-white/30" />
                          }
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
