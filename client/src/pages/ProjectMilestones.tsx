import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, Edit2, CheckCircle2, Flag } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

type Milestone = {
  id: string;
  projectId: string;
  phaseName: string;
  description: string | null;
  deliverables: string | null;
  status: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";
  startDate: string | null;
  dueDate: string;
  completionDate: string | null;
  completionPercentage: number;
  assignedTo: string | null;
  budget: number | null;
  actualCost: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export default function ProjectMilestones() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    projectId: "",
    phaseName: "",
    description: "",
    deliverables: "",
    dueDate: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
    budget: "",
    notes: "",
  });

  // Fetch data
  const { data: milestones, refetch: refetchMilestones } = trpc.projectMilestones.list.useQuery({});
  const { data: projects } = trpc.projects.list.useQuery(undefined);

  // Mutations
  const createMutation = trpc.projectMilestones.create.useMutation({
    onSuccess: async () => {
      toast.success("Milestone created successfully");
      setIsOpen(false);
      resetForm();
      await refetchMilestones();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create milestone");
    },
  });

  const updateMutation = trpc.projectMilestones.update.useMutation({
    onSuccess: async () => {
      toast.success("Milestone updated");
      setIsOpen(false);
      setEditingId(null);
      resetForm();
      await refetchMilestones();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update milestone");
    },
  });

  const updateProgressMutation = trpc.projectMilestones.updateProgress.useMutation({
    onSuccess: async () => {
      toast.success("Progress updated");
      await refetchMilestones();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update progress");
    },
  });

  const deleteMutation = trpc.projectMilestones.delete.useMutation({
    onSuccess: async () => {
      toast.success("Milestone deleted");
      setDeleteId(null);
      await refetchMilestones();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete milestone");
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      projectId: "",
      phaseName: "",
      description: "",
      deliverables: "",
      dueDate: new Date().toISOString().split("T")[0],
      startDate: new Date().toISOString().split("T")[0],
      budget: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phaseName || !formData.dueDate || !formData.projectId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        phaseName: formData.phaseName,
        description: formData.description || undefined,
        deliverables: formData.deliverables || undefined,
        dueDate: formData.dueDate + "T00:00:00Z",
        startDate: formData.startDate ? formData.startDate + "T00:00:00Z" : undefined,
        budget: formData.budget ? parseInt(formData.budget) * 100 : undefined,
        notes: formData.notes || undefined,
      });
    } else {
      createMutation.mutate({
        projectId: formData.projectId,
        phaseName: formData.phaseName,
        description: formData.description || undefined,
        deliverables: formData.deliverables || undefined,
        dueDate: formData.dueDate + "T00:00:00Z",
        startDate: formData.startDate ? formData.startDate + "T00:00:00Z" : undefined,
        budget: formData.budget ? parseInt(formData.budget) * 100 : undefined,
        notes: formData.notes || undefined,
      });
    }
  };

  const handleEdit = (milestone: Milestone) => {
    setFormData({
      projectId: milestone.projectId,
      phaseName: milestone.phaseName,
      description: milestone.description || "",
      deliverables: milestone.deliverables || "",
      dueDate: milestone.dueDate.split("T")[0],
      startDate: milestone.startDate ? milestone.startDate.split("T")[0] : "",
      budget: milestone.budget ? (milestone.budget / 100).toString() : "",
      notes: milestone.notes || "",
    });
    setEditingId(milestone.id);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getProjectName = (projectId: string) => {
    return projects?.find((p) => p.id === projectId)?.projectNumber || projectId;
  };

  const stats = useMemo(() => {
    if (!milestones) return { total: 0, completed: 0, inProgress: 0, avgCompletion: 0 };
    const completed = milestones.filter((m: any) => m.status === "completed").length;
    const inProgress = milestones.filter((m: any) => m.status === "in_progress").length;
    const avgCompletion = Math.round(
      milestones.reduce((sum: any, m: any) => sum + m.completionPercentage, 0) /
        (milestones.length || 1)
    );
    return { total: milestones.length, completed, inProgress, avgCompletion };
  }, [milestones]);

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "planning":
        return "bg-gray-100 text-gray-800";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ModuleLayout
      title="Project Milestones"
      icon={<Flag className="h-5 w-5" />}
      description="Manage project phases and deliverables"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Projects", href: "/projects" },
        { label: "Milestones" },
      ]}
    >
      <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard label="Total Milestones" value={stats.total} color="border-l-orange-500" />
        <StatsCard label="Completed" value={stats.completed} color="border-l-purple-500" />
        <StatsCard label="In Progress" value={stats.inProgress} color="border-l-green-500" />
        <StatsCard label="Avg Completion" value={<>{stats.avgCompletion}%</>} color="border-l-blue-500" />
      </div>

      {/* Create Button */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingId(null);
            resetForm();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Milestone
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Create"} Milestone</DialogTitle>
            <DialogDescription>
              {editingId ? "Update milestone details" : "Add a new project milestone"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(projects) && projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phase Name */}
            <div className="space-y-2">
              <Label htmlFor="phaseName">Phase Name *</Label>
              <Input
                value={formData.phaseName}
                onChange={(e) => setFormData({ ...formData, phaseName: e.target.value })}
                placeholder="e.g., Requirements Gathering"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Phase description"
                rows={2}
              />
            </div>

            {/* Deliverables */}
            <div className="space-y-2">
              <Label htmlFor="deliverables">Deliverables</Label>
              <Textarea
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                placeholder="List of deliverables"
                rows={2}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (Ksh)</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Update" : "Create"} Milestone
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Milestones Grid */}
      <div className="space-y-4">
        {!milestones || milestones.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
            No milestones yet. Create one to get started.
          </div>
        ) : (
          milestones.map((milestone: Milestone) => (
            <div key={milestone.id} className={`border rounded-lg p-4 ${statusColor(milestone.status)} bg-opacity-20`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {milestone.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    <h3 className="text-lg font-semibold">{milestone.phaseName}</h3>
                    <Badge className={statusColor(milestone.status)}>
                      {milestone.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Project: {getProjectName(milestone.projectId)}
                  </p>
                  {milestone.description && (
                    <p className="text-sm text-gray-700 mb-2">{milestone.description}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(milestone)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(milestone.id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm font-semibold">{milestone.completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${milestone.completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Progress Slider */}
              {milestone.status !== "completed" && (
                <div className="mb-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={milestone.completionPercentage}
                    onChange={(e) =>
                      updateProgressMutation.mutate({
                        id: milestone.id,
                        completionPercentage: parseInt(e.target.value),
                      })
                    }
                    className="w-full cursor-pointer"
                  />
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Due Date</span>
                  <p className="font-medium">{formatDate(milestone.dueDate)}</p>
                </div>
                {milestone.budget && (
                  <div>
                    <span className="text-gray-600">Budget</span>
                    <p className="font-medium">
                      Ksh {(milestone.budget / 100).toLocaleString("en-KE")}
                    </p>
                  </div>
                )}
                {milestone.actualCost > 0 && (
                  <div>
                    <span className="text-gray-600">Actual Cost</span>
                    <p className="font-medium">
                      Ksh {(milestone.actualCost / 100).toLocaleString("en-KE")}
                    </p>
                  </div>
                )}
                {milestone.completionDate && (
                  <div>
                    <span className="text-gray-600">Completed</span>
                    <p className="font-medium">{formatDate(milestone.completionDate)}</p>
                  </div>
                )}
              </div>

              {/* Deliverables */}
              {milestone.deliverables && (
                <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-sm">
                  <strong>Deliverables:</strong>
                  <p className="whitespace-pre-wrap">{milestone.deliverables}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ModuleLayout>
  );
}
