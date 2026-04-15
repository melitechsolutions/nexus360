import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, ArrowLeft, Loader2 } from "lucide-react";

export default function EditDepartment() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    budget: "",
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch department data
  const { data: department } = trpc.departments.getById.useQuery(
    id || "",
    { enabled: !!id }
  );

  // Update form when department data loads
  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || "",
        description: department.description || "",
        budget: department.budget ? department.budget.toString() : "",
        isActive: department.isActive !== false,
      });
      setIsLoading(false);
    }
  }, [department]);

  const updateDepartmentMutation = trpc.departments.update.useMutation({
    onSuccess: () => {
      toast.success("Department updated successfully!");
      utils.departments.list.invalidate();
      utils.departments.getById.invalidate(id || "");
      navigate("/departments");
    },
    onError: (error: any) => {
      toast.error(`Failed to update department: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Department name is required");
      return;
    }

    updateDepartmentMutation.mutate({
      id: id || "",
      name: formData.name,
      description: formData.description || undefined,
      budget: formData.budget ? Math.round(parseFloat(formData.budget) * 100) : undefined,
      isActive: formData.isActive,
    });
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit Department"
        description="Update department details"
        icon={<Building2 className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "HR", href: "/hr" },
          { label: "Departments", href: "/departments" },
          { label: "Edit Department" },
        ]}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Department"
      description="Update department details"
      icon={<Building2 className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Departments", href: "/departments" },
        { label: "Edit Department" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Department</CardTitle>
            <CardDescription>
              Update the department details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Engineering"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter department description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Annual Budget (Ksh)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="0.00"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                />
                <Label htmlFor="isActive" className="font-normal cursor-pointer">
                  Active Department
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updateDepartmentMutation.isPending}
                >
                  {updateDepartmentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Department
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/departments")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

