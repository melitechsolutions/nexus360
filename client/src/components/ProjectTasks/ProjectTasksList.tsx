import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Edit2, Trash2, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "review" | "completed" | "blocked";
  assignedTo?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  approvalStatus?: "pending" | "approved" | "rejected" | "revision_requested";
  adminRemarks?: string | null;
  approvedBy?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectTasksListProps {
  projectId: string;
  tasks: ProjectTask[];
  teamMembers: Array<{ id: string; name: string }>;
  isAdmin?: boolean;
  onEdit?: (task: ProjectTask) => void;
  onDelete?: (taskId: string) => void;
  onRefresh?: () => void;
}

export function ProjectTasksList({
  projectId,
  tasks,
  teamMembers,
  isAdmin = false,
  onEdit,
  onDelete,
  onRefresh,
}: ProjectTasksListProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterApproval, setFilterApproval] = useState<string>("all");

  const deleteTaskMutation = trpc.projects.tasks.delete.useMutation();

  // Filter tasks based on active filters
  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (filterAssignee === "__unassigned__" && task.assignedTo) return false;
    if (filterAssignee !== "all" && filterAssignee !== "__unassigned__" && task.assignedTo !== filterAssignee) return false;
    if (filterApproval !== "all" && task.approvalStatus !== filterApproval) return false;
    return true;
  });

  const handleDelete = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
        onDelete?.(taskId);
        onRefresh?.();
      } catch (error) {
        console.error("Failed to delete task:", error);
        toast.error("Failed to delete task");
      }
    }
  };

  const getTeamMemberName = (memberId?: string | null) => {
    if (!memberId) return "Unassigned";
    const member = teamMembers.find((m) => m.id === memberId);
    return member?.name || "Unknown";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "blocked":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getApprovalStatusColor = (status?: string) => {
    switch (status) {
      case "approved":
        return "bg-green-50 text-green-700";
      case "rejected":
        return "bg-red-50 text-red-700";
      case "revision_requested":
        return "bg-yellow-50 text-yellow-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filter by assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <Select value={filterApproval} onValueChange={setFilterApproval}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filter by approval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Approvals</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="revision_requested">Revision Requested</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Showing {filteredTasks.length} of {tasks.length} tasks
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-8"
        >
          Refresh
        </Button>
      </div>

      {/* Tasks Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-1/4">Task</TableHead>
              <TableHead className="w-16">Status</TableHead>
              <TableHead className="w-16">Priority</TableHead>
              <TableHead className="w-32">Assigned To</TableHead>
              <TableHead className="w-24">Due Date</TableHead>
              {isAdmin && <TableHead className="w-20">Approval</TableHead>}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 7 : 6}
                  className="text-center py-8 text-gray-500"
                >
                  No tasks found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={`hover:bg-gray-50 ${task.approvalStatus && getApprovalStatusColor(task.approvalStatus)}`}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{task.title}</span>
                      {task.description && (
                        <span className="text-xs text-gray-500 truncate">
                          {task.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <Badge variant="outline" className={getStatusColor(task.status)}>
                        {task.status === "in_progress"
                          ? "In Progress"
                          : task.status === "review"
                          ? "Review"
                          : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">
                      {getTeamMemberName(task.assignedTo)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {task.approvalStatus && task.approvalStatus !== "pending" && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            task.approvalStatus === "approved"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : task.approvalStatus === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}
                        >
                          {task.approvalStatus === "revision_requested"
                            ? "Revision"
                            : task.approvalStatus}
                        </Badge>
                      )}
                      {(!task.approvalStatus || task.approvalStatus === "pending") && (
                        <span className="text-xs text-orange-600 font-medium">Pending</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onEdit?.(task)}
                        title="Edit task"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(task.id)}
                        title="Delete task"
                        disabled={deleteTaskMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info text */}
      <div className="text-xs text-gray-500">
        Tip: Click on a task row or use the Edit button to modify task details,
        {isAdmin && " approve/reject tasks, or add remarks."}
      </div>
    </div>
  );
}
