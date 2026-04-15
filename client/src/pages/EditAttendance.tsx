import React, { useState, useEffect } from "react";
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
import { Clock, ArrowLeft, Loader2 } from "lucide-react";

export default function EditAttendance() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    checkInTime: "",
    checkOutTime: "",
    status: "present",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const { data: attendance } = trpc.attendance.getById.useQuery(
    id || "",
    { enabled: !!id }
  );

  const { data: employees = [] } = trpc.employees.list.useQuery();

  useEffect(() => {
    if (attendance) {
      setFormData({
        employeeId: attendance.employeeId || "",
        date: attendance.date
          ? new Date(attendance.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        checkInTime: attendance.checkInTime
          ? new Date(attendance.checkInTime).toTimeString().slice(0, 5)
          : "",
        checkOutTime: attendance.checkOutTime
          ? new Date(attendance.checkOutTime).toTimeString().slice(0, 5)
          : "",
        status: attendance.status || "present",
        notes: attendance.notes || "",
      });
      setIsLoading(false);
    }
  }, [attendance]);

  const updateAttendanceMutation = trpc.attendance.update.useMutation({
    onSuccess: () => {
      toast.success("Attendance record updated successfully!");
      utils.attendance.list.invalidate();
      utils.attendance.getById.invalidate(id || "");
      navigate("/attendance");
    },
    onError: (error: any) => {
      toast.error(`Failed to update attendance record: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.date || !formData.status) {
      toast.error("Please fill in all required fields");
      return;
    }

    updateAttendanceMutation.mutate({
      id: id || "",
      employeeId: formData.employeeId,
      date: new Date(formData.date),
      checkInTime: formData.checkInTime ? new Date(`${formData.date}T${formData.checkInTime}`) : undefined,
      checkOutTime: formData.checkOutTime ? new Date(`${formData.date}T${formData.checkOutTime}`) : undefined,
      status: formData.status as any,
      notes: formData.notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit Attendance"
        description="Update attendance record"
        icon={<Clock className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "HR", href: "/hr" },
          { label: "Attendance", href: "/attendance" },
          { label: "Edit Attendance" },
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
      title="Edit Attendance"
      description="Update attendance record"
      icon={<Clock className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Attendance", href: "/attendance" },
        { label: "Edit Attendance" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Attendance</CardTitle>
            <CardDescription>
              Update the attendance record below
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
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
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
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="checkInTime">Check-in Time</Label>
                  <Input
                    id="checkInTime"
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) =>
                      setFormData({ ...formData, checkInTime: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkOutTime">Check-out Time</Label>
                  <Input
                    id="checkOutTime"
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) =>
                      setFormData({ ...formData, checkOutTime: e.target.value })
                    }
                  />
                </div>
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
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updateAttendanceMutation.isPending}
                >
                  {updateAttendanceMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Attendance
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/attendance")}
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
