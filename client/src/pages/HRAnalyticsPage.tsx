import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { BarChart3,  TrendingUp, Users, UserCheck, Briefcase, Calendar } from "lucide-react";
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
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function HRAnalyticsPage() {
  const { code: currencyCode } = useCurrencySettings();
  const [selectedDept, setSelectedDept] = useState<string>("");

  // Fetch all analytics data
  const { data: headcountTrends } = trpc.hrAnalytics.getHeadcountTrends.useQuery();
  const { data: salaryDistribution } = trpc.hrAnalytics.getSalaryDistribution.useQuery();
  const { data: turnoverAnalysis } = trpc.hrAnalytics.getTurnoverAnalysis.useQuery();
  const { data: attendanceKPIs } = trpc.hrAnalytics.getAttendanceKPIs.useQuery();
  const { data: leaveUtilization } = trpc.hrAnalytics.getLeaveUtilization.useQuery();
  const { data: departmentAnalytics } = trpc.hrAnalytics.getDepartmentAnalytics.useQuery();
  const { data: performanceMetrics } = trpc.hrAnalytics.getPerformanceMetrics.useQuery();
  const { data: salaryExpenseTrends } = trpc.hrAnalytics.getSalaryExpenseTrends.useQuery();

  return (
    <ModuleLayout
      title="HR Analytics"
      icon={<BarChart3 className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "HR" }, { label: "HR Analytics" }]}
    >
      <div className="flex justify-between items-center">
        </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Employees"
          value={performanceMetrics?.totalEmployees || 0}
          icon={<Users className="h-5 w-5" />}
          color="border-l-blue-500"
        />

        <StatsCard
          label="Active Employees"
          value={turnoverAnalysis?.active || 0}
          icon={<UserCheck className="h-5 w-5" />}
          color="border-l-green-500"
        />

        <StatsCard
          label="Turnover Rate"
          value={<>{(turnoverAnalysis?.turnoverRate || 0).toFixed(1)}%</>}
          icon={<TrendingUp className="h-5 w-5" />}
          color="border-l-orange-500"
        />

        <StatsCard
          label="Avg Attendance"
          value={<>{(attendanceKPIs?.presentPercentage || 0).toFixed(1)}%</>}
          icon={<Calendar className="h-5 w-5" />}
          color="border-l-purple-500"
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="headcount" className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="headcount">Headcount</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="turnover">Turnover</TabsTrigger>
        </TabsList>

        {/* Headcount Trends */}
        <TabsContent value="headcount">
          <Card>
            <CardHeader>
              <CardTitle>Headcount Trend (Last 12 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={headcountTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="headcount" stroke="#3b82f6" name="Total Headcount" />
                  <Line type="monotone" dataKey="newHires" stroke="#10b981" name="New Hires" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Distribution */}
        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salary Distribution by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salaryDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip formatter={(value) => `Ksh ${(value / 100000).toFixed(2)}M`} />
                  <Legend />
                  <Bar dataKey="avgSalary" fill="#3b82f6" name="Avg Salary" />
                  <Bar dataKey="minSalary" fill="#f59e0b" name="Min Salary" />
                  <Bar dataKey="maxSalary" fill="#ef4444" name="Max Salary" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Salary Expense Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salaryExpenseTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `Ksh ${(value / 1000000).toFixed(1)}M`} />
                  <Legend />
                  <Line type="monotone" dataKey="totalCost" stroke="#ef4444" name="Total Monthly Cost" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Patterns */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Patterns (Last 3 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Present", value: attendanceKPIs?.present || 0 },
                      { name: "Absent", value: attendanceKPIs?.absent || 0 },
                      { name: "Late", value: attendanceKPIs?.late || 0 },
                      { name: "Half Day", value: attendanceKPIs?.halfDay || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color) => (
                      <Cell key={color} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Utilization */}
        <TabsContent value="leave">
          <Card>
            <CardHeader>
              <CardTitle>Leave Utilization by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(leaveUtilization || []).map((leave: any, idx: number) => (
                  <div key={leave.type || `leave-${idx}`} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{leave.type}</span>
                      <span className="text-sm text-gray-500">{leave.count} requests</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Days Used: {leave.totalDays}</span>
                      <span>Avg Duration: {leave.avgDuration} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Analytics */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>Department Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(departmentAnalytics || []).map((dept: any, idx: number) => (
                  <div key={dept.name || `dept-${idx}`} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{dept.name}</span>
                      <span className="text-sm text-gray-500">{dept.employees} employees</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Avg Salary: {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: currencyCode,
                      }).format(dept.avgSalary)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Turnover Analysis */}
        <TabsContent value="turnover">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Active", value: turnoverAnalysis?.active || 0 },
                        { name: "Inactive", value: turnoverAnalysis?.inactive || 0 },
                        { name: "On Leave", value: turnoverAnalysis?.onLeave || 0 },
                        { name: "Terminated", value: turnoverAnalysis?.terminated || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color) => (
                        <Cell key={color} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Turnover Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-500">Total Employees</p>
                  <p className="text-2xl font-bold">{turnoverAnalysis?.totalEmployees || 0}</p>
                </div>
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-green-600">{turnoverAnalysis?.active || 0}</p>
                </div>
                <div className="border-b pb-3">
                  <p className="text-sm text-gray-500">Terminated</p>
                  <p className="text-2xl font-bold text-red-600">{turnoverAnalysis?.terminated || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Turnover Rate</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(turnoverAnalysis?.turnoverRate || 0).toFixed(2)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
