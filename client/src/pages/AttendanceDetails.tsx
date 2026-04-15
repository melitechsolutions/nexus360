import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModuleLayout } from "@/components/ModuleLayout";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { ChevronRight, Edit2, Trash2, Clock, CalendarDays, LogIn, LogOut, FileText, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-green-100 text-green-800 border-green-200" },
  absent: { label: "Absent", className: "bg-red-100 text-red-800 border-red-200" },
  late: { label: "Late", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  leave: { label: "Leave", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

export default function AttendanceDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch attendance record from backend
  const { data: attendanceData, isLoading } = trpc.attendance.getById.useQuery(id || "");
  const { data: employeesData = [] } = trpc.employees.list.useQuery();
  const utils = trpc.useUtils();

  const deleteAttendanceMutation = trpc.attendance.delete.useMutation({
    onSuccess: () => {
      toast.success("Attendance record deleted successfully");
      utils.attendance.list.invalidate();
      setLocation("/attendance");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete attendance record");
    },
  });

  // Get employee info
  const employee = attendanceData ? (employeesData as any[]).find((e: any) => e.id === (attendanceData as any).employeeId) : null;

  const attendanceRecord = attendanceData ? {
    id: id,
    employeeId: (attendanceData as any).employeeId || "Unknown",
    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee",
    date: (attendanceData as any).date ? new Date((attendanceData as any).date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    checkIn: (attendanceData as any).checkInTime ? new Date((attendanceData as any).checkInTime).toLocaleTimeString() : "Not checked in",
    checkOut: (attendanceData as any).checkOutTime ? new Date((attendanceData as any).checkOutTime).toLocaleTimeString() : "Not checked out",
    status: (attendanceData as any).status || "absent",
    hoursWorked: (attendanceData as any).checkInTime && (attendanceData as any).checkOutTime 
      ? ((new Date((attendanceData as any).checkOutTime).getTime() - new Date((attendanceData as any).checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(2)
      : 0,
    notes: (attendanceData as any).notes || "",
  } : null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteAttendanceMutation, id || "");
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
        title="Attendance Details"
        icon={<Clock className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "HR", href: "/hr" },
          { label: "Attendance", href: "/attendance" },
          { label: "Details" },
        ]}
        backLink={{ label: "Attendance", href: "/attendance" }}
      >
        <div className="flex items-center justify-center h-64">
          <p>Loading attendance record...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!attendanceRecord) {
    return (
      <ModuleLayout
        title="Attendance Details"
        icon={<Clock className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "HR", href: "/hr" },
          { label: "Attendance", href: "/attendance" },
          { label: "Details" },
        ]}
        backLink={{ label: "Attendance", href: "/attendance" }}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Attendance record not found</p>
          <Button onClick={() => setLocation("/attendance")}>Back to Attendance</Button>
        </div>
      </ModuleLayout>
    );
  }

  const status = statusConfig[attendanceRecord.status] || statusConfig.absent;

  return (
    <ModuleLayout
      title="Attendance Details"
      icon={<Clock className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "HR", href: "/hr" },
        { label: "Attendance", href: "/attendance" },
        { label: "Details" },
      ]}
      backLink={{ label: "Attendance", href: "/attendance" }}
    >
      <div className="space-y-6">

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                    {attendanceRecord.employeeName.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <h2 className="text-lg font-semibold">{attendanceRecord.employeeName}</h2>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">{attendanceRecord.date ? new Date(attendanceRecord.date).toLocaleDateString() : "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <LogIn className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Clock In</p>
                      <p className="text-sm font-medium">{attendanceRecord.checkIn}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Clock Out</p>
                      <p className="text-sm font-medium">{attendanceRecord.checkOut}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Hours Worked</p>
                      <p className="text-sm font-medium">{attendanceRecord.hoursWorked} hours</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setLocation(`/attendance/${id}/edit`)}>
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1 gap-1.5" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee ID</p>
                  <p className="font-medium">{attendanceRecord.employeeId}</p>
                </div>
                {attendanceRecord.notes ? (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium whitespace-pre-wrap">{attendanceRecord.notes}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MapPin className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No additional notes or location data recorded.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          title="Delete Attendance Record"
          description="Are you sure you want to delete this attendance record? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={isDeleting}
        />
      </div>
    </ModuleLayout>
  );
}
