import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, ArrowLeft } from "lucide-react";

export default function CreateDepartment() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    budget: "",
    headId: "",
    isActive: true,
  });

  // Fetch employees for department head selector
  const { data: employees = [] } = trpc.employees.list.useQuery();

  const createDepartmentMutation = trpc.departments.create.useMutation({
    onSuccess: () => {
      toast.success("Department created successfully!");
      utils.departments.list.invalidate();
      navigate("/departments");
    },
    onError: (error: any) => {
      toast.error(`Failed to create department: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Department name is required");
      return;
    }

    createDepartmentMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      budget: formData.budget ? Math.round(parseFloat(formData.budget) * 100) : undefined,
      headId: formData.headId || undefined,
      isActive: formData.isActive,
    });
  };

  return (
    <ModuleLayout
      title="Create Department"
      description="Add a new department to your organization"
      icon={<Building2 className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Departments", href: "/departments" },
        { label: "Create Department" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Department</CardTitle>
            <CardDescription>
              Enter the department details below to create a new department
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
                <Label htmlFor="headId">Department Head</Label>
                <Select
                  value={formData.headId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, headId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department head (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees as any[]).map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.position || emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/departments")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createDepartmentMutation.isPending}
                >
                  {createDepartmentMutation.isPending
                    ? "Creating..."
                    : "Create Department"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

