import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import ActionButtons from "@/components/ActionButtons";
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
import {
  Calendar,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Umbrella,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: "annual" | "sick" | "unpaid" | "maternity" | "paternity";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "approved" | "pending" | "rejected";
  appliedDate: string;
}

export default function LeaveManagement() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // convert backend rows to UI-friendly shape
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  // Fetch real data from backend - ensure we have array
  const { data: rawData = [], isLoading } = trpc.leave.list.useQuery();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.leave.delete.useMutation({
    onSuccess: () => { utils.leave.list.invalidate(); },
  });

  // whenever data updates, map it
  useEffect(() => {
    // Ensure data is an array - check structure
    let dataArray: any[] = [];
    if (Array.isArray(rawData)) {
      dataArray = rawData;
    } else if (rawData && typeof rawData === 'object' && 'requests' in rawData) {
      dataArray = rawData.requests || [];
    } else if (rawData && typeof rawData === 'object' && 'data' in rawData) {
      dataArray = rawData.data || [];
    }

    if (dataArray.length > 0) {
      setRequests(
        dataArray.map((r: any) => ({
          id: r.id,
          employeeId: r.employeeId,
          employeeName: r.employeeName || '',
          leaveType: r.leaveType,
          startDate: r.startDate,
          endDate: r.endDate,
          days: r.days,
          reason: r.reason,
          status: r.status,
          appliedDate: r.createdAt || '',
        }))
      );
    }
  }, [rawData]);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.leaveType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "rejected":
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case "annual":
        return "bg-blue-500/10 text-blue-500";
      case "sick":
        return "bg-red-500/10 text-red-500";
      case "unpaid":
        return "bg-gray-500/10 text-gray-500";
      case "maternity":
        return "bg-pink-500/10 text-pink-500";
      case "paternity":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const totalDays = requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.days, 0);

  return (
    <ModuleLayout
      title="Leave Management"
      description="Manage employee leave requests and approvals"
      icon={<Calendar className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Leave Management" },
      ]}
      actions={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Leave Request
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Approved"
            value={approvedCount}
            description="Leave requests approved"
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Pending"
            value={pendingCount}
            description="Awaiting approval"
            icon={<Clock className="h-5 w-5" />}
            color="border-l-orange-500"
          />

          <StatsCard
            label="Total Days"
            value={totalDays}
            description="Days approved"
            icon={<Calendar className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="On Leave"
            value="2"
            description="Currently on leave"
            icon={<Umbrella className="h-5 w-5" />}
            color="border-l-purple-500"
          />
        </div>

        {/* Leave Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Leave Requests</CardTitle>
                <CardDescription>Review and manage leave applications</CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{request.employeeId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getLeaveTypeColor(request.leaveType)} variant="outline">
                        {request.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(request.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(request.endDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{request.days} days</TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(request.status)} className="gap-1">
                        {getStatusIcon(request.status)}
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButtons
                        id={request.id}
                        handlers={{
                          onView: (id) => navigate(`/leave-management/${id}`),
                          onEdit: (id) => navigate(`/leave-management/${id}/edit`),
                          onDelete: (id) => {
                            if (confirm("Delete this leave request?")) {
                              deleteMutation.mutate(String(id));
                            }
                          },
                        }}
                        showView={true}
                        showEdit={true}
                        showDelete={true}
                        variant="dropdown"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

