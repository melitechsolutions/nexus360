import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Calendar,
  DollarSign,
  ArrowRight,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * HR Module Hub
 * 
 * Central gateway for all HR functionalities including:
 * - Employee Management
 * - Attendance Tracking
 * - Payroll Management
 * - Leave Management
 * - Department Management
 * - HR Analytics & Reports
 */
export default function HR() {
  const [, navigate] = useLocation();
  const { user, loading, isAuthenticated } = useAuthWithPersistence({
    redirectOnUnauthenticated: true,
  });
  const { allowed, isLoading: permissionLoading } = useRequireFeature("hr:view");

  // Fetch HR metrics from backend
  const { data: employeesData = [], isLoading: employeesLoading } = trpc.employees.list.useQuery();
  const { data: attendanceData = [], isLoading: attendanceLoading } = trpc.attendance.list.useQuery();
  const { data: payrollData = [], isLoading: payrollLoading } = trpc.payroll.list.useQuery();
  const { data: leaveData = [], isLoading: leaveLoading } = trpc.leave.list.useQuery();
  const { data: departmentsData = [], isLoading: departmentsLoading } = trpc.departments.list.useQuery();
  const { data: jobGroupsData = [], isLoading: jobGroupsLoading } = trpc.jobGroups.list.useQuery();

  if (loading || permissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  // Calculate metrics from real data
  const totalEmployees = employeesData?.length || 0;
  const activeEmployees = employeesData?.filter((e: any) => e.isActive)?.length || 0;
  const pendingLeaveRequests = leaveData?.filter((l: any) => l.status === 'pending')?.length || 0;
  const totalDepartments = departmentsData?.length || 0;
  const absentToday = attendanceData?.filter((a: any) => {
    const today = new Date().toISOString().split('T')[0];
    return a.date === today && a.status === 'absent';
  })?.length || 0;

  // Module cards data - Unified card style
  const modules = [
    {
      title: "Employees",
      description: "Manage employee records, profiles, and information",
      icon: Users,
      href: "/employees",
      borderColor: "border-l-blue-500",
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
      stats: { label: "Active", value: activeEmployees },
    },
    {
      title: "Departments",
      description: "Organize and manage department structure",
      icon: Building2,
      href: "/departments",
      borderColor: "border-l-purple-500",
      iconBg: "bg-purple-50 dark:bg-purple-950",
      iconColor: "text-purple-600 dark:text-purple-400",
      stats: { label: "Departments", value: totalDepartments },
    },
    {
      title: "Attendance",
      description: "Track employee attendance and working hours",
      icon: Calendar,
      href: "/attendance",
      borderColor: "border-l-green-500",
      iconBg: "bg-green-50 dark:bg-green-950",
      iconColor: "text-green-600 dark:text-green-400",
      stats: { label: "Absent Today", value: absentToday },
    },
    {
      title: "Leave Management",
      description: "Handle leave requests, approvals, and tracking",
      icon: Clock,
      href: "/leave-management",
      borderColor: "border-l-orange-500",
      iconBg: "bg-orange-50 dark:bg-orange-950",
      iconColor: "text-orange-600 dark:text-orange-400",
      stats: { label: "Pending", value: pendingLeaveRequests },
    },
    {
      title: "Payroll",
      description: "Process salaries, allowances, and deductions",
      icon: DollarSign,
      href: "/payroll",
      borderColor: "border-l-pink-500",
      iconBg: "bg-pink-50 dark:bg-pink-950",
      iconColor: "text-pink-600 dark:text-pink-400",
      stats: { label: "Records", value: payrollData?.length || 0 },
    },
    {
      title: "Performance",
      description: "Track and manage employee performance reviews",
      icon: TrendingUp,
      href: "/performance-reviews",
      borderColor: "border-l-indigo-500",
      iconBg: "bg-indigo-50 dark:bg-indigo-950",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      stats: { label: "Reviews", value: 0 },
    },
    {
      title: "Job Groups",
      description: "Manage job grades, salary structures, and classifications",
      icon: Building2,
      href: "/job-groups",
      borderColor: "border-l-cyan-500",
      iconBg: "bg-cyan-50 dark:bg-cyan-950",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      stats: { label: "Groups", value: jobGroupsData?.length || 0 },
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isLoading = employeesLoading || attendanceLoading || payrollLoading || leaveLoading || departmentsLoading;

  return (
    <ModuleLayout
      title="Human Resources"
      description="Manage employees, departments, attendance, leave, payroll, and more"
      icon={<Users className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR" },
      ]}
    >
      <div className="space-y-6 p-4 sm:p-6">

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <StatsCard
            label="Total Employees"
            value={totalEmployees}
            description={<>{activeEmployees} active</>}
            icon={<Users className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="Departments"
            value={totalDepartments}
            description="Organizational units"
            icon={<Building2 className="h-5 w-5" />}
            color="border-l-purple-500"
          />

          <StatsCard
            label="Absent Today"
            value={absentToday}
            description="Employees"
            icon={<AlertCircle className="h-5 w-5" />}
            color="border-l-red-500"
          />

          <StatsCard
            label="Pending Leaves"
            value={pendingLeaveRequests}
            description="Awaiting approval"
            icon={<Clock className="h-5 w-5" />}
            color="border-l-orange-500"
          />

          <StatsCard
            label="Payroll Records"
            value={payrollData?.length || 0}
            description="This month"
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-green-500"
          />
        </div>

        {/* Module Grid - Unified Card Style */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.href}
                onClick={() => navigate(module.href)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-l-4 p-4 sm:p-5 text-left transition-all duration-300",
                  "bg-white dark:bg-slate-800/60 border-t border-r border-b border-slate-200 dark:border-slate-700",
                  "hover:shadow-xl hover:-translate-y-1 cursor-pointer",
                  module.borderColor
                )}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${module.iconBg}`}>
                      <Icon className={`h-5 w-5 ${module.iconColor}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50">{module.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{module.stats.label}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-0.5">{module.stats.value}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-transparent via-current to-transparent"></div>
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common HR tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/employees/create")}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Employee
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/departments/create")}>
                <Building2 className="h-4 w-4 mr-2" />
                Create Department
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/attendance/create")}>
                <Calendar className="h-4 w-4 mr-2" />
                Record Attendance
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/leave-management/create")}>
                <Clock className="h-4 w-4 mr-2" />
                Process Leave Request
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/payroll/create")}>
                <DollarSign className="h-4 w-4 mr-2" />
                Process Payroll
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/job-groups")}>
                <Building2 className="h-4 w-4 mr-2" />
                Manage Job Groups
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/hr/analytics")}>
                <TrendingUp className="h-4 w-4 mr-2" />
                View HR Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

