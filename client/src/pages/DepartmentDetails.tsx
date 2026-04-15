import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Building2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";

export default function DepartmentDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch department from backend
  const { data: departmentData, isLoading } = trpc.departments.getById.useQuery(id || "");
  const { data: employeesData = [] } = trpc.employees.list.useQuery();
  const utils = trpc.useUtils();

  const deleteDepartmentMutation = trpc.departments.delete.useMutation({
    onSuccess: () => {
      toast.success("Department deleted successfully");
      utils.departments.list.invalidate();
      navigate("/departments");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete department");
    },
  });

  // Count employees in this department
  const employeeCount = (employeesData as any[]).filter((e: any) => e.department === (departmentData as any)?.name).length;

  const department = departmentData ? {
    id: id || "1",
    name: (departmentData as any).name || "Unknown Department",
    code: (departmentData as any).code || `DEPT-${id?.slice(0, 4)}`,
    manager: (departmentData as any).headId || "Not assigned",
    employeeCount: employeeCount,
    budget: (departmentData as any).budget || 0,
    status: (departmentData as any).status || "active",
    description: (departmentData as any).description || "",
  } : null;

  const handleEdit = () => {
    navigate(`/departments/${id}/edit`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteDepartmentMutation, id || "");
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Department Details"
        icon={<Building2 className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "HR", href: "/hr" },
          { label: "Departments", href: "/departments" },
          { label: "Details" },
        ]}
        backLink={{ label: "Departments", href: "/departments" }}
      >
        <div className="flex items-center justify-center h-64">
          <p>Loading department...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!department) {
    return (
      <ModuleLayout
        title="Department Details"
        icon={<Building2 className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "HR", href: "/hr" },
          { label: "Departments", href: "/departments" },
          { label: "Details" },
        ]}
        backLink={{ label: "Departments", href: "/departments" }}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Department not found</p>
          <Button onClick={() => navigate("/departments")}>Back to Departments</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Department Details"
      icon={<Building2 className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "HR", href: "/hr" },
        { label: "Departments", href: "/departments" },
        { label: "Details" },
      ]}
      backLink={{ label: "Departments", href: "/departments" }}
    >
      <div className="space-y-6">

        <div className="flex gap-2">
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Department Information</CardTitle>
            {department.description && (
              <CardDescription>{department.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Manager</label>
                <p className="text-muted-foreground">{department.manager}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Employees</label>
                <p className="text-muted-foreground">{department.employeeCount}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Budget</label>
                <p className="text-muted-foreground">Ksh {(department.budget || 0).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Badge variant={department.status === "active" ? "default" : "secondary"}>
                  {department.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Department"
        description="Are you sure you want to delete this department? This action cannot be undone."
      />
    </ModuleLayout>
  );
}
