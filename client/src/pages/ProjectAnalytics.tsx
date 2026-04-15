import { useMemo } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";
import { trpc } from "@/lib/trpc";

function getStatusLabel(status: string) {
  switch (status) {
    case "active": return "On Track";
    case "completed": return "Completed";
    case "on_hold": return "On Hold";
    case "planning": return "Planning";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "on_hold":
    case "planning":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

export default function ProjectAnalytics() {
  const { data: projectsList = [], isLoading } = trpc.projects.list.useQuery({});

  const stats = useMemo(() => {
    const total = projectsList.length;
    const active = projectsList.filter((p: any) => p.status === "active" || p.status === "completed").length;
    const delayed = projectsList.filter((p: any) => p.status === "on_hold" || p.status === "cancelled").length;
    const avgProgress = total > 0
      ? Math.round(projectsList.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / total)
      : 0;

    return [
      { label: "Total Projects", value: total, icon: BarChart3, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
      { label: "On Schedule", value: active, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
      { label: "Delayed / On Hold", value: delayed, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
      { label: "Avg Progress (%)", value: avgProgress, icon: Clock, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950" },
    ];
  }, [projectsList]);

  return (
    <ModuleLayout
      title="Project Analytics"
      description="Track project performance, budgets, and timelines"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Reports" },
        { label: "Project Analytics" },
      ]}
    >
      <div className="space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatsCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={<stat.icon className="h-5 w-5" />}
              iconBg={stat.bg}
            />
          ))}
        </div>

        {/* Project Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Project Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : projectsList.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                No projects found
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="text-left py-3 px-4 font-medium">Project</TableHead>
                    <TableHead className="text-left py-3 px-4 font-medium">Budget (KSh)</TableHead>
                    <TableHead className="text-left py-3 px-4 font-medium">Progress</TableHead>
                    <TableHead className="text-left py-3 px-4 font-medium">Priority</TableHead>
                    <TableHead className="text-left py-3 px-4 font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectsList.map((project: any) => (
                    <TableRow key={project.id} className="border-b hover:bg-muted/50">
                      <TableCell className="py-3 px-4 font-medium">{project.name}</TableCell>
                      <TableCell className="py-3 px-4">{(project.budget || 0).toLocaleString()}</TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${project.progress || 0}%` }}
                            />
                          </div>
                          <span>{project.progress || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className="capitalize">{project.priority || "medium"}</span>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusLabel(project.status)}
                        </span>
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
