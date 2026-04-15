import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
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
  Clock,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { StatsCard } from "@/components/ui/stats-card";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  status: "present" | "absent" | "late" | "half-day";
  hoursWorked: number;
}

export default function Attendance() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());

  // Fetch real data from backend
  const { data: attendanceData = [], isLoading } = trpc.attendance?.list.useQuery({
    limit: 100,
    offset: 0,
  }) || { data: [], isLoading: false };

  // Transform data for display
  const records = (attendanceData || []).map((record: any) => ({
    id: record.id,
    employeeId: record.employeeId || "N/A",
    employeeName: record.employeeName || "Unknown",
    date: record.date || new Date().toISOString().split("T")[0],
    clockIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "-",
    clockOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "-",
    status: record.status || "present",
    hoursWorked: record.hoursWorked || 0,
  }));

  const filteredRecords = records.filter((record: any) => {
    const matchesSearch =
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    const variants: { [key: string]: string } = {
      present: "default",
      late: "outline",
      absent: "destructive",
      "half-day": "secondary",
      leave: "secondary",
    };
    return variants[status] || "default";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-3 w-3" />;
      case "late":
        return <AlertCircle className="h-3 w-3" />;
      case "absent":
        return <XCircle className="h-3 w-3" />;
      case "half-day":
      case "leave":
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const presentCount = records.filter((r: any) => r.status === "present").length;
  const lateCount = records.filter((r: any) => r.status === "late").length;
  const absentCount = records.filter((r: any) => r.status === "absent").length;
  const totalHours = records.reduce((sum: number, r: any) => sum + r.hoursWorked, 0);

  return (
    <ModuleLayout
      title="Attendance Management"
      description="Track employee attendance and working hours"
      icon={<Clock className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Attendance" },
      ]}
      actions={
        <Button onClick={() => navigate("/attendance/create")} className="gap-2">
          <Plus className="w-4 h-4" />
          Record Attendance
        </Button>
      }
    >
      <div className="space-y-6 p-6">

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Present"
            value={presentCount}
            description="Employees present today"
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Late"
            value={lateCount}
            description="Late arrivals"
            icon={<AlertCircle className="h-5 w-5" />}
            color="border-l-orange-500"
          />

          <StatsCard
            label="Absent"
            value={absentCount}
            description="Employees absent"
            icon={<XCircle className="h-5 w-5" />}
            color="border-l-red-500"
          />

          <StatsCard
            label="Total Hours"
            value={totalHours.toFixed(1)}
            description="Hours worked today"
            icon={<Clock className="h-5 w-5" />}
            color="border-l-blue-500"
          />
        </div>

        {/* Attendance Records */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>Daily attendance tracking</CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate.toISOString().split("T")[0]}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="w-32"
                  />
                  <span className="flex items-center">to</span>
                  <Input
                    type="date"
                    value={endDate.toISOString().split("T")[0]}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                    className="w-32"
                  />
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
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
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading attendance records...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No attendance records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employeeId}</TableCell>
                        <TableCell>{record.employeeName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(record.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{record.clockIn}</TableCell>
                        <TableCell>{record.clockOut}</TableCell>
                        <TableCell>{record.hoursWorked.toFixed(2)} hrs</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(record.status)} className="gap-1">
                            {getStatusIcon(record.status)}
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/attendance/${record.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/attendance/${record.id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

