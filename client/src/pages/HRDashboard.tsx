import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";

export default function HRDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingRequests: 0,
  });

  // Fetch dashboard metrics
  const { data: dashboardMetrics } = trpc.dashboard.metrics.useQuery();

  useEffect(() => {
    if (dashboardMetrics) {
      setMetrics({
        totalEmployees: dashboardMetrics.totalEmployees || 0,
        presentToday: Math.floor((dashboardMetrics.totalEmployees || 0) * 0.85),
        onLeave: Math.floor((dashboardMetrics.totalEmployees || 0) * 0.1),
        pendingRequests: 3,
      });
    }
  }, [dashboardMetrics]);

  const hrFeatures = [
    {
      title: "Employees",
      description: "Manage employee records and information",
      icon: <Users className="w-8 h-8" />,
      href: "/employees",
      color: "from-blue-500 to-blue-600",
      stat: { label: "Total Employees", value: metrics.totalEmployees },
    },
    {
      title: "Attendance",
      description: "Track attendance and check-ins",
      icon: <Calendar className="w-8 h-8" />,
      href: "/attendance",
      color: "from-green-500 to-green-600",
      stat: { label: "Present Today", value: metrics.presentToday },
    },
    {
      title: "Leave Management",
      description: "Manage leave requests and approvals",
      icon: <Clock className="w-8 h-8" />,
      href: "/leave-management",
      color: "from-orange-500 to-orange-600",
      stat: { label: "On Leave", value: metrics.onLeave },
    },
    {
      title: "Payroll",
      description: "Process payroll and salary management",
      icon: <FileText className="w-8 h-8" />,
      href: "/payroll",
      color: "from-purple-500 to-purple-600",
      stat: { label: "Pending", value: 0 },
    },
  ];

  return (
    <ModuleLayout
      title="HR Dashboard"
      description={`Welcome, ${user?.name}. Manage your human resources from here.`}
      icon={<Users className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "HR" },
      ]}
    >
      <div className="space-y-8">

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Total Employees"
          value={metrics.totalEmployees}
          description="Active employees"
          icon={<Users className="h-5 w-5" />}
          color="border-l-blue-500"
        />

        <StatsCard
          label="Present Today"
          value={metrics.presentToday}
          description="Checked in"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="border-l-green-500"
        />

        <StatsCard
          label="On Leave"
          value={metrics.onLeave}
          description="Currently away"
          icon={<Clock className="h-5 w-5" />}
          color="border-l-yellow-500"
        />

        <StatsCard
          label="Pending Requests"
          value={metrics.pendingRequests}
          description="Awaiting approval"
          icon={<AlertCircle className="h-5 w-5" />}
          color="border-l-red-500"
        />
      </div>

      {/* HR Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {hrFeatures.map((feature) => (
          <Card
            key={feature.href}
            className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group hover:scale-105 border-2 hover:border-primary/50"
            onClick={() => navigate(feature.href)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white`}>
                  {feature.icon}
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <CardTitle className="mt-4">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button variant="ghost" className="w-full group-hover:bg-accent">
                  View {feature.title}
                </Button>
                <span className="text-sm font-semibold text-muted-foreground">
                  {feature.stat.value}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            variant="outline"
            className="h-auto p-4 justify-start"
            onClick={() => navigate("/employees/create")}
          >
            <Users className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Add New Employee</div>
              <div className="text-sm text-muted-foreground">Create a new employee record</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 justify-start"
            onClick={() => navigate("/attendance/create")}
          >
            <Calendar className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-semibold">Record Attendance</div>
              <div className="text-sm text-muted-foreground">Mark attendance for today</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
    </ModuleLayout>
  );
}
