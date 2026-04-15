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
import { Progress } from "@/components/ui/progress";
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
import { Plus, Trash2, Edit2, CheckCircle2, Clock, DollarSign, TrendingUp } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

type TimeEntry = {
  id: string;
  projectId: string;
  projectTaskId: string | null;
  userId: string;
  entryDate: string;
  durationMinutes: number;
  description: string;
  billable: boolean;
  hourlyRate: number | null;
  amount: number | null;
  status: "draft" | "submitted" | "approved" | "invoiced" | "rejected";
  approvedBy: string | null;
  approvedAt: string | null;
  invoiceId: string | null;
  notes: string | null;
};

type Project = {
  id: string;
  projectNumber: string;
  name: string;
};

export default function TimeTracking() {
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    projectId: "",
    projectTaskId: "",
    entryDate: new Date().toISOString().split("T")[0],
    durationMinutes: 60,
    description: "",
    billable: true,
    hourlyRate: 0,
    notes: "",
  });

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [filterBillable, setFilterBillable] = useState<boolean | null>(null);

  // Queries
  const projectsQuery = trpc.projects.list.useQuery(undefined);

  const entriesQuery = trpc.timeEntries.list.useQuery({
    projectId: filterProject || undefined,
    status: (filterStatus as any) || undefined,
    billable: filterBillable !== null ? filterBillable : undefined,
  });

  // Get current date range for utilization report (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const reportQuery = trpc.timeEntries.getUtilizationReport.useQuery({
    startDate: thirtyDaysAgo.toISOString(),
    endDate: new Date().toISOString(),
    projectId: filterProject || undefined,
  });

  // Mutations
  const createMutation = trpc.timeEntries.create.useMutation({
    onSuccess: () => {
      toast.success("Time entry created");
      entriesQuery.refetch();
      reportQuery.refetch();
      resetForm();
      setOpenDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create time entry");
    },
  });

  const updateMutation = trpc.timeEntries.update.useMutation({
    onSuccess: () => {
      toast.success("Time entry updated");
      entriesQuery.refetch();
      reportQuery.refetch();
      resetForm();
      setOpenDialog(false);
      setIsEditMode(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update time entry");
    },
  });

  const deleteMutation = trpc.timeEntries.delete.useMutation({
    onSuccess: () => {
      toast.success("Time entry deleted");
      entriesQuery.refetch();
      reportQuery.refetch();
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete time entry");
    },
  });

  const submitMutation = trpc.timeEntries.submit.useMutation({
    onSuccess: () => {
      toast.success("Time entry submitted for approval");
      entriesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit time entry");
    },
  });

  const approveMutation = trpc.timeEntries.approve.useMutation({
    onSuccess: () => {
      toast.success("Time entry approved");
      entriesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve time entry");
    },
  });

  // Helper functions
  const resetForm = () => {
    setFormData({
      projectId: "",
      projectTaskId: "",
      entryDate: new Date().toISOString().split("T")[0],
      durationMinutes: 60,
      description: "",
      billable: true,
      hourlyRate: 0,
      notes: "",
    });
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleCreateOrUpdate = () => {
    if (!formData.projectId || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    const dateString = `${formData.entryDate}T12:00:00Z`;

    if (isEditMode && editingId) {
      updateMutation.mutate({
        id: editingId,
        entryDate: dateString,
        durationMinutes: formData.durationMinutes,
        description: formData.description,
        billable: formData.billable,
        hourlyRate: formData.hourlyRate || undefined,
        notes: formData.notes || undefined,
      });
    } else {
      createMutation.mutate({
        projectId: formData.projectId,
        projectTaskId: formData.projectTaskId || undefined,
        entryDate: dateString,
        durationMinutes: formData.durationMinutes,
        description: formData.description,
        billable: formData.billable,
        hourlyRate: formData.hourlyRate || undefined,
        notes: formData.notes || undefined,
      });
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setFormData({
      projectId: entry.projectId,
      projectTaskId: entry.projectTaskId || "",
      entryDate: entry.entryDate.split("T")[0],
      durationMinutes: entry.durationMinutes,
      description: entry.description,
      billable: entry.billable,
      hourlyRate: entry.hourlyRate || 0,
      notes: entry.notes || "",
    });
    setIsEditMode(true);
    setEditingId(entry.id);
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = (id: string) => {
    submitMutation.mutate(id);
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id, approve: true });
  };

  // Filtered entries
  const filteredEntries = entriesQuery.data || [];

  // Utility calculations
  const durationHours = formData.durationMinutes / 60;
  const estimatedAmount = formData.hourlyRate ? Math.round(durationHours * formData.hourlyRate) : 0;

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "invoiced":
        return "bg-purple-100 text-purple-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (projectsQuery.isLoading) {
    return <div>Loading...</div>;
  }

  const projects = projectsQuery.data || [];

  return (
    <ModuleLayout
      title="Time Tracking"
      description="Track project and task time for accurate billing"
      icon={<Clock className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Projects", href: "/projects" },
        { label: "Time Tracking" },
      ]}
    >
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Time Tracking</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setOpenDialog(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Log Time
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Time Entry" : "Log New Time"}</DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update your time entry details"
                  : "Record the time you spent working on a task"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Project Selection */}
              <div>
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, projectId: value, projectTaskId: "" })
                  }
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p: Project) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name || p.projectNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Selection (optional) */}
              {formData.projectId && (
                <div>
                  <Label htmlFor="task">Task ID (optional)</Label>
                  <Input
                    id="task"
                    placeholder="Enter task ID (optional)"
                    value={formData.projectTaskId}
                    onChange={(e) => setFormData({ ...formData, projectTaskId: e.target.value })}
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                />
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">{durationHours.toFixed(2)} hours</p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="What work did you do?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Billable */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billable"
                  checked={formData.billable}
                  onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                />
                <Label htmlFor="billable" className="cursor-pointer">
                  Billable to client
                </Label>
              </div>

              {/* Hourly Rate */}
              {formData.billable && (
                <div>
                  <Label htmlFor="rate">Hourly Rate (KES) (optional)</Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData({ ...formData, hourlyRate: parseInt(e.target.value) || 0 })
                    }
                  />
                  {estimatedAmount > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Estimated amount: KES {estimatedAmount.toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <Button
                onClick={handleCreateOrUpdate}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full"
              >
                {isEditMode ? "Update Entry" : "Log Time"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {reportQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            label="Total Hours (30d)"
            value={(reportQuery.data.totalMinutes / 60).toFixed(1)}
            description={<>{reportQuery.data.entryCount} entries</>}
            color="border-l-orange-500"
          />

          <StatsCard
            label="Billable Hours"
            value={(reportQuery.data.billableMinutes / 60).toFixed(1)}
            description={<>{reportQuery.data.utilization}% utilization</>}
            color="border-l-purple-500"
          />

          <StatsCard
            label="Billable Amount"
            value={<>KES {((reportQuery.data?.totalAmount) || 0).toLocaleString()}</>}
            description="Across all entries"
            color="border-l-green-500"
          />

          <StatsCard
            label="Pending Approval"
            value={(reportQuery.data?.submittedCount) || 0}
            description={<>{(reportQuery.data?.draftCount) || 0} draft</>}
            color="border-l-blue-500"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div>
            <Label className="text-xs mb-1">Project</Label>
            <Select value={filterProject || "all"} onValueChange={(v) => setFilterProject(v === "all" ? null : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p: Project) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name || p.projectNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1">Status</Label>
            <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? null : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1">Type</Label>
            <Select
              value={filterBillable === null ? "" : filterBillable ? "billable" : "non-billable"}
              onValueChange={(v) => {
                if (v === "") setFilterBillable(null);
                else if (v === "billable") setFilterBillable(true);
                else setFilterBillable(false);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="billable">Billable</SelectItem>
                <SelectItem value="non-billable">Non-billable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries List */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Time Entries</h2>

        {entriesQuery.isLoading ? (
          <p>Loading entries...</p>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No time entries found. Start by logging some time!
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry: any) => (
            <Card key={entry.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold">{entry.description}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(entry.entryDate)} • {entry.durationMinutes / 60} hours
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge className={`${getStatusColor(entry.status)}`}>{entry.status}</Badge>
                    {entry.billable && <Badge variant="outline">Billable</Badge>}
                  </div>
                </div>

                {entry.amount && entry.amount > 0 && (
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">KES {entry.amount.toLocaleString()}</span>
                  </div>
                )}

                {entry.notes && (
                  <p className="text-sm text-muted-foreground mb-3 p-2 bg-muted rounded">
                    {entry.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  {entry.status === "draft" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmit(entry.id)}
                      >
                        Submit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteConfirmId(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {entry.status === "submitted" && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(entry.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The time entry will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            className="bg-destructive"
          >
            Delete
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </ModuleLayout>
  );
}
