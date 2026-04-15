import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  FolderKanban,
  Users,
  FileText,
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
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

export default function ProjectManagerDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuthWithPersistence({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== "project_manager" && user?.role !== "super_admin") {
      // Redirect handled elsewhere; silently return
      return;
    }
  }, [loading, isAuthenticated, user]);

  const { data: projects = [], isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: pendingExpenses = [] } = trpc.expenses.list.useQuery({ status: 'pending' });
  const { data: allEstimates = [] } = trpc.estimates.list.useQuery();

  // Convert frozen objects to plain objects
  const projectsPlain = projects ? JSON.parse(JSON.stringify(projects)) : [];
  const pendingExpensesPlain = pendingExpenses ? JSON.parse(JSON.stringify(pendingExpenses)) : [];
  const allEstimatesPlain = allEstimates ? JSON.parse(JSON.stringify(allEstimates)) : [];

  // Filter projects assigned to or managed by current user
  const myProjects = Array.isArray(projectsPlain)
    ? projectsPlain.filter((p: any) => p.projectManager === user?.id || p.assignedTo === user?.id)
    : [];

  // Derive team member IDs from projects (best-effort)
  const teamMemberIds = new Set<string>();
  myProjects.forEach((p: any) => {
    if (p.assignedTo) teamMemberIds.add(p.assignedTo);
    if (p.projectManager) teamMemberIds.add(p.projectManager);
  });

  // Pending estimates for PM (estimates.status === 'draft')
  const pendingEstimates = Array.isArray(allEstimatesPlain) ? allEstimatesPlain.filter((e: any) => e.status === 'draft') : [];

  const approveExpense = trpc.expenses.approve.useMutation({
    onSuccess: () => {
      toast.success("Expense approved");
      utils.expenses.list.invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to approve expense"),
  });

  const approveEstimate = trpc.approvals.approveEstimate.useMutation({
    onSuccess: () => {
      toast.success("Estimate approved");
      utils.estimates.list.invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to approve estimate"),
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return null;

  // Feature cards for quick access
  const features = [
    {
      title: "Communications",
      description: "Email, SMS, and messaging",
      icon: Mail,
      href: "/communications",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
    },
    {
      title: "Projects",
      description: "Manage and track all your projects",
      icon: FolderKanban,
      href: "/projects",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Approvals",
      description: "Approve pending items",
      icon: FileText,
      href: "/approvals",
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  return (
    <ModuleLayout
      title="Project Manager"
      description="Oversee your projects, team assignments, and project approvals"
      icon={<FolderKanban className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Project Management" }]}
      actions={
        <div className="flex gap-2">
          <Button onClick={() => setLocation("/projects/management")} variant="secondary" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Project Management
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLocation("/crm-home")}>
            Go to Main Dashboard
          </Button>
        </div>
      }
    >
      <div className="space-y-8">

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard label="My Projects" value={myProjects.length} color="border-l-purple-500" />

          <StatsCard label="Team Members" value={teamMemberIds.size} color="border-l-green-500" />

          <StatsCard
            label="Pending Approvals"
            value={(pendingExpensesPlain?.length || 0) + (pendingEstimates?.length || 0)}
            color="border-l-blue-500"
          />
        </div>

        {/* Feature Cards */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>My Projects</CardTitle>
              <CardDescription>Recent projects assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div>Loading projects...</div>
              ) : myProjects.length === 0 ? (
                <div className="text-sm text-slate-600">No projects assigned to you yet.</div>
              ) : (
                <ul className="space-y-3">
                  {myProjects.slice(0, 10).map((p: any) => (
                    <li key={p.id} className="border p-3 rounded">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-sm text-slate-500">Status: {p.status} • Progress: {p.progress}%</div>
                        </div>
                        <div className="text-sm text-slate-500">{p.projectNumber || p.id}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approvals</CardTitle>
              <CardDescription>Approve pending items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Pending Expenses</div>
                  {pendingExpensesPlain.length === 0 ? (
                    <div className="text-sm text-slate-600">No pending expenses</div>
                  ) : (
                    <ul className="space-y-2 mt-2">
                      {pendingExpensesPlain.slice(0, 6).map((exp: any) => (
                        <li key={exp.id} className="flex items-center justify-between border p-2 rounded">
                          <div className="text-sm">
                            <div className="font-medium">{exp.category || exp.description || exp.id}</div>
                            <div className="text-slate-500 text-xs">Amount: KES {(exp.amount || 0) / 100}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => approveExpense.mutate({ id: exp.id })}>
                              Approve
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium">Pending Estimates</div>
                  {pendingEstimates.length === 0 ? (
                    <div className="text-sm text-slate-600">No pending estimates</div>
                  ) : (
                    <ul className="space-y-2 mt-2">
                      {pendingEstimates.slice(0, 6).map((est: any) => (
                        <li key={est.id} className="flex items-center justify-between border p-2 rounded">
                          <div className="text-sm">
                            <div className="font-medium">{est.title || est.estimateNumber || est.id}</div>
                            <div className="text-slate-500 text-xs">Total: KES {(est.total || 0) / 100}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => approveEstimate.mutate({ id: est.id })}>
                              Approve
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
