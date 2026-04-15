import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { toast } from "sonner";
import { useCurrencySettings } from "@/lib/currency";
import { useUserLookup } from "@/hooks/useUserLookup";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Receipt,
  DollarSign,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type ApprovalType = "all" | "invoice" | "expense" | "payment" | "leave_request";
type StatusFilter = "all" | "pending" | "approved" | "rejected";

const TYPE_TABS: Array<{ id: ApprovalType; label: string; icon: React.ElementType }> = [
  { id: "all", label: "All", icon: CheckCircle },
  { id: "invoice", label: "Invoices", icon: FileText },
  { id: "expense", label: "Expenses", icon: Receipt },
  { id: "payment", label: "Payments", icon: DollarSign },
  { id: "leave_request", label: "Leave", icon: Calendar },
];

const TYPE_COLORS: Record<string, string> = {
  invoice: "#3b82f6",
  expense: "#f59e0b",
  payment: "#22c55e",
  leave_request: "#a855f7",
  purchase_order: "#06b6d4",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
};

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrgApprovals() {
  const { code: currencyCode } = useCurrencySettings();
  const { getUserName } = useUserLookup();

  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();

  const [typeFilter, setTypeFilter] = useState<ApprovalType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data, isLoading, refetch } = trpc.multiTenancy.getOrgApprovals.useQuery(undefined, {
    staleTime: 30_000,
  });

  const approvals = (data?.approvals ?? []) as any[];

  // ── mutations ──
  const approveInvoice = trpc.approvals.approveInvoice.useMutation({ onSuccess: () => { toast.success("Invoice approved"); refetch(); }, onError: (e) => toast.error(e.message) });
  const rejectInvoice = trpc.approvals.rejectInvoice.useMutation({ onSuccess: () => { toast.success("Invoice rejected"); setRejectingId(null); refetch(); }, onError: (e) => toast.error(e.message) });
  const approveExpense = trpc.approvals.approveExpense.useMutation({ onSuccess: () => { toast.success("Expense approved"); refetch(); }, onError: (e) => toast.error(e.message) });
  const rejectExpense = trpc.approvals.rejectExpense.useMutation({ onSuccess: () => { toast.success("Expense rejected"); setRejectingId(null); refetch(); }, onError: (e) => toast.error(e.message) });
  const approvePayment = trpc.approvals.approvePayment.useMutation({ onSuccess: () => { toast.success("Payment approved"); refetch(); }, onError: (e) => toast.error(e.message) });
  const rejectPayment = trpc.approvals.rejectPayment.useMutation({ onSuccess: () => { toast.success("Payment rejected"); setRejectingId(null); refetch(); }, onError: (e) => toast.error(e.message) });
  const approveLeave = trpc.approvals.approveLeaveRequest.useMutation({ onSuccess: () => { toast.success("Leave request approved"); refetch(); }, onError: (e) => toast.error(e.message) });
  const rejectLeave = trpc.approvals.rejectLeaveRequest.useMutation({ onSuccess: () => { toast.success("Leave request rejected"); setRejectingId(null); refetch(); }, onError: (e) => toast.error(e.message) });

  const isApproving = approveInvoice.isPending || approveExpense.isPending || approvePayment.isPending || approveLeave.isPending;
  const isRejecting = rejectInvoice.isPending || rejectExpense.isPending || rejectPayment.isPending || rejectLeave.isPending;

  const formatCurrency = (n: number | undefined) => {
    if (n === undefined || n === null) return "—";
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(n);
  };

  function handleApprove(item: any) {
    switch (item.type) {
      case "invoice": return approveInvoice.mutate({ id: item.referenceId });
      case "expense": return approveExpense.mutate({ id: item.referenceId });
      case "payment": return approvePayment.mutate({ id: item.referenceId });
      case "leave_request": return approveLeave.mutate({ id: item.referenceId });
      default: toast.error("Approval not supported for this type");
    }
  }

  function handleReject(item: any) {
    if (!rejectionReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    switch (item.type) {
      case "invoice": return rejectInvoice.mutate({ id: item.referenceId, reason: rejectionReason });
      case "expense": return rejectExpense.mutate({ id: item.referenceId, reason: rejectionReason });
      case "payment": return rejectPayment.mutate({ id: item.referenceId, reason: rejectionReason });
      case "leave_request": return rejectLeave.mutate({ id: item.referenceId, reason: rejectionReason });
      default: toast.error("Rejection not supported for this type");
    }
  }

  // filter
  const filtered = approvals.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    pending: approvals.filter((a) => a.status === "pending").length,
    approved: approvals.filter((a) => a.status === "approved").length,
    rejected: approvals.filter((a) => a.status === "rejected").length,
  };

  return (
    <OrgLayout title="Approvals" showOrgInfo={false}>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <OrgBreadcrumb slug={slug} items={[{ label: "Approvals" }]} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Approvals</h1>
            <p className="text-white/50 text-sm mt-0.5">Review and action pending requests</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending", value: stats.pending, color: "from-yellow-600/20 to-yellow-600/5", text: "text-yellow-300" },
            { label: "Approved", value: stats.approved, color: "from-green-600/20 to-green-600/5", text: "text-green-300" },
            { label: "Rejected", value: stats.rejected, color: "from-red-600/20 to-red-600/5", text: "text-red-300" },
          ].map((k) => (
            <Card key={k.label} className={`bg-gradient-to-br ${k.color} border-white/10`}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-white/50 uppercase tracking-wide">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.text}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Type filter tabs */}
        <div className="flex flex-wrap gap-2">
          {TYPE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  active ? "bg-blue-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}

          {/* Status filter */}
          <div className="ml-auto flex gap-1">
            {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${
                  statusFilter === s ? "bg-white/20 text-white" : "bg-white/5 text-white/40 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-semibold">
              {filtered.length} {statusFilter !== "all" ? statusFilter : ""} {typeFilter !== "all" ? typeFilter.replace("_", " ") : ""} item{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 bg-white/5 rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No items found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Ref #</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1">Amount</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2">Requested</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {filtered.map((item: any) => {
                  const typeColor = TYPE_COLORS[item.type] || "#6b7280";
                  const expanded = expandedId === item.id;
                  const rejecting = rejectingId === item.id;

                  return (
                    <div key={item.id} className="hover:bg-white/5 transition-colors">
                      {/* Main row */}
                      <div
                        className="grid grid-cols-12 px-6 py-4 items-center gap-2 cursor-pointer"
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                      >
                        {/* Type badge */}
                        <div className="col-span-2">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-full capitalize"
                            style={{ background: `${typeColor}22`, color: typeColor, border: `1px solid ${typeColor}44` }}
                          >
                            {item.type.replace("_", " ")}
                          </span>
                        </div>

                        {/* Ref */}
                        <div className="col-span-2">
                          <p className="text-sm font-mono text-white/80">{item.referenceNo}</p>
                        </div>

                        {/* Description */}
                        <div className="col-span-3">
                          <p className="text-sm text-white/70 truncate">{item.description}</p>
                          <p className="text-xs text-white/30 mt-0.5">{getUserName(item.requestedBy)}</p>
                        </div>

                        {/* Amount */}
                        <div className="col-span-1">
                          <p className="text-sm text-white">{formatCurrency(item.amount)}</p>
                        </div>

                        {/* Status */}
                        <div className="col-span-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_STYLES[item.status] ?? "bg-white/10 text-white/60 border-white/20"}`}>
                            {item.status}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="col-span-2">
                          <p className="text-xs text-white/40">{formatDate(item.requestedAt)}</p>
                        </div>

                        {/* Expand toggle */}
                        <div className="col-span-1 flex justify-end">
                          {expanded
                            ? <ChevronUp className="h-4 w-4 text-white/30" />
                            : <ChevronDown className="h-4 w-4 text-white/30" />}
                        </div>
                      </div>

                      {/* Expanded detail + action panel */}
                      {expanded && (
                        <div className="px-6 pb-5 space-y-3 border-t border-white/5 pt-4">
                          {/* Meta */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <p className="text-white/30 uppercase tracking-wide mb-1">Requested by</p>
                              <p className="text-white/80">{getUserName(item.requestedBy)}</p>
                            </div>
                            <div>
                              <p className="text-white/30 uppercase tracking-wide mb-1">Requested at</p>
                              <p className="text-white/80">{formatDate(item.requestedAt)}</p>
                            </div>
                            {item.approvedBy && (
                              <div>
                                <p className="text-white/30 uppercase tracking-wide mb-1">Reviewed by</p>
                                <p className="text-white/80">{getUserName(item.approvedBy)}</p>
                              </div>
                            )}
                            {item.approvedAt && (
                              <div>
                                <p className="text-white/30 uppercase tracking-wide mb-1">Reviewed at</p>
                                <p className="text-white/80">{formatDate(item.approvedAt)}</p>
                              </div>
                            )}
                          </div>

                          {/* Rejection reason input */}
                          {rejecting && item.status === "pending" && (
                            <div className="space-y-2">
                              <p className="text-xs text-white/50">Rejection reason (required)</p>
                              <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explain why this is being rejected..."
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm resize-none"
                                rows={2}
                              />
                            </div>
                          )}

                          {/* Action buttons — only for pending items */}
                          {item.status === "pending" && (
                            <div className="flex items-center gap-2 pt-1">
                              {!rejecting ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    disabled={isApproving}
                                    onClick={(e) => { e.stopPropagation(); handleApprove(item); }}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                    onClick={(e) => { e.stopPropagation(); setRejectingId(item.id); setRejectionReason(""); }}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    disabled={isRejecting || !rejectionReason.trim()}
                                    onClick={(e) => { e.stopPropagation(); handleReject(item); }}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Confirm Reject
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-white/40 hover:text-white"
                                    onClick={(e) => { e.stopPropagation(); setRejectingId(null); setRejectionReason(""); }}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OrgLayout>
  );
}
