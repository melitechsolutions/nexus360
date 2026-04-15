import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  Loader2,
  FolderKanban,
  Receipt,
  DollarSign,
  Package,
  Briefcase,
  CreditCard,
  BarChart3,
  UserCog,
  ArrowRight,
  Mail,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import TeamWorkloadDashboard from "@/components/TeamWorkloadDashboard";
import { StatsCard } from "@/components/ui/stats-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * HRDashboard component
 * 
 * Features:
 * - Employee management
 * - Attendance tracking
 * - Leave management
 * - Payroll overview
 * - Performance reviews
 * - Recruitment
 */
export default function HRDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuthWithPersistence({
    redirectOnUnauthenticated: true,
  });
  const [, setLocation] = useLocation();
  const [mobileQuickAccessOpen, setMobileQuickAccessOpen] = useState(false);

  // Fetch employees data from backend
  const { data: employeesData, isLoading: employeesLoading } = trpc.employees.list.useQuery();
  
  // Fetch attendance data from backend
  const { data: attendanceData, isLoading: attendanceLoading } = trpc.attendance.list.useQuery();
  
  // Fetch leave requests from backend
  const { data: leaveData, isLoading: leaveLoading } = trpc.leave.list.useQuery();
  
  // Fetch payroll data from backend
  const { data: payrollData, isLoading: payrollLoading } = trpc.payroll.list.useQuery();

  // Convert frozen Drizzle objects to plain objects to avoid React error #306
  const employeesDataPlain = employeesData ? JSON.parse(JSON.stringify(employeesData)) : [];
  const attendanceDataPlain = attendanceData ? JSON.parse(JSON.stringify(attendanceData)) : [];
  const leaveDataPlain = leaveData ? JSON.parse(JSON.stringify(leaveData)) : [];
  const payrollDataPlain = payrollData ? JSON.parse(JSON.stringify(payrollData)) : [];

  useEffect(() => {
    // Verify user has hr role
    if (!loading && isAuthenticated && user?.role !== "hr") {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading || employeesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "hr") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  // Calculate employee statistics
  const totalEmployees = employeesDataPlain?.length || 0;
  const activeEmployees = employeesDataPlain?.filter((e: any) => e.status === "active").length || 0;
  
  // Calculate today's attendance
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceDataPlain?.filter((a: any) => 
    a.date && new Date(a.date).toISOString().split('T')[0] === today
  ) || [];
  
  const presentToday = todayAttendance.filter((a: any) => a.status === "present" || a.status === "late").length;
  const absentToday = todayAttendance.filter((a: any) => a.status === "absent").length;
  const lateToday = todayAttendance.filter((a: any) => a.status === "late").length;
  const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
  
  // Calculate leave statistics
  const approvedLeaves = leaveDataPlain?.filter((l: any) => l.status === "approved").length || 0;
  const pendingLeaves = leaveDataPlain?.filter((l: any) => l.status === "pending").length || 0;
  const recentLeaveRequests = leaveDataPlain?.filter((l: any) => l.status === "pending").slice(0, 5) || [];

  // Module features for navigation
  const features = [
    {
      title: "Projects",
      description: "Manage and track all your projects",
      icon: FolderKanban,
      href: "/projects",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Clients",
      description: "Client relationship management",
      icon: Users,
      href: "/clients",
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Invoices",
      description: "Create and manage invoices",
      icon: FileText,
      href: "/invoices",
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Estimates",
      description: "Generate quotations and estimates",
      icon: Receipt,
      href: "/estimates",
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: "Payments",
      description: "Track payments and transactions",
      icon: DollarSign,
      href: "/payments",
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Products",
      description: "Product catalog management",
      icon: Package,
      href: "/products",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
    },
    {
      title: "Services",
      description: "Service offerings catalog",
      icon: Briefcase,
      href: "/services",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
    },
    {
      title: "Accounting",
      description: "Financial management and reports",
      icon: CreditCard,
      href: "/accounting",
      color: "text-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-950",
    },
    {
      title: "Reports",
      description: "Analytics and insights",
      icon: BarChart3,
      href: "/reports",
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "HR Analytics",
      description: "Employee metrics and trends",
      icon: TrendingUp,
      href: "/hr/analytics",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
    },
    {
      title: "HR",
      description: "Human resources management",
      icon: UserCog,
      href: "/hr",
      color: "text-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-950",
    },
    {
      title: "Communications",
      description: "Email, SMS, and messaging",
      icon: Mail,
      href: "/communications",
      color: "text-teal-500",
      bgColor: "bg-teal-50 dark:bg-teal-950",
    },
  ];

  // Quick access items for mobile menu
  const quickAccessItems = [
    { title: "Employees", icon: Users, href: "/employees" },
    { title: "Attendance", icon: Clock, href: "/hr/attendance" },
    { title: "Leave Requests", icon: Calendar, href: "/hr/leaves" },
    { title: "Payroll", icon: DollarSign, href: "/payroll" },
    { title: "HR Management", icon: UserCog, href: "/hr/management" },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Mobile Quick Access Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          HR Dashboard
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileQuickAccessOpen(!mobileQuickAccessOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Quick Access Dropdown */}
      {mobileQuickAccessOpen && (
        <div className="md:hidden p-3 border-b bg-muted space-y-2">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => {
                  setLocation(item.href);
                  setMobileQuickAccessOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Icon className="w-4 h-4" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <ModuleLayout
          title="HR Dashboard"
          description="Manage employees, attendance, leave requests, and payroll operations"
          icon={<Users className="h-5 w-5" />}
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "HR" }]}
          actions={
            <div className="flex gap-2">
              <Button onClick={() => setLocation("/hr/management")} variant="secondary" size="sm" className="gap-2 hidden sm:flex">
                <Settings className="w-4 h-4" />
                HR Management
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setLocation("/crm-home")} className="hidden sm:flex">
                Go to Main Dashboard
              </Button>
            </div>
          }
        >
      <div className="space-y-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="Total Employees" value={totalEmployees} description={<>{activeEmployees} active</>} color="border-l-orange-500" />

          <StatsCard
            label="Today's Attendance"
            value={<>{presentToday}/<span className="text-sm text-slate-600 dark:text-slate-300">{totalEmployees}</span></>}
            description={<>{attendanceRate}% attendance rate</>}
            color="border-l-purple-500"
          />

          <StatsCard
            label="Pending Leave Requests"
            value={leaveDataPlain?.filter((l: any) => l.status === "pending").length || 0}
            description="Awaiting approval"
            color="border-l-green-500"
          />

          <StatsCard label="Payroll Cycles" value={payrollDataPlain?.length || 0} description="Total cycles" color="border-l-blue-500" />
        </div>

        {/* Module Features Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.href}
                className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group hover:scale-105 border-2 hover:border-primary/50"
                onClick={() => setLocation(feature.href)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full group-hover:bg-accent">
                    View {feature.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="employees" className="flex items-center gap-2 whitespace-nowrap">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Employees</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2 whitespace-nowrap">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Leave</span>
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-2 whitespace-nowrap">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Payroll</span>
            </TabsTrigger>
            <TabsTrigger value="workload" className="flex items-center gap-2 whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Workload</span>
            </TabsTrigger>
          </TabsList>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-50">Employee Management</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300">Manage employee information and records</CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/employees/create")}>Add Employee</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input placeholder="Search employees..." />
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(employeesData) && employeesData.length > 0 ? (
                          employeesData.slice(0, 10).map((employee: any) => (
                            <TableRow key={employee.id}>
                              <TableCell>{employee.name || 'N/A'}</TableCell>
                              <TableCell>{employee.position || 'N/A'}</TableCell>
                              <TableCell>{employee.department || 'N/A'}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  employee.status === 'active' ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                }`}>
                                  {employee.status || 'Active'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => setLocation(`/employees/${employee.id}`)}>
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">
                              No employees found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-50">Attendance Tracking</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300">Monitor employee attendance records</CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/attendance/new")}>Mark Attendance</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-300">Present</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{presentToday}</p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-300">Absent</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{absentToday}</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-300">Late</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{lateToday}</p>
                    </div>
                  </div>
                  {todayAttendance.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <p>No attendance records for today</p>
                      <Button className="mt-4" onClick={() => setLocation("/attendance/new")}>
                        Mark Attendance
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Management Tab */}
          <TabsContent value="leave" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-50">Leave Management</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300">Manage employee leave requests</CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/leave-management/create")}>New Leave Request</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentLeaveRequests.length > 0 ? (
                    recentLeaveRequests.map((leave: any) => (
                      <div key={leave.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-50">
                              {leave.employeeName || 'Employee'} - {leave.type || 'Leave'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {leave.startDate ? new Date(leave.startDate).toLocaleDateString() : 'N/A'} - {leave.endDate ? new Date(leave.endDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setLocation(`/leave/${leave.id}`)}>
                              Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8 text-slate-500 dark:text-slate-400">No pending leave requests</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-50">Payroll Management</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300">Manage employee payroll and salaries</CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/payroll/create")}>Process Payroll</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(payrollData) && payrollData.length > 0 ? (
                    payrollData.slice(0, 5).map((payroll: any) => (
                      <div key={payroll.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-50">
                              {payroll.month || 'Month'} {payroll.year || 'Year'} Payroll
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {payroll.status === 'processed' ? 'Processed' : 'Pending processing'}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setLocation(`/payroll/${payroll.id}`)}>
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <p>No payroll records found</p>
                      <Button className="mt-4" onClick={() => setLocation("/payroll/create")}>
                        Process Payroll
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Workload Tab */}
          <TabsContent value="workload" className="space-y-4">
            <TeamWorkloadDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
      </div>
    </div>
  );
}
