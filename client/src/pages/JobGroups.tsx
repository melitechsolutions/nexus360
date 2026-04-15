import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit2, Trash2, Search, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrencySettings } from "@/lib/currency";

interface JobGroup {
  id: string;
  name: string;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function JobGroups() {
  const { code: currencyCode } = useCurrencySettings();
  const { allowed, isLoading: permissionLoading } = useRequireFeature("jobGroups:read");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingJobGroup, setEditingJobGroup] = useState<JobGroup | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minSalary: "",
    maxSalary: "",
    currency: currencyCode,
  });

  // Queries
  const { data: jobGroupsData = [], isLoading: jobGroupsLoading, refetch } = trpc.jobGroups.list.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const createMutation = trpc.jobGroups.create.useMutation({
    onSuccess: () => {
      toast.success("Job group created successfully");
      setFormData({ name: "", description: "", minSalary: "", maxSalary: "", currency: currencyCode });
      setIsCreateDialogOpen(false);
      utils.jobGroups.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create job group");
    },
  });

  const updateMutation = trpc.jobGroups.update.useMutation({
    onSuccess: () => {
      toast.success("Job group updated successfully");
      setFormData({ name: "", description: "", minSalary: "", maxSalary: "", currency: currencyCode });
      setIsEditDialogOpen(false);
      setEditingJobGroup(null);
      utils.jobGroups.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update job group");
    },
  });

  const deleteMutation = trpc.jobGroups.delete.useMutation({
    onSuccess: () => {
      toast.success("Job group deleted successfully");
      setDeleteConfirmId(null);
      utils.jobGroups.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete job group");
    },
  });

  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Job group name is required");
      return;
    }

    await createMutation.mutateAsync({
      name: formData.name,
      description: formData.description || undefined,
      minSalary: formData.minSalary ? Math.round(parseFloat(formData.minSalary) * 100) : undefined,
      maxSalary: formData.maxSalary ? Math.round(parseFloat(formData.maxSalary) * 100) : undefined,
      currency: formData.currency,
    });
  };

  const handleEdit = async () => {
    if (!editingJobGroup || !formData.name.trim()) {
      toast.error("Job group name is required");
      return;
    }

    await updateMutation.mutateAsync({
      id: editingJobGroup.id,
      name: formData.name,
      description: formData.description || undefined,
      minSalary: formData.minSalary ? Math.round(parseFloat(formData.minSalary) * 100) : undefined,
      maxSalary: formData.maxSalary ? Math.round(parseFloat(formData.maxSalary) * 100) : undefined,
      currency: formData.currency,
    });
  };

  const openEditDialog = (jobGroup: JobGroup) => {
    setEditingJobGroup(jobGroup);
    setFormData({
      name: jobGroup.name,
      description: jobGroup.description || "",
      minSalary: jobGroup.minSalary ? (jobGroup.minSalary / 100).toString() : "",
      maxSalary: jobGroup.maxSalary ? (jobGroup.maxSalary / 100).toString() : "",
      currency: jobGroup.currency || currencyCode,
    });
    setIsEditDialogOpen(true);
  };

  const filteredJobGroups = jobGroupsData.filter((jg: any) =>
    jg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (jg.description && jg.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ModuleLayout
      title="Job Groups"
      description="Manage job grades, salary structures, and employee classifications"
      icon={<Building2 className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Job Groups" },
      ]}
    >
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Job Groups</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage job grades for your organization
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Job Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Job Group</DialogTitle>
                <DialogDescription>
                  Add a new job grade or classification to your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Job Group Name *</label>
                  <Input
                    placeholder="e.g., Senior Developer, Manager"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Job group description or criteria"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Minimum Salary</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.minSalary}
                      onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Maximum Salary</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.maxSalary}
                      onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Job Group"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search job groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* Job Groups Table */}
        <Card>
          <CardHeader>
            <CardTitle>Job Groups List</CardTitle>
            <CardDescription>
              {filteredJobGroups.length} job group{filteredJobGroups.length !== 1 ? "s" : ""} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobGroupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="size-6" />
              </div>
            ) : filteredJobGroups.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-center">
                <div>
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No job groups found</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Salary Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobGroups.map((jobGroup: any) => (
                      <TableRow key={jobGroup.id}>
                        <TableCell className="font-medium">{jobGroup.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {jobGroup.description || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {jobGroup.minSalary && jobGroup.maxSalary
                            ? `${(jobGroup.minSalary / 100).toLocaleString()} - ${(jobGroup.maxSalary / 100).toLocaleString()} ${
                                jobGroup.currency || currencyCode
                              }`
                            : "Not set"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={jobGroup.isActive ? "default" : "secondary"}>
                            {jobGroup.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {jobGroup.createdAt
                            ? format(new Date(jobGroup.createdAt), "MMM dd, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(jobGroup)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(jobGroup.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Job Group</DialogTitle>
              <DialogDescription>
                Update the job group information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Job Group Name *</label>
                <Input
                  placeholder="e.g., Senior Developer, Manager"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Job group description or criteria"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Minimum Salary</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.minSalary}
                    onChange={(e) => setFormData({ ...formData, minSalary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Maximum Salary</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.maxSalary}
                    onChange={(e) => setFormData({ ...formData, maxSalary: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Updating..." : "Update Job Group"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Job Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job group? This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-3 pt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirmId) {
                    deleteMutation.mutate({ id: deleteConfirmId });
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleLayout>
  );
}
