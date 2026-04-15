import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Calendar,
  FileText,
  TrendingUp,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Settings,
  ArrowRight,
  User,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";

/**
 * StaffDashboard component
 * 
 * Features:
 * - Attendance tracking
 * - Leave requests
 * - Task management
 * - Performance overview
 * - Personal profile
 */
export default function StaffDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuthWithPersistence({
    redirectOnUnauthenticated: true,
  });
  const [, setLocation] = useLocation();

  // Fetch attendance data from backend
  const { data: attendanceData, isLoading: attendanceLoading } = trpc.attendance.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch leave requests from backend
  const { data: leaveData, isLoading: leaveLoading } = trpc.leave.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch projects assigned to user
  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Convert frozen objects to plain objects
  const attendanceDataPlain = attendanceData ? JSON.parse(JSON.stringify(attendanceData)) : [];
  const leaveDataPlain = leaveData ? JSON.parse(JSON.stringify(leaveData)) : [];
  const projectsDataPlain = projectsData ? JSON.parse(JSON.stringify(projectsData)) : [];

  useEffect(() => {
    // Verify user has staff role
    if (!loading && isAuthenticated && user?.role !== "staff") {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading || attendanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "staff") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  // Calculate attendance stats
  const totalAttendance = attendanceDataPlain?.length || 0;
  const presentDays = attendanceDataPlain?.filter((a: any) => a.status === "present").length || 0;
  const absentDays = attendanceDataPlain?.filter((a: any) => a.status === "absent").length || 0;
  const lateDays = attendanceDataPlain?.filter((a: any) => a.status === "late").length || 0;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;

  // Calculate leave stats
  const pendingLeaves = leaveDataPlain?.filter((l: any) => l.status === "pending").length || 0;
  const approvedLeaves = leaveDataPlain?.filter((l: any) => l.status === "approved").length || 0;

  // Calculate project stats
  const assignedProjects = projectsDataPlain?.length || 0;
  const activeProjects = projectsDataPlain?.filter((p: any) => p.status === "active").length || 0;

  // Get today's attendance
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceDataPlain?.find((a: any) => 
    a.date && new Date(a.date).toISOString().split('T')[0] === today
  );

  // Get recent attendance records
  const recentAttendance = attendanceDataPlain?.slice(0, 5) || [];

  return (
    <ModuleLayout
      title="Staff Dashboard"
      description="Track your attendance, manage leave requests, and view assigned tasks"
      icon={<User className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Staff" }]}
      actions={
        <div className="flex gap-2">
          <Button onClick={() => setLocation("/profile/settings")} variant="secondary" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            My Settings
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLocation("/crm-home")}>
            Go to Main Dashboard
          </Button>
        </div>
      }
    >
      <div className="space-y-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Today's Status</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAttendance ? (
                <>
                  <div className={`text-2xl font-bold ${
                    todayAttendance.status === "present" ? "text-green-600" :
                    todayAttendance.status === "late" ? "text-orange-600" :
                    "text-red-600"
                  }`}>
                    {todayAttendance.status === "present" ? "Present" :
                     todayAttendance.status === "late" ? "Late" : "Absent"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {todayAttendance.checkIn 
                      ? `Checked in at ${new Date(todayAttendance.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                      : "Not checked in"}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-400">Not Marked</div>
                  <p className="text-xs text-gray-500 mt-1">No record for today</p>
                </>
              )}
            </CardContent>
          </Card>

          <StatsCard
            label="Attendance"
            value={<>{attendanceRate}%</>}
            description={<>{presentDays} of {totalAttendance} days</>}
            color="border-l-purple-500"
          />

          <StatsCard label="Pending Requests" value={pendingLeaves} description="Leave requests" color="border-l-green-500" />

          <StatsCard label="Projects" value={activeProjects} description="Active projects" color="border-l-blue-500" />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Leave Requests
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Projects
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentAttendance.length > 0 ? (
                      recentAttendance.slice(0, 3).map((record: any, index: number) => (
                        <div key={`attendance-${record.date}-${index}`} className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            record.status === "present" ? "bg-green-600" :
                            record.status === "late" ? "bg-orange-600" :
                            "bg-red-600"
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium">
                              {record.status === "present" ? "Checked in" :
                               record.status === "late" ? "Late check-in" : "Absent"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.date ? new Date(record.date).toLocaleDateString() : "Unknown date"}
                              {record.checkIn && ` at ${new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start"
                    onClick={() => setLocation("/attendance")}
                  >
                    Check In
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/leave")}
                  >
                    Request Leave
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/payroll")}
                  >
                    View Payslip
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/profile")}
                  >
                    Update Profile
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Record</CardTitle>
                <CardDescription>Your attendance history</CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Present</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{presentDays}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Absent</p>
                        <p className="text-2xl font-bold text-orange-600 mt-1">{absentDays}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Late</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{lateDays}</p>
                      </div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <p className="text-sm font-medium mb-3">Recent Check-ins</p>
                      {recentAttendance.length > 0 ? (
                        <div className="space-y-2">
                          {recentAttendance.map((record: any, index: number) => (
                            <div key={`checkin-${record.date}-${index}`} className="flex justify-between text-sm">
                              <span>
                                {record.date ? new Date(record.date).toLocaleDateString() : "Unknown"}
                              </span>
                              <span className={
                                record.status === "present" ? "text-green-600" :
                                record.status === "late" ? "text-orange-600" :
                                "text-red-600"
                              }>
                                {record.checkIn 
                                  ? new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                  : record.status === "absent" ? "Absent" : "N/A"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No attendance records found</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Requests Tab */}
          <TabsContent value="leave" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Leave Requests</CardTitle>
                    <CardDescription>Manage your leave requests</CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/leave-management/create")}>Request Leave</Button>
                </div>
              </CardHeader>
              <CardContent>
                {leaveLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : leaveData && leaveData.length > 0 ? (
                  <div className="space-y-3">
                    {leaveDataPlain.map((leave: any) => (
                      <div key={leave.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{leave.leaveType || "Leave"}</p>
                            <p className="text-xs text-gray-500">
                              {leave.startDate && leave.endDate
                                ? `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}`
                                : "Date not specified"}
                            </p>
                            {leave.reason && (
                              <p className="text-xs text-gray-600 mt-1">{leave.reason}</p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            leave.status === "approved" ? "bg-green-100 text-green-800" :
                            leave.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-orange-100 text-orange-800"
                          }`}>
                            {leave.status || "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No leave requests found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Projects</CardTitle>
                <CardDescription>Your current projects and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : projectsData && projectsData.length > 0 ? (
                  <div className="space-y-3">
                    {projectsDataPlain.map((project: any) => (
                      <div key={project.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                           onClick={() => setLocation(`/projects/${project.id}`)}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{project.name || "Untitled Project"}</p>
                            <p className="text-xs text-gray-500">
                              {project.description || "No description"}
                            </p>
                            {project.deadline && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {new Date(project.deadline).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            project.status === "completed" ? "bg-green-100 text-green-800" :
                            project.status === "active" ? "bg-blue-100 text-blue-800" :
                            project.status === "on-hold" ? "bg-orange-100 text-orange-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {project.status || "Not Started"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No projects assigned
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
