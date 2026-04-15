import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleLayout } from "@/components/ModuleLayout";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { Edit2, Trash2, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import mutateAsync from '@/lib/mutationHelpers';

export default function HRDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch employee from backend (HR details are employee records)
  const { data: employeeData, isLoading } = trpc.employees.getById.useQuery(id || "");
  const utils = trpc.useUtils();

  const deleteEmployeeMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("HR record deleted successfully");
      utils.employees.list.invalidate();
      setLocation("/hr");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete HR record");
    },
  });

  const hrRecord = employeeData ? {
    id: id,
    employeeId: (employeeData as any).employeeNumber || `EMP-${id?.slice(0, 8)}`,
    employeeName: `${(employeeData as any).firstName || ""} ${(employeeData as any).lastName || ""}`.trim() || "Unknown",
    department: (employeeData as any).department || "Not assigned",
    position: (employeeData as any).position || "Not specified",
    joinDate: (employeeData as any).joinDate ? new Date((employeeData as any).joinDate).toISOString().split('T')[0] : "Not specified",
    email: (employeeData as any).email || "Not provided",
    phone: (employeeData as any).phone || "Not provided",
    status: (employeeData as any).status || "active",
  } : null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteEmployeeMutation, id || "");
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
        title="HR Details"
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "HR", href: "/hr" },
          { label: "Details" },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <p>Loading HR record...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!hrRecord) {
    return (
      <ModuleLayout
        title="HR Details"
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "HR", href: "/hr" },
          { label: "Details" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>HR record not found</p>
          <Button onClick={() => setLocation("/hr")}>Back to HR</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="HR Details"
      icon={<Users className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "HR", href: "/hr" },
        { label: "Details" },
      ]}
    >
      <div className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle>{hrRecord.employeeName}</CardTitle>
            <CardDescription>{hrRecord.position}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Employee ID</p>
                <p className="font-semibold">{hrRecord?.employeeId || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Department</p>
                <p className="font-semibold">{hrRecord?.department || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Join Date</p>
                <p className="font-semibold">{hrRecord?.joinDate || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Status</p>
                <p className={`font-semibold ${(hrRecord?.status || 'inactive') === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                  {((hrRecord?.status || "inactive") as string).charAt(0).toUpperCase() + ((hrRecord?.status || "inactive") as string).slice(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-semibold">{hrRecord?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Phone</p>
                <p className="font-semibold">{hrRecord?.phone || "N/A"}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="gap-2" onClick={() => setLocation(`/hr/${id}/edit`)}>
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          title="Delete HR Record"
          description="Are you sure you want to delete this HR record? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={isDeleting}
        />
      </div>
    </ModuleLayout>
  );
}
