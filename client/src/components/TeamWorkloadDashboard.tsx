import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingUp, Users, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * TeamWorkloadDashboard component
 * 
 * Displays team member workload allocation and utilization metrics
 * Features:
 * - Team member utilization chart
 * - Project allocation breakdown
 * - Department utilization
 * - Over-allocated warnings
 * - Capacity planning insights
 */
export default function TeamWorkloadDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [utilization, setUtilization] = useState<any[]>([]);

  // Fetch team workload summary
  const { data: workloadData, isLoading } = trpc.projects.teamWorkloadSummary.useQuery({});

  useEffect(() => {
    if (workloadData) {
      setUtilization(workloadData);
    }
  }, [workloadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-600 dark:text-slate-300">Loading team workload...</p>
        </div>
      </div>
    );
  }

  const teamMembers = utilization || [];
  const filteredMembers = selectedDepartment
    ? teamMembers.filter((m) => m.department === selectedDepartment)
    : teamMembers;

  // Calculate department-level metrics
  const departmentStats: Record<string, any> = {};
  teamMembers.forEach((member) => {
    const dept = member.department || "Unassigned";
    if (!departmentStats[dept]) {
      departmentStats[dept] = {
        name: dept,
        totalMembers: 0,
        averageUtilization: 0,
        totalHours: 0,
        overAllocated: 0,
      };
    }
    departmentStats[dept].totalMembers += 1;
    departmentStats[dept].totalHours += member.totalHoursAllocated;
    departmentStats[dept].averageUtilization += member.utilizationPercentage;
    if (member.utilizationPercentage > 100) {
      departmentStats[dept].overAllocated += 1;
    }
  });

  // Calculate final averages
  Object.keys(departmentStats).forEach((dept) => {
    if (departmentStats[dept].totalMembers > 0) {
      departmentStats[dept].averageUtilization = Math.round(
        departmentStats[dept].averageUtilization / departmentStats[dept].totalMembers
      );
    }
  });

  const departments = Object.values(departmentStats) as any[];

  // Identify over-allocated members (>100% utilization)
  const overAllocatedMembers = teamMembers.filter((m) => m.utilizationPercentage > 100);
  const underAllocatedMembers = teamMembers.filter((m) => m.utilizationPercentage < 50 && m.utilizationPercentage > 0);
  const unallocatedMembers = teamMembers.filter((m) => m.utilizationPercentage === 0);

  // Prepare data for charts
  const utilizationChartData = filteredMembers
    .slice(0, 15) // Show top 15 for readability
    .map((member) => ({
      name: member.name.split(" ")[0], // First name only for brevity
      utilization: member.utilizationPercentage,
      allocated: member.totalHoursAllocated,
      label: `${member.name}`,
    }));

  const departmentChartData = departments.map((dept) => ({
    name: dept.name,
    utilization: dept.averageUtilization,
    members: dept.totalMembers,
  }));

  // Color coding for utilization
  const getUtilizationColor = (percentage: number) => {
    if (percentage === 0) return "text-slate-400";
    if (percentage < 50) return "text-yellow-600 dark:text-yellow-400";
    if (percentage <= 100) return "text-green-600 dark:text-green-400";
    return "text-red-600 dark:text-red-400";
  };

  const getUtilizationBadgeColor = (percentage: number) => {
    if (percentage === 0) return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    if (percentage < 50) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-750 dark:text-yellow-200";
    if (percentage <= 100) return "bg-green-100 dark:bg-green-900/30 text-green-750 dark:text-green-200";
    return "bg-red-100 dark:bg-red-900/30 text-red-750 dark:text-red-200";
  };

  const getUtilizationBadgeLabel = (percentage: number) => {
    if (percentage === 0) return "Unallocated";
    if (percentage < 50) return "Under-allocated";
    if (percentage <= 100) return "Optimal";
    return "Over-allocated";
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {overAllocatedMembers.length > 0 && (
        <Alert className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 dark:text-red-200">
            <strong>{overAllocatedMembers.length} team member(s)</strong> are over-allocated with more than 100% utilization. Consider adjusting project assignments.
          </AlertDescription>
        </Alert>
      )}

      {underAllocatedMembers.length > 0 && (
        <Alert className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-200">
            <strong>{underAllocatedMembers.length} team member(s)</strong> have less than 50% utilization. Consider additional project assignments.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Total Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {teamMembers.length}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Across {departments.length} department(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Average Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {teamMembers.length > 0
                ? Math.round(
                  teamMembers.reduce((sum, m) => sum + m.utilizationPercentage, 0) /
                  teamMembers.length
                )
                : 0}
              %
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Team capacity usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Allocated Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(
                teamMembers.reduce((sum, m) => sum + m.totalHoursAllocated, 0)
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total weekly hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Capacity Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.round(
                teamMembers.length * 40 -
                teamMembers.reduce((sum, m) => sum + m.totalHoursAllocated, 0)
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Available hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="team-list">Team List</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
        </TabsList>

        {/* Utilization Tab */}
        <TabsContent value="utilization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Member Utilization</CardTitle>
              <CardDescription>
                Hours allocated per team member (40 hours baseline per week)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {utilizationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={utilizationChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      label={{ value: "Utilization %", angle: -90, position: "insideLeft" }}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      domain={[0, 150]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                        color: "#f1f5f9",
                      }}
                      formatter={(value) => [`${value}%`, "Utilization"]}
                      labelFormatter={(label) => {
                        const member = utilizationChartData.find((d) => d.name === label);
                        return member ? member.label : label;
                      }}
                    />
                    <Bar
                      dataKey="utilization"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                      name="Utilization %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <p>No team members assigned to projects yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Utilization Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utilization Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
                  <p className="text-sm font-medium text-red-700 dark:text-red-200">Over-allocated</p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-1">&gt; 100%</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                    {overAllocatedMembers.length}
                  </p>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/50">
                  <p className="text-sm font-medium text-green-700 dark:text-green-200">Optimal</p>
                  <p className="text-xs text-green-600 dark:text-green-300 mt-1">50-100%</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {teamMembers.filter((m) => m.utilizationPercentage >= 50 && m.utilizationPercentage <= 100).length}
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-200">Under-allocated</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">&lt; 50%</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                    {underAllocatedMembers.length}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-900/50">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Unallocated</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">0%</p>
                  <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-2">
                    {unallocatedMembers.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Utilization</CardTitle>
              <CardDescription>
                Average utilization by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {departmentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis
                      label={{ value: "Avg Utilization %", angle: -90, position: "insideLeft" }}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      domain={[0, 150]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                        color: "#f1f5f9",
                      }}
                      formatter={(value, name) => {
                        if (name === "utilization") return [`${value}%`, "Avg Utilization"];
                        return [value, "Members"];
                      }}
                    />
                    <Bar
                      dataKey="utilization"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                      name="Avg Utilization"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <p>No department data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => (
              <Card key={dept.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[1rem]">{dept.name}</CardTitle>
                    <Badge variant="outline">{dept.totalMembers} members</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Avg Utilization
                    </span>
                    <span className={`font-bold ${getUtilizationColor(dept.averageUtilization)}`}>
                      {dept.averageUtilization}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Total Hours
                    </span>
                    <span className="font-bold">{dept.totalHours}hrs/week</span>
                  </div>
                  {dept.overAllocated > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-red-600 dark:text-red-400">
                        {dept.overAllocated} over-allocated member(s)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Team List Tab */}
        <TabsContent value="team-list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Member Details</CardTitle>
                  <CardDescription>
                    Individual workload and project allocation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.length > 0 ? (
                  <>
                    {/* Department Filter */}
                    <div className="flex gap-2 flex-wrap mb-4">
                      <Badge
                        variant={selectedDepartment === null ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedDepartment(null)}
                      >
                        All Departments
                      </Badge>
                      {departments.map((dept) => (
                        <Badge
                          key={dept.name}
                          variant={selectedDepartment === dept.name ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setSelectedDepartment(dept.name)}
                        >
                          {dept.name}
                        </Badge>
                      ))}
                    </div>

                    {/* Team List */}
                    <div className="border rounded-lg divide-y">
                      {filteredMembers.map((member) => (
                        <div
                          key={member.employeeId}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-50">
                                {member.name}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {member.position || "N/A"} • {member.department || "Unassigned"}
                              </p>
                            </div>
                            <Badge className={getUtilizationBadgeColor(member.utilizationPercentage)}>
                              {member.utilizationPercentage}%
                            </Badge>
                          </div>

                          {/* Utilization Progress */}
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-slate-600 dark:text-slate-300">
                                Hours Allocated
                              </span>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                {member.totalHoursAllocated} / 40 hrs
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  member.utilizationPercentage > 100
                                    ? "bg-red-600"
                                    : member.utilizationPercentage >= 50
                                    ? "bg-green-600"
                                    : "bg-yellow-600"
                                }`}
                                style={{
                                  width: `${Math.min(100, member.utilizationPercentage)}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Projects */}
                          {member.projects && member.projects.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                Assigned to {member.projects.length} project(s):
                              </p>
                              <div className="space-y-2">
                                {member.projects.map((project) => (
                                  <div
                                    key={project.projectId}
                                    className="p-2 rounded bg-slate-50 dark:bg-slate-900/30 text-xs"
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {project.projectName}
                                      </span>
                                      <Badge variant="secondary" className="text-xs">
                                        {project.hoursAllocated}hrs
                                      </Badge>
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400 mt-1">
                                      {project.role && <span>Role: {project.role}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {member.projects && member.projects.length === 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                              Not assigned to any projects
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                    <p>No team members found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacity Tab */}
        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Capacity Planning</CardTitle>
              <CardDescription>
                Available capacity and allocation trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length > 0 ? (
                <div className="space-y-6">
                  {/* Overall Capacity */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h3 className="font-medium text-slate-900 dark:text-slate-50 mb-4">
                      Overall Team Capacity
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Total Capacity
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                            {teamMembers.length * 40} hours/week
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Allocated Hours
                          </span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {Math.round(
                              teamMembers.reduce((sum, m) => sum + m.totalHoursAllocated, 0)
                            )}{" "}
                            hours/week
                          </span>
                        </div>
                        <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-3">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600"
                            style={{
                              width: `${Math.min(
                                100,
                                (teamMembers.reduce((sum, m) => sum + m.totalHoursAllocated, 0) /
                                  (teamMembers.length * 40)) *
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Available Capacity
                          </span>
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            {Math.round(
                              teamMembers.length * 40 -
                              teamMembers.reduce((sum, m) => sum + m.totalHoursAllocated, 0)
                            )}{" "}
                            hours/week
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-300 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            Utilization Rate
                          </span>
                          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {Math.round(
                              (teamMembers.reduce((sum, m) => sum + m.totalHoursAllocated, 0) /
                                (teamMembers.length * 40)) *
                              100
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Recommendations
                    </h3>
                    <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      {overAllocatedMembers.length > 0 && (
                        <li>
                          • Redistribute work from {overAllocatedMembers.length} over-allocated
                          team member(s) to prevent burnout
                        </li>
                      )}
                      {underAllocatedMembers.length > 0 && (
                        <li>
                          • Consider assigning more projects to {underAllocatedMembers.length}{" "}
                          under-allocated team member(s)
                        </li>
                      )}
                      {unallocatedMembers.length > 0 && (
                        <li>
                          • {unallocatedMembers.length} team member(s) have no project assignments
                        </li>
                      )}
                      {teamMembers.reduce((sum, m) => sum + m.utilizationPercentage, 0) /
                        teamMembers.length <
                        70 && (
                        <li>
                          • Overall team utilization is below recommended level (70% target)
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
                  <p>No capacity data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
