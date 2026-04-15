import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckSquare,
  Plus,
  Search,
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  LayoutGrid,
  User,
  Calendar,
  Flag,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TaskStatus = "todo" | "in_progress" | "review" | "completed" | "blocked";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface Task {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
}

const COLUMNS: { id: TaskStatus; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: "todo", label: "New", icon: <Circle className="h-4 w-4" />, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/60" },
  { id: "in_progress", label: "In Progress", icon: <Clock className="h-4 w-4 text-blue-500" />, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
  { id: "review", label: "Awaiting Feedback", icon: <AlertCircle className="h-4 w-4 text-amber-500" />, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
  { id: "completed", label: "Completed", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

function TaskCard({ task, onMove, onUpdate }: { task: Task; onMove: (id: string, status: TaskStatus) => void; onUpdate: () => void }) {
  const nextStatuses: Partial<Record<TaskStatus, TaskStatus>> = {
    todo: "in_progress",
    in_progress: "review",
    review: "completed",
  };
  const next = nextStatuses[task.status];

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow space-y-2 cursor-default">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 whitespace-nowrap font-medium border-0", PRIORITY_COLORS[task.priority])}>
          <Flag className="h-2.5 w-2.5 mr-0.5" />{task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {task.projectName && (
          <span className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">{task.projectName}</span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        )}
        {task.assignedTo && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="h-3 w-3" />
          </span>
        )}
      </div>

      {next && (
        <button
          onClick={() => onMove(task.id, next)}
          className="w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 rounded py-1 transition-colors border border-dashed border-transparent hover:border-primary/30"
        >
          Move to {COLUMNS.find(c => c.id === next)?.label} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setCreateOpen(true); }, []);
  const [newTask, setNewTask] = useState({
    projectId: "",
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    dueDate: "",
    assignedTo: "",
    tags: "",
    targetDate: "",
    billable: true,
    visibleToClient: true,
  });
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [showDescription, setShowDescription] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Fetch all tasks
  const { data: rawTasks = [], isLoading, refetch } = trpc.projects.tasks.listAll.useQuery();
  const { data: projectsList = [] } = trpc.projects.list.useQuery();
  const { data: employeesList = [] } = trpc.employees.list.useQuery();
  const { data: clientsList = [] } = trpc.clients.list.useQuery();
  const updateTask = trpc.projects.tasks.update.useMutation({
    onSuccess: () => { toast.success("Task updated"); refetch(); },
    onError: (e) => toast.error(e.message || "Failed to update task"),
  });
  const createTask = trpc.projects.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created");
      refetch();
      setCreateOpen(false);
      setNewTask({ projectId: "", title: "", description: "", priority: "medium", dueDate: "", assignedTo: "", tags: "", targetDate: "", billable: true, visibleToClient: true });
      setShowDescription(false);
      setShowMoreInfo(false);
      setShowOptions(false);
    },
    onError: (e) => toast.error(e.message || "Failed to create task"),
  });

  const tasks: Task[] = rawTasks as Task[];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, priorityFilter]);

  const columns = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      tasks: filteredTasks.filter(t => t.status === col.id),
    }));
  }, [filteredTasks]);

  const handleMove = (id: string, status: TaskStatus) => {
    updateTask.mutate({ id, status });
  };

  const handleCreate = () => {
    if (!newTask.title.trim()) return toast.error("Task title is required");
    if (!newTask.projectId) return toast.error("Please select a project");
    createTask.mutate({
      projectId: newTask.projectId,
      title: newTask.title,
      description: newTask.description || undefined,
      priority: newTask.priority,
      status: defaultStatus,
      dueDate: newTask.dueDate || undefined,
      assignedTo: newTask.assignedTo && newTask.assignedTo !== "__none__" ? newTask.assignedTo : undefined,
      tags: newTask.tags || undefined,
      targetDate: newTask.targetDate || undefined,
      billable: newTask.billable ? 1 : 0,
      visibleToClient: newTask.visibleToClient ? 1 : 0,
    });
  };

  const totalByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    COLUMNS.forEach(c => { counts[c.id] = tasks.filter(t => t.status === c.id).length; });
    return counts;
  }, [tasks]);

  return (
    <ModuleLayout
      title="Tasks"
      description="Manage and track all tasks across your projects"
      icon={<CheckSquare className="h-5 w-5" />}
    >
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {COLUMNS.map(col => (
          <div key={col.id} className={cn("rounded-xl p-3 border", col.bg)}>
            <div className={cn("flex items-center gap-2 mb-1 text-sm font-medium", col.color)}>
              {col.icon} {col.label}
            </div>
            <p className="text-2xl font-bold">{totalByStatus[col.id] || 0}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setDefaultStatus("todo"); setCreateOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
          {columns.map(col => (
            <div key={col.id} className="flex flex-col gap-2 min-w-[220px]">
              {/* Column Header */}
              <div className={cn("flex items-center justify-between px-3 py-2 rounded-lg", col.bg)}>
                <div className={cn("flex items-center gap-2 font-medium text-sm", col.color)}>
                  {col.icon}
                  <span>{col.label}</span>
                  <span className="ml-1 rounded-full bg-background/70 text-foreground px-2 text-xs font-semibold">
                    {col.tasks.length}
                  </span>
                </div>
                <button
                  onClick={() => { setDefaultStatus(col.id); setCreateOpen(true); }}
                  className="rounded p-0.5 hover:bg-background/50 transition-colors"
                  title={`Add task to ${col.label}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Task Cards */}
              <div className="flex flex-col gap-2 min-h-[100px]">
                {col.tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 border-2 border-dashed rounded-lg">
                    <LayoutGrid className="h-6 w-6 mb-2" />
                    <span className="text-xs">No tasks</span>
                  </div>
                )}
                {col.tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onMove={handleMove}
                    onUpdate={refetch}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Dialog - matching crm.africa */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add A New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Project * */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm text-muted-foreground">Project*</Label>
              <Select value={newTask.projectId} onValueChange={v => setNewTask(p => ({ ...p, projectId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projectsList.map((proj: any) => (
                    <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title * */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm text-muted-foreground">Title*</Label>
              <Input
                placeholder=""
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
              />
            </div>

            {/* Status * */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm text-muted-foreground">Status*</Label>
              <Select value={defaultStatus} onValueChange={v => setDefaultStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority * */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm text-muted-foreground">Priority*</Label>
              <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v as TaskPriority }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assign Users */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm text-muted-foreground">Assign Users</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-rose-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select a team member to assign this task to</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={newTask.assignedTo} onValueChange={v => setNewTask(p => ({ ...p, assignedTo: v }))}>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {employeesList.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assign Client */}
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm text-muted-foreground">Assign Client</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-rose-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select a client associated with this task</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select disabled>
                <SelectTrigger className="bg-muted/30">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName || client.name || client.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <hr className="border-border" />

            {/* Description (collapsible) */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Description</Label>
              <Switch checked={showDescription} onCheckedChange={setShowDescription} />
            </div>
            {showDescription && (
              <Textarea
                placeholder="Enter task description..."
                value={newTask.description}
                onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                rows={5}
                className="min-h-[120px]"
              />
            )}

            {/* More Information (collapsible) */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">More Information</Label>
              <Switch checked={showMoreInfo} onCheckedChange={setShowMoreInfo} />
            </div>
            {showMoreInfo && (
              <div className="space-y-3 pl-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Options (collapsible) */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Options</Label>
              <Switch checked={showOptions} onCheckedChange={setShowOptions} />
            </div>
            {showOptions && (
              <div className="space-y-3 pl-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Target Date</Label>
                  <Input
                    type="date"
                    value={newTask.targetDate}
                    onChange={e => setNewTask(p => ({ ...p, targetDate: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Tags</Label>
                  <Input
                    placeholder="Enter tags separated by commas..."
                    value={newTask.tags}
                    onChange={e => setNewTask(p => ({ ...p, tags: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newTask.visibleToClient}
                      onCheckedChange={v => setNewTask(p => ({ ...p, visibleToClient: !!v }))}
                    />
                    <Label className="text-sm text-muted-foreground">Visible To Client</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newTask.billable}
                      onCheckedChange={v => setNewTask(p => ({ ...p, billable: !!v }))}
                    />
                    <Label className="text-sm text-muted-foreground">Billable</Label>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground font-semibold">* Required</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Close</Button>
            <Button onClick={handleCreate} disabled={createTask.isPending} className="bg-red-500 hover:bg-red-600 text-white">
              {createTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
