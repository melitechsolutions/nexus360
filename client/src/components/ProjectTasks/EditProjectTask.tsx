import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useUserLookup } from "@/hooks/useUserLookup";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";

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
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface EditProjectTaskProps {
  task: ProjectTask;
  teamMembers: Array<{ id: string; name: string }>;
  isAdmin?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditProjectTask({
  task,
  teamMembers,
  isAdmin = false,
  onSuccess,
  onCancel,
}: EditProjectTaskProps) {
  const { getUserName } = useUserLookup();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showApprovalActions, setShowApprovalActions] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");

  const [formData, setFormData] = useState({
    id: task.id,
    title: task.title,
    description: task.description || "",
    priority: task.priority,
    status: task.status,
    assignedTo: task.assignedTo || "",
    dueDate: task.dueDate ? task.dueDate.split(" ")[0] : "",
    estimatedHours: task.estimatedHours ? String(task.estimatedHours) : "",
    actualHours: task.actualHours ? String(task.actualHours) : "",
  });

  const updateTaskMutation = trpc.projects.tasks.update.useMutation();
  const approveMutation = trpc.projects.tasks.approve.useMutation();
  const rejectMutation = trpc.projects.tasks.reject.useMutation();
  const requestRevisionMutation = trpc.projects.tasks.requestRevision.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const submitData: any = {
        id: formData.id,
      };
      
      if (formData.title !== task.title) submitData.title = formData.title;
      if (formData.description !== (task.description || "")) submitData.description = formData.description;
      if (formData.priority !== task.priority) submitData.priority = formData.priority;
      if (formData.status !== task.status) submitData.status = formData.status;
      if (formData.assignedTo !== (task.assignedTo || "")) submitData.assignedTo = (formData.assignedTo && formData.assignedTo !== "__unassigned__") ? formData.assignedTo : undefined;
      if (formData.dueDate !== (task.dueDate ? task.dueDate.split(" ")[0] : "")) {
        submitData.dueDate = formData.dueDate ? new Date(formData.dueDate) : undefined;
      }
      if (formData.estimatedHours !== (task.estimatedHours ? String(task.estimatedHours) : "")) {
        submitData.estimatedHours = formData.estimatedHours ? Number(formData.estimatedHours) : undefined;
      }
      if (formData.actualHours !== (task.actualHours ? String(task.actualHours) : "")) {
        submitData.actualHours = formData.actualHours ? Number(formData.actualHours) : undefined;
      }

      await updateTaskMutation.mutateAsync(submitData);
      
      setSubmitStatus("success");
      
      if (onSuccess) {
        setTimeout(onSuccess, 1000);
      }
    } catch (error: any) {
      setSubmitStatus("error");
      setErrorMessage(error?.message || "Failed to update task");
      console.error("Update task error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await approveMutation.mutateAsync({
        id: task.id,
        adminRemarks: approvalReason || undefined,
      });
      setSubmitStatus("success");
      setApprovalReason("");
      if (onSuccess) setTimeout(onSuccess, 1000);
    } catch (error: any) {
      setSubmitStatus("error");
      setErrorMessage(error?.message || "Failed to approve task");
    } finally {
      setIsSubmitting(false);
      setShowApprovalActions(false);
    }
  };

  const handleReject = async () => {
    if (!approvalReason.trim()) {
      setErrorMessage("Please provide a rejection reason");
      return;
    }

    setIsSubmitting(true);
    try {
      await rejectMutation.mutateAsync({
        id: task.id,
        rejectionReason: approvalReason,
        adminRemarks: approvalReason,
      });
      setSubmitStatus("success");
      setApprovalReason("");
      if (onSuccess) setTimeout(onSuccess, 1000);
    } catch (error: any) {
      setSubmitStatus("error");
      setErrorMessage(error?.message || "Failed to reject task");
    } finally {
      setIsSubmitting(false);
      setShowApprovalActions(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!approvalReason.trim()) {
      setErrorMessage("Please provide revision remarks");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestRevisionMutation.mutateAsync({
        id: task.id,
        revisionRemarks: approvalReason,
      });
      setSubmitStatus("success");
      setApprovalReason("");
      if (onSuccess) setTimeout(onSuccess, 1000);
    } catch (error: any) {
      setSubmitStatus("error");
      setErrorMessage(error?.message || "Failed to request revision");
    } finally {
      setIsSubmitting(false);
      setShowApprovalActions(false);
    }
  };

  const getApprovalStatusColor = (status?: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "revision_requested":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold">Edit Task</h2>
        {task.approvalStatus && (
          <Badge className={getApprovalStatusColor(task.approvalStatus)}>
            {task.approvalStatus === "revision_requested" ? "Revision Requested" : task.approvalStatus}
          </Badge>
        )}
      </div>

      {submitStatus === "success" && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Task updated successfully!</p>
          </div>
        </div>
      )}

      {submitStatus === "error" && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Update failed</p>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Approval Information */}
      {isAdmin && task.approvalStatus && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Approval Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium">Status:</p>
              <p>{task.approvalStatus}</p>
            </div>
            {task.approvedBy && (
              <div>
                <p className="font-medium">Approved By:</p>
                <p>{getUserName(task.approvedBy) || task.approvedBy}</p>
              </div>
            )}
            {task.adminRemarks && (
              <div className="col-span-2">
                <p className="font-medium">Remarks:</p>
                <p className="mt-1 p-2 bg-white rounded border border-blue-200">{task.adminRemarks}</p>
              </div>
            )}
            {task.rejectionReason && (
              <div className="col-span-2">
                <p className="font-medium">Rejection Reason:</p>
                <p className="mt-1 p-2 bg-white rounded border border-red-200">{task.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Title *
          </label>
          <Input
            name="title"
            placeholder="Enter task title"
            value={formData.title}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <Textarea
            name="description"
            placeholder="Add task description..."
            value={formData.description}
            onChange={handleChange}
            disabled={isSubmitting}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <Select
              value={formData.priority || task.priority}
              onValueChange={(v) => handleSelectChange("priority", v)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              value={formData.status || task.status}
              onValueChange={(v) => handleSelectChange("status", v)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign To
            </label>
            <Select
              value={formData.assignedTo || task.assignedTo || ""}
              onValueChange={(v) => handleSelectChange("assignedTo", v)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <Input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Hours
            </label>
            <Input
              type="number"
              name="estimatedHours"
              placeholder="0"
              value={formData.estimatedHours}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Hours
            </label>
            <Input
              type="number"
              name="actualHours"
              placeholder="0"
              value={formData.actualHours}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Admin Approval Actions */}
      {isAdmin && task.approvalStatus === "pending" && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-4">Admin Approval Actions</h3>
          
          {!showApprovalActions ? (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowApprovalActions(true)}
                variant="outline"
              >
                Review & Approve/Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                placeholder="Add approval remarks or rejection reason..."
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Processing..." : "Approve"}
                </Button>
                <Button
                  onClick={handleRequestRevision}
                  disabled={isSubmitting || !approvalReason.trim()}
                  variant="outline"
                >
                  {isSubmitting ? "Processing..." : "Request Revision"}
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isSubmitting || !approvalReason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? "Processing..." : "Reject"}
                </Button>
                <Button
                  onClick={() => {
                    setShowApprovalActions(false);
                    setApprovalReason("");
                  }}
                  variant="ghost"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
