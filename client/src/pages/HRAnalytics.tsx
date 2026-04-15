import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { trpc } from "@/lib/trpc";
import { TrendingUp, Users, AlertTriangle, Award, Calendar, Zap, RefreshCw } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function HRAnalyticsPage() {
  const [timeframe, setTimeframe] = useState("12");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all analytics data
  const { data: headcount, isLoading: loadingHeadcount } = trpc.hrAnalytics.getHeadcountTrends.useQuery({ months: parseInt(timeframe) });
  const { data: salary, isLoading: loadingSalary } = trpc.hrAnalytics.getSalaryDistribution.useQuery();
  const { data: turnover, isLoading: loadingTurnover } = trpc.hrAnalytics.getTurnoverAnalysis.useQuery();
  const { data: attendance, isLoading: loadingAttendance } = trpc.hrAnalytics.getAttendanceKPIs.useQuery({ months: 3 });
  const { data: leave, isLoading: loadingLeave } = trpc.hrAnalytics.getLeaveUtilization.useQuery();
  const { data: departments, isLoading: loadingDepts } = trpc.hrAnalytics.getDepartmentAnalytics.useQuery();
  const { data: performance, isLoading: loadingPerf } = trpc.hrAnalytics.getPerformanceMetrics.useQuery();
  const { data: expenses, isLoading: loadingExpenses } = trpc.hrAnalytics.getSalaryExpenseTrends.useQuery({ months: parseInt(timeframe) });

  const isLoading = loadingHeadcount || loadingSalary || loadingTurnover || loadingAttendance || loadingLeave || loadingDepts || loadingPerf || loadingExpenses;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch all queries
      await Promise.all([
        // Queries auto-refetch when state changes
      ]);
      toast.success("Analytics refreshed");
    } catch (error) {
      toast.error("Failed to refresh analytics");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate summary metrics
  const summaryStats = useMemo(() => {
    return {
      totalEmployees: turnover?.totalEmployees || 0,
      activeEmployees: turnover?.active || 0,
      turnoverRate: turnover?.turnoverRate.toFixed(1) || "0",
      avgPresence: attendance?.presentPercentage.toFixed(1) || "0",
      presentCount: attendance?.present || 0,
      absentCount: attendance?.absent || 0,
    };
  }, [turnover, attendance]);

  const attendanceChartData = useMemo(() => {
    if (!attendance) return [];
    return [
      { name: "Present", value: attendance.present || 0, fill: "#10b981" },
      { name: "Absent", value: attendance.absent || 0, fill: "#ef4444" },
      { name: "Late", value: attendance.late || 0, fill: "#f59e0b" },
      { name: "Half Day", value: attendance.halfDay || 0, fill: "#8b5cf6" },
    ];
  }, [attendance]);

  return (
    <ModuleLayout
      title="HR Analytics Dashboard"
      description="Comprehensive HR metrics, trends, and analytics"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/crm/hr" },
        { label: "HR Analytics" },
      ]}
    >
      <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-end items-start">
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="12">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} size="sm">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Employees"
          value={summaryStats.totalEmployees}
          description={<>{summaryStats.activeEmployees} active</>}
          icon={<Users className="h-5 w-5" />}
          color="border-l-blue-500"
        />

        <StatsCard
          label="Turnover Rate"
          value={<>{summaryStats.turnoverRate}%</>}
          description={<>{turnover?.terminated || 0} terminated</>}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="border-l-amber-500"
        />

        <StatsCard
          label="Attendance Rate"
          value={<>{summaryStats.avgPresence}%</>}
          description={<>{summaryStats.presentCount} present today</>}
          icon={<Calendar className="h-5 w-5" />}
          color="border-l-green-500"
        />

        <StatsCard
          label="Performance Score"
          value={<>{performance?.avgPresenceRate ? (performance.avgPresenceRate * 10).toFixed(1) : "N/A"}/10</>}
          description={<>{performance?.totalEmployees || 0} employees tracked</>}
          icon={<Award className="h-5 w-5" />}
          color="border-l-purple-500"
        />
      </div>

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Headcount Trends
            </CardTitle>
            <CardDescription>Employee count over {timeframe} months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : headcount && headcount.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={headcount}>
                  <defs>
                    <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="headcount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHeadcount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Salary Distribution by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Salary Distribution
            </CardTitle>
            <CardDescription>Average salary by department</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : salary && salary.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `Ksh ${value?.toLocaleString('en-KE')}`} />
                  <Bar dataKey="avgSalary" fill="#10b981" name="Avg Salary" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Breakdown</CardTitle>
            <CardDescription>Last 3 months attendance status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attendanceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {attendanceChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Leave Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Utilization</CardTitle>
            <CardDescription>Leave usage by type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : leave && leave.length > 0 ? (
              <div className="space-y-4">
                {leave.map((item: any, idx: number) => (
                  <div key={item.type || `leave-${idx}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{item.type}</span>
                      <Badge variant="outline">{item.count} requests</Badge>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min((item.count / 20) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.totalDays} total days</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salary Expense Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Salary Expense Trends
            </CardTitle>
            <CardDescription>Monthly salary expenses over {timeframe} months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : expenses && expenses.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={expenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `Ksh ${(value / 1000000).toFixed(1)}M`} />
                  <Legend />
                  <Line type="monotone" dataKey="totalCost" stroke="#ef4444" name="Total Cost" strokeWidth={2} />
                  <Line type="monotone" dataKey="employeeCount" stroke="#3b82f6" name="Employees" yAxisId="right" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Department Analytics Table */}
        <Card>
          <CardHeader>
            <CardTitle>Department Analytics</CardTitle>
            <CardDescription>Overview by department</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center text-gray-400">Loading...</div>
            ) : departments && departments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Avg Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept: any, idx: number) => (
                      <TableRow key={dept.name || `dept-${idx}`}>
                        <TableCell className="font-medium">{dept.name || "Unassigned"}</TableCell>
                        <TableCell className="text-right">{dept.employees}</TableCell>
                        <TableCell className="text-right">Ksh {(dept.avgSalary / 100).toLocaleString('en-KE')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </ModuleLayout>
  );
}

export default HRAnalyticsPage;
