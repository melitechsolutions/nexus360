import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import OrgLayout from "@/components/OrgLayout";
import OrgBreadcrumb from "@/components/OrgBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, GripVertical, AlertCircle, CheckCircle2, Clock,
  Zap, Circle, Eye, Loader2, AlertTriangle,
} from "lucide-react";

const TASK_STATUSES = ["todo", "in_progress", "review", "completed", "blocked"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

const STATUS_META: Record<TaskStatus, { label: string; color: string; headerBg: string; icon: React.ElementType }> = {
  todo: { label: "To Do", color: "text-slate-400", headerBg: "bg-slate-500/10 border-slate-500/20", icon: Circle },
  in_progress: { label: "In Progress", color: "text-blue-400", headerBg: "bg-blue-500/10 border-blue-500/20", icon: Loader2 },
  review: { label: "Review", color: "text-purple-400", headerBg: "bg-purple-500/10 border-purple-500/20", icon: Eye },
  completed: { label: "Completed", color: "text-green-400", headerBg: "bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
  blocked: { label: "Blocked", color: "text-red-400", headerBg: "bg-red-500/10 border-red-500/20", icon: AlertTriangle },
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  medium: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  high: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  urgent: "bg-red-500/15 text-red-300 border-red-500/20",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  planning: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "on-hold": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  completed: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

function ProjectStatusBadge({ status }: { status?: string }) {
  const s = (status ?? "planning").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_STYLES[s] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {s}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  const p = (priority ?? "medium").toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border capitalize ${PRIORITY_STYLES[p] ?? "bg-white/10 text-white/60 border-white/20"}`}>
      {p}
    </span>
  );
}

export default function OrgProjectDetail() {
  const params = useParams();
  const slug = params.slug as string;
  const projectId = params.id as string;
  const [, setLocation] = useLocation();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<TaskStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", dueDate: "" });

  const projectQuery = trpc.projects.getById.useQuery(projectId, { staleTime: 60_000, enabled: !!projectId });
  const tasksQuery = trpc.projects.tasks.list.useQuery({ projectId }, { staleTime: 30_000, enabled: !!projectId });

  const createTask = trpc.projects.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created");
      tasksQuery.refetch();
      setCreateOpen(false);
      setForm({ title: "", description: "", priority: "medium", dueDate: "" });
    },
    onError: (e) => toast.error(e.message || "Failed to create task"),
  });

  const updateTask = trpc.projects.tasks.update.useMutation({
    onSuccess: () => { tasksQuery.refetch(); },
    onError: (e) => toast.error(e.message || "Failed to update task"),
  });

  const project = projectQuery.data as any;
  const tasks = (tasksQuery.data ?? []) as any[];

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string, status: TaskStatus) => {
    setDraggedId(taskId);
    setDragSource(status);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedId || dragSource === targetStatus) { setDraggedId(null); return; }
    updateTask.mutate({ id: draggedId, status: targetStatus });
    setDraggedId(null);
    setDragSource(null);
  };

  const openCreateFor = (status: TaskStatus) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!form.title) { toast.error("Task title is required"); return; }
    createTask.mutate({
      projectId,
      title: form.title,
      description: form.description || undefined,
      status: createStatus,
      priority: form.priority as any,
      dueDate: form.dueDate ? form.dueDate : undefined,
    });
  };

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (projectQuery.isLoading) {
    return (
      <OrgLayout title="Project">
        <div className="space-y-4">
          <Skeleton className="h-8 w-56 bg-white/5" />
          <Skeleton className="h-24 bg-white/5 rounded-xl" />
          <div className="flex gap-3 overflow-x-auto">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 w-52 shrink-0 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </OrgLayout>
    );
  }

  if (!project) {
    return (
      <OrgLayout title="Project Not Found">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white font-medium">Project not found</p>
            <Button className="mt-4" variant="ghost" onClick={() => setLocation(`/org/${slug}/projects`)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
            </Button>
          </CardContent>
        </Card>
      </OrgLayout>
    );
  }

  const pct = Math.min(100, Math.max(0, Number(project.progress || overallProgress)));

  return (
    <OrgLayout title={project.name || "Project"}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <OrgBreadcrumb slug={slug} items={[
            { label: "Projects", href: `/org/${slug}/projects` },
            { label: project.name },
          ]} />
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white"
            onClick={() => setLocation(`/org/${slug}/projects`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        {/* Project hero */}
        <div className="p-5 rounded-xl bg-gradient-to-r from-blue-600/10 to-teal-600/10 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-bold text-white">{project.name}</h1>
                <ProjectStatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
              </div>
              {project.description && (
                <p className="text-sm text-white/50 mt-2 max-w-xl">{project.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                {project.startDate && (
                  <span>Start: {new Date(project.startDate).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
                )}
                {project.endDate && (
                  <span>Due: {new Date(project.endDate).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
                )}
                {project.budget && (
                  <span>Budget: KES {Number(project.budget).toLocaleString()}</span>
                )}
              </div>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 shrink-0" onClick={() => openCreateFor("todo")}>
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
              <span>{completedTasks}/{totalTasks} tasks completed</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-white/30"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task Kanban */}
        {tasksQuery.isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-56 w-52 shrink-0 bg-white/5 rounded-xl" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 350 }}>
            {TASK_STATUSES.map((statusId) => {
              const meta = STATUS_META[statusId];
              const StatusIcon = meta.icon;
              const colTasks = tasksByStatus(statusId);

              return (
                <div
                  key={statusId}
                  className="shrink-0 w-52 sm:w-60 flex flex-col rounded-xl border bg-white/3 border-white/10"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, statusId)}
                >
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b ${meta.headerBg}`}>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-3.5 w-3.5 ${meta.color}`} />
                      <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="border-white/10 text-white/40 text-[10px] h-5">
                        {colTasks.length}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-white/30 hover:text-white hover:bg-white/10"
                        onClick={() => openCreateFor(statusId)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Task cards */}
                  <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto" style={{ maxHeight: 500 }}>
                    {colTasks.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-6 text-white/15 text-xs text-center gap-1">
                        <Circle className="h-5 w-5 opacity-30" />
                        <span>No tasks</span>
                      </div>
                    ) : (
                      colTasks.map((task: any) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id, task.status)}
                          className={`group rounded-lg bg-white/5 border border-white/10 p-3 cursor-grab active:cursor-grabbing hover:bg-white/8 hover:border-white/20 transition-all ${draggedId === task.id ? "opacity-40 scale-95" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <p className="text-xs font-medium text-white leading-snug line-clamp-3">{task.title}</p>
                            <GripVertical className="h-3.5 w-3.5 text-white/20 shrink-0 mt-0.5 group-hover:text-white/40" />
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-white/40 mt-1.5 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <PriorityBadge priority={task.priority} />
                            {task.dueDate && (
                              <span className={`text-[10px] ${new Date(task.dueDate) < new Date() && task.status !== "completed" ? "text-red-400" : "text-white/40"}`}>
                                {new Date(task.dueDate).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                          {task.estimatedHours && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/30">
                              <Clock className="h-3 w-3" />
                              <span>{task.estimatedHours}h</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-[#1a1f2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-white/70 text-xs">Status</Label>
              <Select value={createStatus} onValueChange={(v) => setCreateStatus(v as TaskStatus)}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Title *</Label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Description</Label>
              <RichTextEditor
                value={form.description}
                onChange={(html) => setForm({ ...form, description: html })}
                placeholder="Optional notes..."
                minHeight="80px"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70 text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "urgent"].map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70 text-xs">Due Date</Label>
                <Input type="date" className="mt-1 bg-white/5 border-white/10 text-white"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" className="text-white/50" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreate} disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OrgLayout>
  );
}
