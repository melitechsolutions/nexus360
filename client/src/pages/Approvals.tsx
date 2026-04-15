import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCurrencySettings } from "@/lib/currency";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card as ShadCard } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";
import { useUserLookup } from "@/hooks/useUserLookup";

interface ApprovalItem {
  id: string;
  type: "invoice" | "expense" | "payment" | "purchase_order" | "leave_request";
  referenceId: string;
  referenceNo: string;
  amount?: number;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  status: "pending" | "approved" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  description: string;
  approvers?: string[];
}

export default function Approvals() {
  const { code: currencyCode } = useCurrencySettings();
  const { getUserName } = useUserLookup();

  const [, navigate] = useLocation();
  const { allowed, isLoading: permissionLoading } = useRequireFeature("approvals:view");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejectionReason, setBulkRejectionReason] = useState("");
  const [showBulkRejectReason, setShowBulkRejectReason] = useState(false);
  const queryUtils = trpc.useUtils();

  // Fetch real approvals data - BEFORE CONDITIONAL RETURNS
  const { data: approvals = [], isLoading, error, refetch } = trpc.approvals.getApprovals.useQuery({
    type: typeFilter !== "all" ? (typeFilter as any) : undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    priority: priorityFilter !== "all" ? (priorityFilter as any) : undefined,
    search: searchQuery || undefined,
  });

  // Delete approval mutation
  const deleteApprovalMutation = trpc.approvals.deleteApproval.useMutation({
    onSuccess: () => {
      toast.success("Approval item deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete approval");
    },
  });

  // Approval mutations
  const approveInvoiceMutation = trpc.approvals.approveInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve invoice");
    },
  });

  const rejectInvoiceMutation = trpc.approvals.rejectInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject invoice");
    },
  });

  const approveEstimateMutation = trpc.approvals.approveEstimate.useMutation({
    onSuccess: () => {
      toast.success("Estimate approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve estimate");
    },
  });

  const rejectEstimateMutation = trpc.approvals.rejectEstimate.useMutation({
    onSuccess: () => {
      toast.success("Estimate rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject estimate");
    },
  });

  const approvePaymentMutation = trpc.approvals.approvePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve payment");
    },
  });

  const rejectPaymentMutation = trpc.approvals.rejectPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject payment");
    },
  });

  const approveExpenseMutation = trpc.approvals.approveExpense.useMutation({
    onSuccess: () => {
      toast.success("Expense approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve expense");
    },
  });

  const rejectExpenseMutation = trpc.approvals.rejectExpense.useMutation({
    onSuccess: () => {
      toast.success("Expense rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject expense");
    },
  });

  const approveBudgetMutation = trpc.approvals.approveBudget.useMutation({
    onSuccess: () => {
      toast.success("Budget approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve budget");
    },
  });

  const rejectBudgetMutation = trpc.approvals.rejectBudget.useMutation({
    onSuccess: () => {
      toast.success("Budget rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject budget");
    },
  });

  const approveLPOMutation = trpc.approvals.approveLPO.useMutation({
    onSuccess: () => {
      toast.success("LPO approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve LPO");
    },
  });

  const rejectLPOMutation = trpc.approvals.rejectLPO.useMutation({
    onSuccess: () => {
      toast.success("LPO rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject LPO");
    },
  });

  const approvePurchaseOrderMutation = trpc.approvals.approvePurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success("Purchase Order approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve Purchase Order");
    },
  });

  const rejectPurchaseOrderMutation = trpc.approvals.rejectPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success("Purchase Order rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject Purchase Order");
    },
  });

  const approveImprestMutation = trpc.approvals.approveImprest.useMutation({
    onSuccess: () => {
      toast.success("Imprest approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve Imprest");
    },
  });

  const rejectImprestMutation = trpc.approvals.rejectImprest.useMutation({
    onSuccess: () => {
      toast.success("Imprest rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject Imprest");
    },
  });

  const approveLeaveRequestMutation = trpc.approvals.approveLeaveRequest.useMutation({
    onSuccess: () => {
      toast.success("Leave request approved successfully");
      setShowDetails(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve leave request");
    },
  });

  const rejectLeaveRequestMutation = trpc.approvals.rejectLeaveRequest.useMutation({
    onSuccess: () => {
      toast.success("Leave request rejected successfully");
      setShowDetails(false);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject leave request");
    },
  });

  if (permissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  // Convert frozen Drizzle objects to plain JS for React dependencies
  const plainApprovals = Array.isArray(approvals)
    ? approvals.map((approval: any) => JSON.parse(JSON.stringify(approval)))
    : [];

  // MOVE PERMISSION ERROR CHECK HERE - AFTER ALL HOOKS
  // Show permission error if applicable
  if (error && error.message.includes("permission")) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-center min-h-[500px]">
            <Card className="w-full max-w-md border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Access Denied</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600 mb-4">{error.message}</p>
                <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Return to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Filter approvals (already filtered by server)
  const filteredApprovals = (() => {
    if (!plainApprovals) return [];
    return plainApprovals.filter((approval) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          approval.referenceNo.toLowerCase().includes(query) ||
          approval.description.toLowerCase().includes(query) ||
          approval.requestedBy.toLowerCase().includes(query)
        );
      }
      return true;
    });
  })();

  // Calculate statistics
  const stats = (() => {
    if (!plainApprovals) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: plainApprovals.length,
      pending: plainApprovals.filter((a) => a.status === "pending").length,
      approved: plainApprovals.filter((a) => a.status === "approved").length,
      rejected: plainApprovals.filter((a) => a.status === "rejected").length,
    };
  })();

  const handleApprove = (approval: ApprovalItem) => {
    switch (approval.type) {
      case "invoice":
        approveInvoiceMutation.mutate({ id: approval.referenceId });
        break;
      case "expense":
        approveExpenseMutation.mutate({ id: approval.referenceId });
        break;
      case "payment":
        approvePaymentMutation.mutate({ id: approval.referenceId });
        break;
      case "budget":
        approveBudgetMutation.mutate({ id: approval.referenceId });
        break;
      case "lpo":
        approveLPOMutation.mutate({ id: approval.referenceId });
        break;
      case "purchase_order":
        approvePurchaseOrderMutation.mutate({ id: approval.referenceId });
        break;
      case "leave_request":
        approveLeaveRequestMutation.mutate({ id: approval.referenceId });
        break;
      default:
        toast.error("Approval type not supported");
    }
  };

  const handleReject = (approval: ApprovalItem) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    switch (approval.type) {
      case "invoice":
        rejectInvoiceMutation.mutate({ id: approval.referenceId, reason: rejectionReason });
        break;
      case "expense":
        rejectExpenseMutation.mutate({ id: approval.referenceId, reason: rejectionReason });
        break;
      case "payment":
        rejectPaymentMutation.mutate({ id: approval.referenceId, reason: rejectionReason });
        break;
      case "budget":
        rejectBudgetMutation.mutate({ id: approval.referenceId, reason: rejectionReason });
        break;
      case "lpo":
        rejectLPOMutation.mutate({ id: approval.referenceId, reason: rejectionReason });
        break;
      case "purchase_order":
        rejectPurchaseOrderMutation.mutate({ id: approval.referenceId, reason: rejectionReason });
        break;
      case "leave_request":
        rejectLeaveRequestMutation.mutate({ id: approval.referenceId, reason: rejectionReason });
        break;
      default:
        toast.error("Rejection type not supported");
    }
  };

  const handleBulkApprove = () => {
    const selectedApprovals = filteredApprovals.filter((a) => selectedIds.has(a.id));
    if (selectedApprovals.length === 0) {
      toast.error("Please select at least one approval");
      return;
    }

    selectedApprovals.forEach((approval) => {
      handleApprove(approval);
    });

    setSelectedIds(new Set());
    toast.success(`Approved ${selectedApprovals.length} item(s)`);
  };

  const handleBulkReject = () => {
    const selectedApprovals = filteredApprovals.filter((a) => selectedIds.has(a.id));
    if (selectedApprovals.length === 0) {
      toast.error("Please select at least one approval");
      return;
    }

    if (!bulkRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    selectedApprovals.forEach((approval) => {
      const tempReason = rejectionReason;
      setRejectionReason(bulkRejectionReason);
      handleReject({ ...approval });
      setRejectionReason(tempReason);
    });

    setSelectedIds(new Set());
    setBulkRejectionReason("");
    setShowBulkRejectReason(false);
    toast.success(`Rejected ${selectedApprovals.length} item(s)`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApprovals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApprovals.map((a) => a.id)));
    }
  };

  const toggleSelectId = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = {
      invoice: { label: "Invoice", color: "bg-blue-100 text-blue-800" },
      expense: { label: "Expense", color: "bg-orange-100 text-orange-800" },
      payment: { label: "Payment", color: "bg-green-100 text-green-800" },
      purchase_order: { label: "Purchase Order", color: "bg-purple-100 text-purple-800" },
      leave_request: { label: "Leave Request", color: "bg-pink-100 text-pink-800" },
      budget: { label: "Budget", color: "bg-indigo-100 text-indigo-800" },
      lpo: { label: "LPO", color: "bg-teal-100 text-teal-800" },
      imprest: { label: "Imprest", color: "bg-amber-100 text-amber-800" },
    };
    return typeConfig[type as keyof typeof typeConfig] || { label: type, color: "bg-gray-100 text-gray-800" };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800" variant="outline">
            <Clock size={12} className="mr-1" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800" variant="outline">
            <CheckCircle size={12} className="mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800" variant="outline">
            <XCircle size={12} className="mr-1" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={colors[priority as keyof typeof colors]} variant="outline">
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  };

  return (
    <ModuleLayout
      title="Approvals"
      description="Review and manage pending approvals for financial and administrative requests"
      icon={<CheckCircle className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Approvals" },
      ]}
    >
      <div className="space-y-6 p-6">

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="Total Pending" value={stats.pending} description="Awaiting approval" color="border-l-orange-500" />

          <StatsCard label="Approved" value={stats.approved} description="This month" color="border-l-purple-500" />

          <StatsCard label="Rejected" value={stats.rejected} description="This month" color="border-l-green-500" />

          <StatsCard label="Total" value={stats.total} description="All approvals" color="border-l-blue-500" />
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Approval Queue</CardTitle>
                <CardDescription>
                  {filteredApprovals.length} approval{filteredApprovals.length !== 1 ? "s" : ""}
                  {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
                </CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkRejectReason(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle size={14} className="mr-1" /> Reject Selected
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleBulkApprove}
                  >
                    <CheckCircle size={14} className="mr-1" /> Approve Selected
                  </Button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="flex-1 flex items-center gap-2 bg-white border rounded-lg px-3">
                <Search size={16} className="text-muted-foreground" />
                <Input
                  placeholder="Search by reference, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 focus-visible:ring-0 flex-1"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="budget">Budgets</SelectItem>
                  <SelectItem value="lpo">LPOs</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                  <SelectItem value="imprest">Imprests</SelectItem>
                  <SelectItem value="leave_request">Leave Requests</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {filteredApprovals.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No approvals found</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredApprovals.length && filteredApprovals.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded"
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Raiser</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Approval Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => (
                      <TableRow key={approval.id} className="hover:bg-muted/50">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(approval.id)}
                            onChange={() => toggleSelectId(approval.id)}
                            className="rounded"
                            aria-label={`Select ${approval.referenceNo}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {approval.referenceNo}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeIcon(approval.type).color} variant="outline">
                            {getTypeIcon(approval.type).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{approval.description}</div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(approval.amount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getUserName(approval.requestedBy)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(approval.requestedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {approval.approvedBy ? getUserName(approval.approvedBy) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {approval.approvedAt ? new Date(approval.approvedAt).toLocaleDateString() : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>{getStatusBadge(approval.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedApproval(approval);
                                setShowDetails(true);
                              }}
                              title="View details"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              className="text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                if (approval.type === "invoice") {
                                  navigate(`/invoices/${approval.referenceId}/edit`);
                                } else if (approval.type === "expense") {
                                  navigate(`/expenses/${approval.referenceId}/edit`);
                                } else if (approval.type === "payment") {
                                  navigate(`/payments/${approval.referenceId}/edit`);
                                } else if (approval.type === "purchase_order") {
                                  navigate(`/lpos/${approval.referenceId}/edit`);
                                } else if (approval.type === "leave_request") {
                                  navigate(`/leave-management/${approval.referenceId}/edit`);
                                } else if (approval.type === "budget") {
                                  navigate(`/budgets/${approval.referenceId}/edit`);
                                } else if (approval.type === "lpo") {
                                  navigate(`/lpos/${approval.referenceId}/edit`);
                                } else if (approval.type === "imprest") {
                                  navigate(`/imprests`);
                                } else {
                                  toast.error("Edit not available for this type");
                                }
                              }}
                            >
                              <Edit size={14} />
                            </Button>
                            {approval.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Move to Draft"
                                className="text-amber-600 hover:bg-amber-50"
                                disabled={deleteApprovalMutation.isPending}
                                onClick={() => {
                                  if (confirm("This will move the document back to draft status, allowing you to edit and re-submit it. Continue?")) {
                                    deleteApprovalMutation.mutate({ id: approval.referenceId, type: approval.type });
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Reject Reason Modal */}
        {showBulkRejectReason && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Reject {selectedIds.size} Item(s)</CardTitle>
                <CardDescription>
                  Please provide a reason for rejecting these approvals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter rejection reason..."
                  value={bulkRejectionReason}
                  onChange={(e) => setBulkRejectionReason(e.target.value)}
                  className="w-full"
                />
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowBulkRejectReason(false);
                      setBulkRejectionReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleBulkReject}
                  >
                    <XCircle size={16} className="mr-2" /> Reject All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Details Modal */}
        {showDetails && selectedApproval && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Approval Details</CardTitle>
                    <CardDescription>{selectedApproval.referenceNo}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowDetails(false);
                      setRejectionReason("");
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{getTypeIcon(selectedApproval.type).label}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-medium">{selectedApproval.referenceNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">
                      {formatCurrency(selectedApproval.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <p className="font-medium capitalize">{selectedApproval.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Raiser</p>
                    <p className="font-medium">{getUserName(selectedApproval.requestedBy)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested At</p>
                    <p className="font-medium">
                      {new Date(selectedApproval.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedApproval.approvedBy && (
                    <div>
                      <p className="text-sm text-muted-foreground">Approver</p>
                      <p className="font-medium">{getUserName(selectedApproval.approvedBy)}</p>
                    </div>
                  )}
                  {selectedApproval.approvedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Approval Date</p>
                      <p className="font-medium">
                        {new Date(selectedApproval.approvedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedApproval.description}
                  </p>
                </div>

                {/* Approvers */}
                {selectedApproval.approvers && selectedApproval.approvers.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Approvers Required</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedApproval.approvers.map((approver, idx) => (
                        <Badge key={approver || `approver-${idx}`} variant="secondary">
                          {approver}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Reason (if rejecting) */}
                {selectedApproval.status === "pending" && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Rejection Reason (optional)</p>
                    <Input
                      placeholder="Enter rejection reason if rejecting..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Actions */}
                {selectedApproval.status === "pending" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={
                        rejectInvoiceMutation.isPending ||
                        rejectEstimateMutation.isPending ||
                        rejectPaymentMutation.isPending ||
                        rejectExpenseMutation.isPending ||
                        rejectBudgetMutation.isPending ||
                        rejectLPOMutation.isPending ||
                        rejectPurchaseOrderMutation.isPending ||
                        rejectImprestMutation.isPending
                      }
                      onClick={() => {
                        handleReject(selectedApproval);
                      }}
                    >
                      <XCircle size={16} className="mr-2" /> Reject
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={
                        approveInvoiceMutation.isPending ||
                        approveEstimateMutation.isPending ||
                        approvePaymentMutation.isPending ||
                        approveExpenseMutation.isPending ||
                        approveBudgetMutation.isPending ||
                        approveLPOMutation.isPending ||
                        approvePurchaseOrderMutation.isPending ||
                        approveImprestMutation.isPending
                      }
                      onClick={() => {
                        handleApprove(selectedApproval);
                      }}
                    >
                      <CheckCircle size={16} className="mr-2" /> Approve
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
