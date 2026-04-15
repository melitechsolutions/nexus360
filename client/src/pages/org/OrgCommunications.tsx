import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Search, ArrowLeft, Lock, Mail, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-green-500/20 text-green-300 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
};

const TYPE_STYLES: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  sms: "bg-teal-500/20 text-teal-300 border-teal-500/30",
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "pending").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_STYLES[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s}
    </span>
  );
}

function TypeBadge({ type }: { type?: string }) {
  const t = (type ?? "email").toLowerCase();
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border capitalize ${TYPE_STYLES[t] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {t === "email" ? <Mail className="h-2.5 w-2.5" /> : <Phone className="h-2.5 w-2.5" />}
      {t}
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
        <p className="text-white/50 text-sm mb-6">Communications is not enabled for your organization plan.</p>
        <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => setLocation(`/org/${slug}/dashboard`)}>
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["all", "sent", "pending", "failed"];
const TYPES = ["all", "email", "sms"];

export default function OrgCommunications() {
  const params = useParams();
  const slug = params.slug as string;
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [activeType, setActiveType] = useState("all");

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, { staleTime: 300_000 });
  const featureMap = myOrgData?.featureMap ?? {};

  const { data: commData, isLoading } = trpc.communications.list.useQuery(
    {
      limit: 100,
      offset: 0,
      ...(activeStatus !== "all" ? { status: activeStatus as "sent" | "pending" | "failed" } : {}),
      ...(activeType !== "all" ? { type: activeType as "email" | "sms" } : {}),
    },
    { staleTime: 60_000, enabled: !myOrgData || !!featureMap.communications }
  );

  const accessGranted = !myOrgData || featureMap.communications;
  const allComms = (commData as any)?.communications ?? [];

  const filtered = (allComms as any[]).filter((c) =>
    !search ||
    c.subject?.toLowerCase().includes(search.toLowerCase()) ||
    c.recipient?.toLowerCase().includes(search.toLowerCase()) ||
    c.recipientEmail?.toLowerCase().includes(search.toLowerCase()) ||
    c.referenceType?.toLowerCase().includes(search.toLowerCase())
  );

  const total = (commData as any)?.total ?? allComms.length;
  const sent = (allComms as any[]).filter((c) => c.status === "sent").length;
  const failed = (allComms as any[]).filter((c) => c.status === "failed").length;
  const emails = (allComms as any[]).filter((c) => c.type === "email").length;

  return (
    <OrgLayout title="Communications">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[{ label: "Communications" }]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => setLocation(`/org/${slug}/dashboard`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {!accessGranted ? <AccessDenied slug={slug} /> : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Messages", value: String(total), color: "from-blue-600/20 to-blue-600/5" },
                { label: "Sent", value: String(sent), color: "from-green-600/20 to-green-600/5" },
                { label: "Failed", value: String(failed), color: "from-red-600/20 to-red-600/5" },
                { label: "Emails", value: String(emails), color: "from-indigo-600/20 to-indigo-600/5" },
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
            <div className="space-y-3">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Type:</span>
                  {TYPES.map((t) => (
                    <Button key={t} variant="ghost" size="sm"
                      className={`capitalize text-xs ${activeType === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
                      onClick={() => setActiveType(t)}>
                      {t}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Status:</span>
                  {STATUSES.map((s) => (
                    <Button key={s} variant="ghost" size="sm"
                      className={`capitalize text-xs ${activeStatus === s ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
                      onClick={() => setActiveStatus(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by subject or recipient..."
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
            </div>

            {/* Communications Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <MessageSquare className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">{search || activeStatus !== "all" || activeType !== "all" ? "No communications match your filters" : "No communications yet"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <div className="grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <div className="col-span-1">Type</div>
                      <div className="col-span-4">Subject</div>
                      <div className="col-span-3">Recipient</div>
                      <div className="col-span-2">Sent At</div>
                      <div className="col-span-2">Status</div>
                    </div>
                    {filtered.map((c: any) => (
                      <div key={c.id} className="grid grid-cols-12 px-6 py-3 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-1"><TypeBadge type={c.type} /></div>
                        <div className="col-span-4">
                          <p className="text-sm font-medium text-white truncate">{c.subject || c.message?.slice(0, 60) || "—"}</p>
                          {c.referenceType && <p className="text-xs text-white/40 capitalize">{c.referenceType}</p>}
                        </div>
                        <div className="col-span-3">
                          <p className="text-sm text-white/70 truncate">{c.recipient || c.recipientEmail || c.recipientPhone || "—"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-white/60">{c.sentAt || c.createdAt ? new Date(c.sentAt || c.createdAt).toLocaleString() : "—"}</p>
                        </div>
                        <div className="col-span-2"><StatusBadge status={c.status} /></div>
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
