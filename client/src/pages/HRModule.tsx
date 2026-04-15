import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, Users, Building2, Clock, DollarSign, Calendar, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function HRModule() {
  const [, navigate] = useLocation();

  // Fetch HR metrics from backend
  const { data: employeesData } = trpc.employees.list.useQuery();
  const { data: departmentsData } = trpc.departments.list.useQuery();
  
  const totalEmployees = employeesData?.length || 0;
  const totalDepartments = departmentsData?.length || 0;

  const hrModules = [
    {
      title: "Employees",
      description: "Manage employee information and records",
      icon: Users,
      href: "/employees",
      stats: { label: "Total Employees", value: totalEmployees.toString() },
    },
    {
      title: "Departments",
      description: "Organize employees by departments",
      icon: Building2,
      href: "/departments",
      stats: { label: "Departments", value: totalDepartments.toString() },
    },
    {
      title: "Attendance",
      description: "Track employee attendance and time",
      icon: Clock,
      href: "/attendance",
      stats: { label: "This Month", value: "0" },
    },
    {
      title: "Payroll",
      description: "Manage salaries and payroll processing",
      icon: DollarSign,
      href: "/payroll",
      stats: { label: "Payroll Records", value: "0" },
    },
    {
      title: "Leave Management",
      description: "Handle leave requests and approvals",
      icon: Calendar,
      href: "/leave-management",
      stats: { label: "Pending Requests", value: "0" },
    },
  ];

  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
      ]}
      title="Human Resources"
      description="Manage employees, departments, payroll, and attendance"
      icon={<UserCog className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => navigate("/employees/create")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
          <Button onClick={() => navigate("/departments/create")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            New Department
          </Button>
          <Button onClick={() => navigate("/payroll/create")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Process Payroll
          </Button>
        </div>

        {/* HR Modules Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {hrModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.title}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(module.href)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{module.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">{module.description}</CardDescription>
                    </div>
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{module.stats.value}</span>
                    <span className="text-xs text-muted-foreground">{module.stats.label}</span>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(module.href);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    View
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* HR Summary */}
        <Card>
          <CardHeader>
            <CardTitle>HR Summary</CardTitle>
            <CardDescription>Key HR metrics and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Present Today</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Leave Requests</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

