import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
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
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, TrendingUp, DollarSign, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";

export default function HRAnalyticsDashboard() {
  const { code: currencyCode } = useCurrencySettings();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const utils = trpc.useUtils();

  // Fetch analytics data
  const { data: headcountTrends = [] } = trpc.hrAnalytics.getHeadcountTrends.useQuery({ months: 12 });
  const { data: salaryDistribution = [] } = trpc.hrAnalytics.getSalaryDistribution.useQuery();
  const { data: turnoverAnalysis = [] } = trpc.hrAnalytics.getTurnoverAnalysis.useQuery();
  const { data: attendancePatterns = [] } = trpc.hrAnalytics.getAttendancePatterns.useQuery();
  const { data: leaveUtilization = [] } = trpc.hrAnalytics.getLeaveUtilization.useQuery();
  const { data: performanceMetrics = [] } = trpc.hrAnalytics.getPerformanceMetrics.useQuery();

  // Fetch department list for filter
  const { data: departments = [] } = trpc.departments.list.useQuery();
  const { data: employees = [], isLoading: employeesLoading } = trpc.employees.list.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate summary statistics
  const stats = useMemo(() => {
    const activeEmployees = employees.filter((e: any) => e.isActive || e.isActive !== 0).length;
    const avgSalary =
      salaryDistribution.length > 0
        ? Math.round(salaryDistribution.reduce((sum: number, dept: any) => sum + (dept.avgSalary || 0), 0) / salaryDistribution.length)
        : 0;
    const avgAttendance =
      attendancePatterns.length > 0
        ? Math.round(attendancePatterns.reduce((sum: number, p: any) => sum + (p.attendanceRate || 0), 0) / attendancePatterns.length)
        : 0;
    const avgLeaveUtilized =
      leaveUtilization.length > 0
        ? Math.round(leaveUtilization.reduce((sum: number, l: any) => sum + (l.utilized || 0), 0) / leaveUtilization.length)
        : 0;

    return {
      activeEmployees,
      avgSalary,
      avgAttendance,
      avgLeaveUtilized,
      totalDepartments: departments.length,
    };
  }, [employees, salaryDistribution, attendancePatterns, leaveUtilization, departments]);

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  });

  return (
    <ModuleLayout
      title="HR Analytics Dashboard"
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Analytics" },
      ]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Fiscal Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.departmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { utils.hrAnalytics.invalidate(); utils.departments.invalidate(); utils.employees.invalidate(); toast.success("Data refreshed"); }}>Refresh Data</Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            label="Total Employees"
            value={<><Users className="h-6 w-6 text-blue-500" /> {stats.activeEmployees}</>}
            description="Active staff"
            icon={<Users className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard label="Departments" value={stats.totalDepartments} description="Organizational units" color="border-l-purple-500" />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Salary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(stats.avgSalary)}</p>
            </CardContent>
          </Card>

          <StatsCard
            label="Attendance Rate"
            value={<><Calendar className="h-6 w-6 text-amber-500" /> {stats.avgAttendance}%</>}
            description="Average across staff"
            icon={<Calendar className="h-5 w-5" />}
            color="border-l-amber-500"
          />

          <StatsCard
            label="Leave Utilization"
            value={<><TrendingUp className="h-6 w-6 text-purple-500" /> {stats.avgLeaveUtilized}%</>}
            description="Days used from allocation"
            icon={<TrendingUp className="h-5 w-5" />}
            color="border-l-purple-500"
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Headcount Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Headcount Trends</CardTitle>
                  <CardDescription>Year {selectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  {headcountTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={headcountTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="headcount" stroke="#3b82f6" strokeWidth={2} name="Total Headcount" />
                        <Line type="monotone" dataKey="newHires" stroke="#10b981" strokeWidth={2} name="New Hires" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Turnover Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Turnover Trends</CardTitle>
                  <CardDescription>Employees joined/left</CardDescription>
                </CardHeader>
                <CardContent>
                  {turnoverAnalysis.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={turnoverAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="joined" fill="#10b981" name="Joined" />
                        <Bar dataKey="left" fill="#ef4444" name="Left" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Salary Distribution by Department */}
              <Card>
                <CardHeader>
                  <CardTitle>Salary Distribution by Department</CardTitle>
                  <CardDescription>Average salary per department</CardDescription>
                </CardHeader>
                <CardContent>
                  {salaryDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salaryDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Bar dataKey="avgSalary" fill="#3b82f6" name="Avg Salary" />
                        <Bar dataKey="maxSalary" fill="#10b981" name="Max Salary" />
                        <Bar dataKey="minSalary" fill="#ef4444" name="Min Salary" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Department Headcount Pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Headcount by Department</CardTitle>
                  <CardDescription>Distribution of employees</CardDescription>
                </CardHeader>
                <CardContent>
                  {salaryDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={salaryDistribution}
                          dataKey="employeeCount"
                          nameKey="department"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ department, percent }) => `${department} ${(percent * 100).toFixed(0)}%`}
                        >
                          {salaryDistribution.map((data: any, index: number) => (
                            <Cell key={`${data.department}-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} employees`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Department Salary Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Department Salary Summary</CardTitle>
                <CardDescription>Detailed salary statistics by department</CardDescription>
              </CardHeader>
              <CardContent>
                {salaryDistribution.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Employees</TableHead>
                        <TableHead className="text-right">Avg Salary</TableHead>
                        <TableHead className="text-right">Min Salary</TableHead>
                        <TableHead className="text-right">Max Salary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaryDistribution.map((dept: any, idx: number) => (
                        <TableRow key={dept.department || `dept-${idx}`}>
                          <TableCell className="font-medium">{dept.department}</TableCell>
                          <TableCell className="text-right">{dept.employeeCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dept.avgSalary)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dept.minSalary)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dept.maxSalary)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Patterns</CardTitle>
                  <CardDescription>Monthly attendance rates</CardDescription>
                </CardHeader>
                <CardContent>
                  {attendancePatterns.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={attendancePatterns}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Legend />
                        <Line type="monotone" dataKey="attendanceRate" stroke="#10b981" strokeWidth={2} name="Attendance %" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Leave Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave Utilization</CardTitle>
                  <CardDescription>Annual leave balance breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {leaveUtilization.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={leaveUtilization}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="leaveType" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="allocated" fill="#3b82f6" name="Allocated" />
                        <Bar dataKey="utilized" fill="#f59e0b" name="Utilized" />
                        <Bar dataKey="balance" fill="#10b981" name="Balance" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Employee performance distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceMetrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={performanceMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tier" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value} employees`} />
                      <Legend />
                      <Bar dataKey="count" fill="#8b5cf6" name="Employee Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
