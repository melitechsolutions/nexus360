import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  Edit,
  UserCheck,
  Clock,
  Umbrella,
  Award,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Separator } from "@/components/ui/separator";
import { useFavorite } from "@/hooks/useFavorite";

export default function EmployeeDetails() {
  const [, params] = useRoute("/employees/:id");
  const [, navigate] = useLocation();
  const employeeId = params?.id || "";

  // Fetch employee from backend
  const { data: employeeData, isLoading } = trpc.employees.getById.useQuery(employeeId);
  const { isStarred, toggleStar } = useFavorite("employee", employeeId, (employeeData as any)?.name);
  const { data: jobGroupsData = [] } = trpc.jobGroups.list.useQuery();

  const jobGroup = jobGroupsData.find((jg: any) => jg.id === (employeeData as any)?.jobGroupId);

  const employee = employeeData ? {
    id: employeeId,
    employeeId: (employeeData as any).employeeNumber || `EMP-${employeeId.slice(0, 8)}`,
    name: `${(employeeData as any).firstName || ""} ${(employeeData as any).lastName || ""}`.trim() || "Unknown Employee",
    email: (employeeData as any).email || "",
    phone: (employeeData as any).phone || "",
    address: (employeeData as any).address || "",
    department: (employeeData as any).department || "Unknown",
    position: (employeeData as any).position || "Unknown",
    jobGroupId: (employeeData as any).jobGroupId || "",
    jobGroupName: jobGroup?.name || "Unknown",
    employmentType: (employeeData as any).employmentType || "full_time",
    status: (employeeData as any).status || "active",
    joinDate: (employeeData as any).hireDate ? new Date((employeeData as any).hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    salary: ((employeeData as any).salary || 0) / 100,
    photoUrl: (employeeData as any).photoUrl || "",
    avatar: null,
  } : null;

  const attendanceRecords = [
    { date: "2024-10-21", clockIn: "08:30 AM", clockOut: "05:45 PM", hours: 9.25, status: "present" },
    { date: "2024-10-20", clockIn: "08:45 AM", clockOut: "06:00 PM", hours: 9.25, status: "present" },
    { date: "2024-10-19", clockIn: "09:15 AM", clockOut: "05:30 PM", hours: 8.25, status: "late" },
  ];

  const leaveHistory = [
    { type: "Annual Leave", startDate: "2024-09-01", endDate: "2024-09-05", days: 5, status: "approved" },
    { type: "Sick Leave", startDate: "2024-07-15", endDate: "2024-07-16", days: 2, status: "approved" },
  ];

  const payrollHistory = [
    { month: "October 2024", basic: 150000, allowances: 20000, deductions: 15000, net: 155000 },
    { month: "September 2024", basic: 150000, allowances: 20000, deductions: 15000, net: 155000 },
    { month: "August 2024", basic: 150000, allowances: 20000, deductions: 15000, net: 155000 },
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "on-leave":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <UserCheck className="h-3 w-3" />;
      case "present":
        return <UserCheck className="h-3 w-3" />;
      case "late":
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout title="Employee Details" icon={<User className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "HR", href: "/employees"}, {label: "Employees", href: "/employees"}, {label: "Details"}]} backLink={{label: "Employees", href: "/employees"}}>
        <div className="flex items-center justify-center h-64">
          <p>Loading employee...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!employee) {
    return (
      <ModuleLayout title="Employee Details" icon={<User className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "HR", href: "/employees"}, {label: "Employees", href: "/employees"}, {label: "Details"}]} backLink={{label: "Employees", href: "/employees"}}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Employee not found</p>
          <Button onClick={() => navigate("/employees")}>Back to Employees</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title="Employee Details" icon={<User className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "HR", href: "/employees"}, {label: "Employees", href: "/employees"}, {label: "Details"}]} backLink={{label: "Employees", href: "/employees"}}>
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={toggleStar}><Star className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} /></Button>
            <Button variant="ghost" size="icon" onClick={() => { const email = employee?.email; if (email) window.location.href = `mailto:${email}`; }}><Mail className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/employees/${employeeId}/edit`)}><Edit className="h-4 w-4" /></Button>
        </div>

        {/* Split Layout */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-[320px] min-w-[320px] space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-3">
                    <AvatarImage src={employee?.photoUrl || undefined} alt={employee?.name} />
                    <AvatarFallback className="text-lg">
                      {employee?.name.charAt(0)}{employee?.name.split(' ')[1]?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{employee?.name}</h2>
                  <p className="text-sm text-muted-foreground">{employee?.position}</p>
                  <p className="text-xs text-muted-foreground">{employee?.employeeId}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Badge variant="default">{employee?.jobGroupName}</Badge>
                  <Badge variant="secondary">{employee?.employmentType?.replace('_', ' ').toUpperCase()}</Badge>
                  <Badge variant={employee?.status === "active" ? "default" : "secondary"}>
                    {employee?.status}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{employee.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{employee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{employee.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-medium">{employee.address || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Joined</p>
                      <p className="font-medium">
                        {new Date(employee.joinDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Compensation</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Salary</p>
                      <p className="font-bold">Ksh {(employee.salary || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Leave Bal.</p>
                      <p className="font-bold">14 days</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="attendance" className="space-y-4">
              <TabsList>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="leave">Leave History</TabsTrigger>
                <TabsTrigger value="payroll">Payroll</TabsTrigger>
              </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Last 30 days attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record, index) => (
                      <TableRow key={record.date ? `attendance-${record.date}` : `record-${index}`}>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>{record.clockIn}</TableCell>
                        <TableCell>{record.clockOut}</TableCell>
                        <TableCell>{record.hours} hrs</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "present" ? "default" : "outline"}>
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Leave History</CardTitle>
                <CardDescription>Past leave requests and approvals</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveHistory.map((leave, index) => (
                      <TableRow key={leave.startDate ? `leave-${leave.startDate}` : `leave-${index}`}>
                        <TableCell>{leave.type}</TableCell>
                        <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>{leave.days} days</TableCell>
                        <TableCell>
                          <Badge variant="default">{leave.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payroll History</CardTitle>
                <CardDescription>Monthly salary breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Basic Salary</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollHistory.map((payroll, index) => (
                      <TableRow key={payroll.month || `payroll-${index}`}>
                        <TableCell>{payroll.month}</TableCell>
                        <TableCell className="text-right">Ksh {(payroll.basic || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">
                          +Ksh {(payroll.allowances || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          -Ksh {(payroll.deductions || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          Ksh {(payroll.net || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}

