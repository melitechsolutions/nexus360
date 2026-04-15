import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  Search,
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
  Upload,
  TrendingDown,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * AdminDashboard component
 * 
 * Features:
 * - Organization management
 * - Department management
 * - Staff oversight
 * - Reports and analytics
 * - Content management
 */
export default function AdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuthWithPersistence({
    redirectOnUnauthenticated: true,
  });
  const [, setLocation] = useLocation();
  const [staffSearch, setStaffSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Fetch dashboard metrics from backend
  const { data: metrics, isLoading: metricsLoading } = trpc.dashboard.metrics.useQuery();
  
  // Fetch employees/staff data
  const { data: employeesData, isLoading: employeesLoading } = trpc.employees.list.useQuery();
  
  // Fetch departments data
  const { data: departmentsData, isLoading: departmentsLoading } = trpc.departments.list.useQuery();
  
  // Fetch projects data
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  
  // Fetch leave requests for pending approvals
  const { data: leaveData } = trpc.leave.list.useQuery();

  // Convert frozen Drizzle objects to plain objects to avoid React error #306
  const metricsPlain = metrics ? JSON.parse(JSON.stringify(metrics)) : null;
  const employeesDataPlain = employeesData ? JSON.parse(JSON.stringify(employeesData)) : [];
  const departmentsDataPlain = departmentsData ? JSON.parse(JSON.stringify(departmentsData)) : [];
  const projectsDataPlain = projectsData ? JSON.parse(JSON.stringify(projectsData)) : [];
  const leaveDataPlain = leaveData ? JSON.parse(JSON.stringify(leaveData)) : [];

  useEffect(() => {
    // Verify user has admin role
    if (!loading && isAuthenticated && user?.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading || metricsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  // Calculate statistics
  const totalStaff = employeesDataPlain?.length || 0;
  const activeStaff = employeesDataPlain?.filter((e: any) => e.status === "active").length || 0;
  const totalDepartments = departmentsDataPlain?.length || 0;
  const activeDepartments = departmentsDataPlain?.filter((d: any) => d.isActive !== false).length || 0;
  const pendingLeaves = leaveDataPlain?.filter((l: any) => l.status === "pending").length || 0;
  const activeProjects = projectsDataPlain?.filter((p: any) => p.status === "active").length || 0;

  // Filter staff based on search
  const filteredStaff = employeesDataPlain?.filter((e: any) =>
    e.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    e.email?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    e.department?.toLowerCase().includes(staffSearch.toLowerCase())
  ) || [];

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
      title: "Financial Reports",
      description: "P&L, balance sheet, and cash flow",
      icon: FileText,
      href: "/finance/reports",
      color: "text-teal-500",
      bgColor: "bg-teal-50 dark:bg-teal-950",
    },
    {
      title: "Sales Analytics",
      description: "Revenue, trends, and collections",
      icon: TrendingDown,
      href: "/reports/sales",
      color: "text-violet-500",
      bgColor: "bg-violet-50 dark:bg-violet-950",
    },
    {
      title: "Data Import",
      description: "Import clients, employees, products",
      icon: Upload,
      href: "/import-excel",
      color: "text-sky-500",
      bgColor: "bg-sky-50 dark:bg-sky-950",
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
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
    },
  ];

  // Mini sidebar items for responsive design
  const sidebarItems = [
    { title: "Projects", icon: FolderKanban, href: "/projects" },
    { title: "Clients", icon: Users, href: "/clients" },
    { title: "Invoices", icon: FileText, href: "/invoices" },
    { title: "Payments", icon: DollarSign, href: "/payments" },
    { title: "HR", icon: UserCog, href: "/hr" },
    { title: "Staff Chat", icon: Mail, href: "/staff-chat" },
    { title: "Reports", icon: BarChart3, href: "/reports" },
    { title: "Settings", icon: UserCog, href: "/admin/management" },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Mini Sidebar */}
      <div className="hidden md:flex md:w-60 md:flex-col md:border-r md:bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => {
                  setLocation(item.href);
                  setMobileNavOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition hover:bg-muted"
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{item.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="fixed left-0 top-0 h-full w-64 bg-card flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Admin
              </h2>
              <button onClick={() => setMobileNavOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      setLocation(item.href);
                      setMobileNavOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition hover:bg-muted"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <ModuleLayout
            title="Admin Dashboard"
            description="Manage organization, departments, staff, and system settings"
            icon={<Shield className="h-5 w-5" />}
            breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admin" }]}
            actions={
              <div className="flex gap-2">
                <Button onClick={() => setLocation("/admin/management")} variant="secondary" size="sm" className="gap-2">
                  <UserCog className="w-4 h-4" />
                  Staff Management
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setLocation("/crm-home")}>
                  Go to Main Dashboard
                </Button>
              </div>
            }
          >
            <div className="space-y-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="Total Staff" value={totalStaff} description={<>{activeStaff} active</>} color="border-l-orange-500" />

          <StatsCard label="Departments" value={totalDepartments} description={<>{activeDepartments} active</>} color="border-l-purple-500" />

          <StatsCard label="Pending Approvals" value={pendingLeaves} description="Leave requests" color="border-l-green-500" />

          <StatsCard label="Active Projects" value={activeProjects} description="In progress" color="border-l-blue-500" />
        </div>

        {/* Module Features Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.href}
                className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group hover:scale-105 border-2 hover:border-primary/50"
              >
                <CardHeader onClick={() => setLocation(feature.href)}>
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
                  <Button variant="ghost" className="w-full group-hover:bg-accent" onClick={() => setLocation(feature.href)}>
                    View {feature.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff Management
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-slate-50">System Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Total Employees</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalStaff}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Active Projects</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeProjects}</p>
                      </div>
                      <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Pending Approvals</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingLeaves}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-slate-50">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start"
                    onClick={() => setLocation("/employees/create")}
                  >
                    Add New Staff Member
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/departments/create")}
                  >
                    Create Department
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/reports")}
                  >
                    View Reports
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/leave")}
                  >
                    Manage Approvals
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-50">Department Management</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300">Manage organization departments</CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/departments/create")}>Add Department</Button>
                </div>
              </CardHeader>
              <CardContent>
                {departmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                  </div>
                ) : Array.isArray(departmentsDataPlain) && departmentsDataPlain.length > 0 ? (
                  <div className="space-y-3">
                    {departmentsDataPlain.map((dept: any) => (
                      <div 
                        key={dept.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer"
                        onClick={() => setLocation(`/departments/${dept.id}`)}
                      >
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-50">{dept.name || "Unnamed Department"}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {dept.description || "No description"}
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            dept.isActive !== false 
                              ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          }`}>
                            {dept.isActive !== false ? "Active" : "Inactive"}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/departments/${dept.id}/edit`);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No departments found. Create your first department to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-50">Staff Management</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300">Manage organization staff members</CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/employees/create")}>Add Staff</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <Input 
                      placeholder="Search staff members..." 
                      className="pl-10"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                    />
                  </div>

                  {employeesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : filteredStaff.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStaff.map((employee: any) => (
                            <TableRow key={employee.id}>
                              <TableCell>{employee.name || "N/A"}</TableCell>
                              <TableCell>{employee.department || "Unassigned"}</TableCell>
                              <TableCell>{employee.position || "N/A"}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  employee.status === "active" 
                                    ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200" 
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                }`}>
                                  {employee.status || "Unknown"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setLocation(`/employees/${employee.id}`)}
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      {staffSearch 
                        ? "No staff members found matching your search" 
                        : "No staff members found. Add your first employee to get started."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-50">Reports</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">Generate and view administrative reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div 
                  className="p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer"
                  onClick={() => setLocation("/reports/staff")}
                >
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-50">Staff Report</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">View staff statistics and details ({totalStaff} employees)</p>
                </div>
                <div 
                  className="p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer"
                  onClick={() => setLocation("/reports/departments")}
                >
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-50">Department Report</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">View department performance metrics ({totalDepartments} departments)</p>
                </div>
                <div 
                  className="p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer"
                  onClick={() => setLocation("/reports/projects")}
                >
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-50">Project Report</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">View project status and progress ({activeProjects} active)</p>
                </div>
                <div 
                  className="p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer"
                  onClick={() => setLocation("/reports/leave")}
                >
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-50">Leave Report</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">View leave requests and approvals ({pendingLeaves} pending)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
            </div>
          </ModuleLayout>
        </div>
      </div>
    </div>
  );
}
