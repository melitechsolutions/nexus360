import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CalendarDays, User, Clock, Tag, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  review: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: tasks = [], isLoading } = trpc.projects.tasks.listAll.useQuery();
  const { data: projectsList = [] } = trpc.projects.list.useQuery();
  const { data: employeesList = [] } = trpc.employees.list.useQuery();

  const task = (tasks as any[]).find((t: any) => t.id === id);
  const project = task ? (projectsList as any[]).find((p: any) => p.id === task.projectId) : null;
  const assignee = task ? (employeesList as any[]).find((e: any) => e.id === task.assignedTo || e.userId === task.assignedTo) : null;

  if (isLoading) {
    return (
      <ModuleLayout title="Task Details">
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!task) {
    return (
      <ModuleLayout title="Task Not Found">
        <div className="flex flex-col items-center gap-4 py-20">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Task not found.</p>
          <Button variant="outline" onClick={() => navigate("/tasks")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title={task.title}
      description={project ? `Project: ${project.name}` : "Task Details"}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate("/tasks")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={statusColors[task.status] || ""} variant="outline">
            {task.status?.replace(/_/g, " ")}
          </Badge>
          <Badge className={priorityColors[task.priority] || ""} variant="outline">
            {task.priority} priority
          </Badge>
          {task.approvalStatus && (
            <Badge variant="outline">{task.approvalStatus?.replace(/_/g, " ")}</Badge>
          )}
          {task.billable ? (
            <Badge className="bg-green-50 text-green-700" variant="outline">Billable</Badge>
          ) : (
            <Badge className="bg-gray-50 text-gray-600" variant="outline">Non-billable</Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {task.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
              {project && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-medium">{project.name}</span>
                </div>
              )}
              {assignee && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Assignee:</span>
                  <span className="font-medium">
                    {assignee.firstName && assignee.lastName
                      ? `${assignee.firstName} ${assignee.lastName}`
                      : assignee.name || assignee.email || "—"}
                  </span>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{format(new Date(task.dueDate), "dd MMM yyyy")}</span>
                </div>
              )}
              {task.targetDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Target Date:</span>
                  <span className="font-medium">{format(new Date(task.targetDate), "dd MMM yyyy")}</span>
                </div>
              )}
              {task.completedDate && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium">{format(new Date(task.completedDate), "dd MMM yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time & Effort */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time & Effort</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Estimated Hours:</span>
                <span className="font-medium">{task.estimatedHours ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Actual Hours:</span>
                <span className="font-medium">{task.actualHours ?? "—"}</span>
              </div>
              {task.tags && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.split(",").filter(Boolean).map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Remarks */}
        {task.adminRemarks && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{task.adminRemarks}</p>
            </CardContent>
          </Card>
        )}

        {/* Rejection Reason */}
        {task.rejectionReason && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base text-red-700">Rejection Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{task.rejectionReason}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
