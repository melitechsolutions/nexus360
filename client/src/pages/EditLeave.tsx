import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
import { Calendar, ArrowLeft, Loader2, Trash2, Save } from "lucide-react";

export default function EditLeave() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    employeeId: "",
    leaveType: "annual",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
    status: "pending",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const { data: leave } = trpc.leave.getById.useQuery(
    id || "",
    { enabled: !!id }
  );

  const { data: employees = [] } = trpc.employees.list.useQuery();

  useEffect(() => {
    if (leave) {
      setFormData({
        employeeId: leave.employeeId || "",
        leaveType: leave.leaveType || "annual",
        startDate: leave.startDate
          ? new Date(leave.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        endDate: leave.endDate
          ? new Date(leave.endDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        reason: leave.reason || "",
        status: leave.status || "pending",
        notes: leave.notes || "",
      });
      setIsLoading(false);
    }
  }, [leave]);

  const updateLeaveMutation = trpc.leave.update.useMutation({
    onSuccess: () => {
      toast.success("Leave request updated successfully!");
      utils.leave.list.invalidate();
      utils.leave.getById.invalidate(id || "");
      navigate("/leave-management");
    },
    onError: (error: any) => {
      toast.error(`Failed to update leave request: ${error.message}`);
    },
  });

  const deleteLeaveMutation = trpc.leave.delete.useMutation({
    onSuccess: () => {
      toast.success("Leave request deleted successfully!");
      utils.leave.list.invalidate();
      navigate("/leave-management");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete leave request: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    updateLeaveMutation.mutate({
      id: id || "",
      employeeId: formData.employeeId,
      leaveType: formData.leaveType as any,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      reason: formData.reason || undefined,
      status: formData.status as any,
      notes: formData.notes || undefined,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this leave request? This action cannot be undone.")) {
      deleteLeaveMutation.mutate(id || "");
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit Leave Request"
        description="Update leave request"
        icon={<Calendar className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "HR", href: "/hr" },
          { label: "Leave Management", href: "/leave-management" },
          { label: "Edit Leave Request" },
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
      title="Edit Leave Request"
      description="Update leave request"
      icon={<Calendar className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Leave Management", href: "/leave-management" },
        { label: "Edit Leave Request" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Leave Request</CardTitle>
            <CardDescription>
              Update the leave request details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employeeId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(employees) && employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {(emp.firstName || "")} {(emp.lastName || "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select
                    value={formData.leaveType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, leaveType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="maternity">Maternity Leave</SelectItem>
                      <SelectItem value="paternity">Paternity Leave</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for leave"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteLeaveMutation.isPending}
                >
                  {deleteLeaveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/leave-management")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateLeaveMutation.isPending}
                  >
                    {updateLeaveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Update Leave Request
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
