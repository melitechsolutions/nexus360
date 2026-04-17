import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CountrySelect, CitySelect, IndustrySelect } from "@/components/LocationSelects";
import { PhoneInput } from "@/components/PhoneInput";
import { toast } from "sonner";
import { computeHealthScore } from "@/lib/healthScore";
import {
  ArrowLeft, Mail, Phone, Globe, MapPin, Building2, User,
  FileText, DollarSign, Briefcase, TrendingUp, Edit2, CheckCircle2,
  AlertCircle, Clock, BarChart3,
} from "lucide-react";

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    active: "bg-green-500/20 text-green-300 border-green-500/30",
    inactive: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    prospect: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    archived: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[status] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {status}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    paid: "bg-green-500/20 text-green-300 border-green-500/30",
    draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    overdue: "bg-red-500/20 text-red-300 border-red-500/30",
    partial: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    cancelled: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${map[status] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {status}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status?: string }) {
  const s = (status ?? "planning").toLowerCase();
  const map: Record<string, string> = {
    active: "bg-green-500/20 text-green-300 border-green-500/30",
    planning: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "on-hold": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    completed: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${map[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s}
    </span>
  );
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${n.toFixed(0)}`;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-white/30 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

export default function OrgClientDetail() {
  const params = useParams();
  const slug = params.slug as string;
  const clientId = params.id as string;
  const [, setLocation] = useLocation();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  const clientQuery = trpc.clients.getById.useQuery(clientId, { staleTime: 60_000, enabled: !!clientId });
  const revenueQuery = trpc.clients.getRevenue.useQuery(clientId, { staleTime: 60_000, enabled: !!clientId });
  const projectsQuery = trpc.clients.getProjects.useQuery(clientId, { staleTime: 60_000, enabled: !!clientId });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client updated");
      clientQuery.refetch();
      setEditOpen(false);
    },
    onError: (e) => toast.error(e.message || "Failed to update"),
  });

  const client = clientQuery.data as any;
  const revenue = revenueQuery.data;
  const clientProjects = (projectsQuery.data ?? []) as any[];
  const invoices = (revenue?.invoices ?? []) as any[];
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);

  const openEdit = () => {
    setEditForm({
      companyName: client?.companyName || "",
      contactPerson: client?.contactPerson || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      city: client?.city || "",
      country: client?.country || "",
      website: client?.website || "",
      industry: client?.industry || "",
      status: client?.status || "active",
      notes: client?.notes || "",
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editForm?.companyName) { toast.error("Company name is required"); return; }
    updateMutation.mutate({ id: clientId, ...editForm });
  };

  // Progress ring component
  const collectionRate = revenue && revenue.totalRevenue > 0
    ? Math.round((revenue.paidRevenue / revenue.totalRevenue) * 100)
    : 0;

  // ── Client Health Score (shared algorithm) ────────────────────
  const health = (!revenueQuery.isLoading && !projectsQuery.isLoading)
    ? computeHealthScore(invoices, clientProjects)
    : null;

  if (clientQuery.isLoading) {
    return (
      <OrgLayout title="Client Profile">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 bg-white/5" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-64 bg-white/5 rounded-xl" />
            <Skeleton className="h-64 md:col-span-2 bg-white/5 rounded-xl" />
          </div>
        </div>
      </OrgLayout>
    );
  }

  if (!client) {
    return (
      <OrgLayout title="Client Not Found">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white font-medium">Client not found</p>
            <Button className="mt-4" variant="ghost" onClick={() => setLocation(`/org/${slug}/crm`)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM
            </Button>
          </CardContent>
        </Card>
      </OrgLayout>
    );
  }

  const displayName = client.companyName || client.name || "Unknown Client";
  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <OrgLayout title={displayName}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[
            { label: "CRM", href: `/org/${slug}/crm` },
            { label: displayName },
          ]} />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-white/50 hover:text-white"
              onClick={() => setLocation(`/org/${slug}/crm`)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openEdit}>
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
          </div>
        </div>

        {/* Hero / Identity */}
        <div className="flex items-center gap-5 p-5 rounded-xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-white/10">
          <div className="h-16 w-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl font-bold text-blue-300 shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <StatusBadge status={client.status} />
              {client.industry && (
                <span className="text-xs text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded">{client.industry}</span>
              )}
            </div>
            {client.contactPerson && (
              <p className="text-sm text-white/50 mt-1">{client.contactPerson}</p>
            )}
          </div>
        </div>

        {/* Revenue KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-blue-600/10 border-blue-500/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-blue-300/70 uppercase tracking-wide">Total Invoiced</p>
              <p className="text-xl font-bold text-white mt-1">{formatCurrency(revenue?.totalRevenue ?? 0)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-600/10 border-green-500/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-green-300/70 uppercase tracking-wide">Paid</p>
              <p className="text-xl font-bold text-white mt-1">{formatCurrency(revenue?.paidRevenue ?? 0)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{collectionRate}% collected</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-600/10 border-yellow-500/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-yellow-300/70 uppercase tracking-wide">Outstanding</p>
              <p className="text-xl font-bold text-white mt-1">{formatCurrency(revenue?.outstandingRevenue ?? 0)}</p>
              <p className="text-[10px] text-white/30 mt-0.5">to collect</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-600/10 border-purple-500/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-purple-300/70 uppercase tracking-wide">Projects</p>
              <p className="text-xl font-bold text-white mt-1">{clientProjects.length}</p>
              <p className="text-[10px] text-white/30 mt-0.5">total projects</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Health Score Banner ── */}
        {health && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Score ring */}
                <div className="relative h-14 w-14 shrink-0">
                  <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle
                      cx="28" cy="28" r="22" fill="none"
                      stroke={health.color}
                      strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - health.score / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                    {health.score}
                  </span>
                </div>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold" style={{ color: health.color }}>
                      {health.label}
                    </span>
                    <span className="text-xs text-white/30">Client Health Score</span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">
                    Based on payment history ({collectionRate}% collection rate),&nbsp;
                    {clientProjects.filter((p: any) => p.status === "active").length} active project{clientProjects.filter((p: any) => p.status === "active").length !== 1 ? "s" : ""},
                    and recent activity.
                  </p>
                </div>

                {/* Breakdown bars */}
                <div className="hidden sm:flex flex-col gap-1 min-w-[160px]">
                  {health.breakdown.map(({ label, value, color: barColor }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30 w-24 shrink-0">{label}</span>
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${value}%`, background: barColor }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main content: info panel + invoices + projects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Contact info panel */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/70 uppercase tracking-wide">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={Phone} label="Phone" value={client.phone} />
              <InfoRow icon={Globe} label="Website" value={client.website} />
              <InfoRow icon={Building2} label="Industry" value={client.industry} />
              <InfoRow icon={MapPin} label="Location" value={[client.city, client.country].filter(Boolean).join(", ")} />
              <InfoRow icon={User} label="Contact Person" value={client.contactPerson} />
              {client.taxId && <InfoRow icon={FileText} label="Tax ID" value={client.taxId} />}
              {client.notes && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-xs text-white/60 leading-relaxed">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent invoices */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-white/70 uppercase tracking-wide">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs h-7"
                onClick={() => setLocation(`/org/${slug}/invoices`)}>View all</Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentInvoices.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <FileText className="h-8 w-8 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">No invoices yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentInvoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between px-6 py-3 hover:bg-white/5">
                      <div>
                        <p className="text-xs font-medium text-white">{inv.invoiceNumber || `INV-${inv.id?.slice(0, 8)}`}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <InvoiceStatusBadge status={inv.status} />
                        <span className="text-xs font-semibold text-white">{formatCurrency(Number(inv.total || 0))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-white/70 uppercase tracking-wide">Projects</CardTitle>
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs h-7"
                onClick={() => setLocation(`/org/${slug}/projects`)}>View all</Button>
            </CardHeader>
            <CardContent className="p-0">
              {projectsQuery.isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 bg-white/5" />)}
                </div>
              ) : clientProjects.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Briefcase className="h-8 w-8 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">No projects yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {clientProjects.map((proj: any) => {
                    const pct = Math.min(100, Math.max(0, Number(proj.progress || 0)));
                    return (
                      <div key={proj.id}
                        className="px-6 py-3 hover:bg-white/5 cursor-pointer"
                        onClick={() => setLocation(`/org/${slug}/projects/${proj.id}`)}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-white truncate max-w-[140px]">{proj.name}</p>
                          <ProjectStatusBadge status={proj.status} />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-white/40">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg bg-[#1a1f2e] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Client</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">Company Name *</Label>
                  <Input className="mt-1 bg-white/5 border-white/10 text-white" value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Contact Person</Label>
                  <Input className="mt-1 bg-white/5 border-white/10 text-white" value={editForm.contactPerson}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">Email</Label>
                  <Input type="email" className="mt-1 bg-white/5 border-white/10 text-white" value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Phone</Label>
                  <PhoneInput className="mt-1 bg-white/5 border-white/10 text-white" value={editForm.phone}
                    onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">City</Label>
                  <CitySelect value={editForm.city} onChange={(v) => setEditForm({ ...editForm, city: v })} />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Country</Label>
                  <CountrySelect value={editForm.country} onChange={(v) => setEditForm({ ...editForm, country: v })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">Industry</Label>
                  <IndustrySelect value={editForm.industry} onChange={(v) => setEditForm({ ...editForm, industry: v })} />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["active", "inactive", "prospect", "archived"].map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Website</Label>
                <Input className="mt-1 bg-white/5 border-white/10 text-white" value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
              </div>
              <div>
                <Label className="text-white/70 text-xs">Notes</Label>
                <RichTextEditor value={editForm.notes} onChange={(html) => setEditForm({ ...editForm, notes: html })}
                  minHeight="100px" className="mt-1" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" className="text-white/50" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OrgLayout>
  );
}
