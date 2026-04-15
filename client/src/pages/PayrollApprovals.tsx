import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Search,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";
import { useUserLookup } from "@/hooks/useUserLookup";

interface PayrollApproval {
  id: string;
  payrollId: string;
  employeeName: string;
  basicSalary: number;
  netSalary: number;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  requestedDate: string;
  approverComments?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export default function PayrollApprovals() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { getUserName } = useUserLookup();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApproval, setSelectedApproval] = useState<PayrollApproval | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [approverComment, setApproverComment] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const { data: rawApprovals = [], isLoading } = trpc.payroll.approvals.list.useQuery();
  const approvals: PayrollApproval[] = JSON.parse(JSON.stringify(rawApprovals)).map((a: any) => ({
    id: a.id,
    payrollId: a.payrollId,
    employeeName: a.employeeName || "Unknown",
    basicSalary: a.basicSalary || 0,
    netSalary: a.netSalary || 0,
    status: a.status || "pending",
    requestedBy: a.approverRole || "HR",
    requestedDate: a.createdAt || "",
    approverComments: a.rejectionReason,
    approvedBy: a.approverRole,
    approvedDate: a.approvalDate,
  }));

  const approveMutation = trpc.payroll.approvals.approve.useMutation({
    onSuccess: () => { utils.payroll.approvals.list.invalidate(); toast.success("Payroll approved successfully!"); },
  });
  const rejectMutation = trpc.payroll.approvals.reject.useMutation({
    onSuccess: () => { utils.payroll.approvals.list.invalidate(); toast.success("Payroll rejected!"); },
  });

  const filteredApprovals = approvals.filter((approval) => {
    const matchesSearch =
      approval.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || approval.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: approvals.filter((a) => a.status === "pending").length,
    approved: approvals.filter((a) => a.status === "approved").length,
    rejected: approvals.filter((a) => a.status === "rejected").length,
    totalAmount: approvals.reduce((sum, a) => sum + (a.status === "pending" ? a.netSalary : 0), 0),
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setIsApproving(true);
    try {
      await approveMutation.mutateAsync({ id: selectedApproval.id });
      setIsDetailsOpen(false);
      setApproverComment("");
      setSelectedApproval(null);
    } catch { toast.error("Failed to approve"); }
    setIsApproving(false);
  };

  const handleReject = async () => {
    if (!selectedApproval || !approverComment) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setIsRejecting(true);
    try {
      await rejectMutation.mutateAsync({ id: selectedApproval.id, reason: approverComment });
      setIsDetailsOpen(false);
      setApproverComment("");
      setSelectedApproval(null);
    } catch { toast.error("Failed to reject"); }
    setIsRejecting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <ModuleLayout
      title="Payroll Approvals"
      description="Review and approve/reject payroll records"
      icon={<CheckCircle2 className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Approvals" },
      ]}
      backLink={{ label: "Payroll", href: "/payroll" }}
    >
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-xs text-gray-500 mt-1">Ready to process</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-xs text-gray-500 mt-1">Needs revision</p>
            </CardContent>
          </Card>

          <StatsCard
            label="Pending Amount"
            value={<>Ksh {stats.totalAmount.toLocaleString()}</>}
            description="To be paid"
            color="border-l-blue-500"
          />
        </div>

        {/* Filter and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="all" onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by employee or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Approval ID</TableHead>
                    <TableHead>Basic Salary (Ksh)</TableHead>
                    <TableHead>Net Salary (Ksh)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApprovals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No payroll records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApprovals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell className="font-medium">{approval.employeeName}</TableCell>
                        <TableCell className="text-sm text-gray-600">{approval.id}</TableCell>
                        <TableCell>{approval.basicSalary.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">{approval.netSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(approval.status)}
                            <Badge
                              className={
                                approval.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : approval.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(approval.requestedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApproval(approval);
                              setIsDetailsOpen(true);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payroll Approval Review</DialogTitle>
            <DialogDescription>Review and approve/reject this payroll record</DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-6">
              {/* Employee Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Employee</span>
                  <span className="font-medium">{selectedApproval.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Approval ID</span>
                  <span className="font-medium text-sm">{selectedApproval.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Requested Date</span>
                  <span className="font-medium">
                    {new Date(selectedApproval.requestedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Salary Details */}
              <div className="space-y-3 border rounded-lg p-4">
                <h3 className="font-semibold text-sm">Salary Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Basic Salary</span>
                    <span className="font-medium">Ksh {selectedApproval.basicSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Net Salary</span>
                    <span className="font-bold text-green-700">
                      Ksh {selectedApproval.netSalary.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(selectedApproval.status)}
                  <span className="font-medium">Status: {selectedApproval.status.toUpperCase()}</span>
                </div>
                {selectedApproval.approverComments && (
                  <p className="text-sm text-gray-600 mt-2">{selectedApproval.approverComments}</p>
                )}
              </div>

              {/* Approval Form */}
              {selectedApproval.status === "pending" && (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label htmlFor="comment">Your Comments</Label>
                    <Textarea
                      id="comment"
                      placeholder="Add your approval/rejection comments..."
                      value={approverComment}
                      onChange={(e) => setApproverComment(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      {isApproving ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={isRejecting || !approverComment}
                      variant="destructive"
                      className="flex-1"
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      {isRejecting ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                </div>
              )}

              {selectedApproval.status !== "pending" && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Approved By</span>
                      <span className="font-medium">{getUserName(selectedApproval.approvedBy) || selectedApproval.approvedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Approval Date</span>
                      <span className="font-medium">
                        {selectedApproval.approvedDate && new Date(selectedApproval.approvedDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
