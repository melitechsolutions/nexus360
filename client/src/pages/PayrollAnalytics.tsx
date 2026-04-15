import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/ui/stats-card";

interface PayrollAnalyticsData {
  month: string;
  totalPayroll: number;
  averageSalary: number;
  employeeCount: number;
  departmentWise: { name: string; amount: number }[];
  salaryDistribution: { range: string; count: number }[];
  trend: { month: string; payroll: number; employees: number }[];
}

export default function PayrollAnalytics() {
  const [, navigate] = useLocation();
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedMonth, setSelectedMonth] = useState("12");

  const { data: rawPayroll = [] } = trpc.payroll.list.useQuery({});
  const payrollList = JSON.parse(JSON.stringify(rawPayroll)) as any[];

  // Compute analytics from real payroll data
  const analyticsData = useMemo(() => {
    const totalPayroll = payrollList.reduce((s, r) => s + (r.netSalary || 0), 0);
    const uniqueEmployees = new Set(payrollList.map((r) => r.employeeId)).size;
    const averageSalary = uniqueEmployees > 0 ? Math.round(totalPayroll / uniqueEmployees) : 0;

    // Department-wise
    const deptMap: Record<string, number> = {};
    for (const r of payrollList) {
      const dept = r.department || "Other";
      deptMap[dept] = (deptMap[dept] || 0) + (r.netSalary || 0);
    }
    const departmentWise = Object.entries(deptMap).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

    // Salary distribution
    const ranges = [
      { range: "0-30K", min: 0, max: 30000, count: 0 },
      { range: "30K-50K", min: 30000, max: 50000, count: 0 },
      { range: "50K-80K", min: 50000, max: 80000, count: 0 },
      { range: "80K+", min: 80000, max: Infinity, count: 0 },
    ];
    const empSalary: Record<string, number> = {};
    for (const r of payrollList) {
      if (r.employeeId && !empSalary[r.employeeId]) empSalary[r.employeeId] = r.netSalary || 0;
    }
    for (const sal of Object.values(empSalary)) {
      for (const rng of ranges) {
        if (sal >= rng.min && sal < rng.max) { rng.count++; break; }
      }
    }
    const salaryDistribution = ranges.map(({ range, count }) => ({ range, count }));

    // Monthly trend from actual records
    const monthMap: Record<string, { payroll: number; emps: Set<string> }> = {};
    for (const r of payrollList) {
      const m = r.month || (r.payPeriodStart ? r.payPeriodStart.substring(0, 7) : "Unknown");
      if (!monthMap[m]) monthMap[m] = { payroll: 0, emps: new Set() };
      monthMap[m].payroll += r.netSalary || 0;
      if (r.employeeId) monthMap[m].emps.add(r.employeeId);
    }
    const trend = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { payroll, emps }]) => ({ month, payroll, employees: emps.size }));

    return { month: `${selectedYear}-${selectedMonth}`, totalPayroll, averageSalary, employeeCount: uniqueEmployees, departmentWise, salaryDistribution, trend };
  }, [payrollList, selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    const prevMonthPayroll = analyticsData.trend[analyticsData.trend.length - 2]?.payroll || 0;
    const currentPayroll = analyticsData.totalPayroll;
    const payrollChange =
      prevMonthPayroll > 0 ? ((currentPayroll - prevMonthPayroll) / prevMonthPayroll) * 100 : 0;

    return {
      totalPayroll: analyticsData.totalPayroll,
      averageSalary: analyticsData.averageSalary,
      employeeCount: analyticsData.employeeCount,
      payrollChange,
      costPerDay: Math.round(analyticsData.totalPayroll / 30),
    };
  }, [analyticsData.totalPayroll, analyticsData.averageSalary, analyticsData.employeeCount]);

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <ModuleLayout
      title="Payroll Analytics"
      description="View payroll trends, department-wise breakdown, and salary distribution"
      icon={<BarChart3 className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Analytics" },
      ]}
      backLink={{ label: "Payroll", href: "/payroll" }}
    >
      <div className="space-y-6">
        {/* Period Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-[150px]">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[200px]">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Payroll</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">Ksh {stats.totalPayroll.toLocaleString()}</p>
                <div className="flex items-center gap-1">
                  {stats.payrollChange >= 0 ? (
                    <>
                      <ArrowUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">+{stats.payrollChange.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600">{stats.payrollChange.toFixed(1)}%</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <StatsCard
            label="Average Salary"
            value={<>Ksh {stats.averageSalary.toLocaleString()}</>}
            description="Per employee/month"
            color="border-l-orange-500"
          />

          <StatsCard label="Employees" value={stats.employeeCount} description="On payroll" color="border-l-purple-500" />

          <StatsCard
            label="Cost Per Day"
            value={<>Ksh {stats.costPerDay.toLocaleString()}</>}
            description="Average daily cost"
            color="border-l-green-500"
          />

          <StatsCard label="Monthly Budget" value="Ksh 2.8M" description="Remaining: Ksh 350K" color="border-l-blue-500" />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Payroll Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Payroll Trend (YTD)</CardTitle>
              <CardDescription>Monthly payroll expense over the year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `Ksh ${value.toLocaleString()}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="payroll"
                    stroke="#3B82F6"
                    name="Payroll"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Employee Count Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Growth (YTD)</CardTitle>
              <CardDescription>Head count trends throughout the year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="employees" fill="#10B981" name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department-wise Payroll */}
          <Card>
            <CardHeader>
              <CardTitle>Department-wise Payroll</CardTitle>
              <CardDescription>Current month breakdown by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.departmentWise}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: Ksh ${(value / 1000).toFixed(0)}K`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {analyticsData.departmentWise.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `Ksh ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Salary Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Distribution</CardTitle>
              <CardDescription>Number of employees in each salary range</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.salaryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F59E0B" name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Department Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Department Summary</CardTitle>
            <CardDescription>Detailed breakdown by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.departmentWise.map((dept, idx) => {
                const percentage = ((dept.amount / analyticsData.totalPayroll) * 100).toFixed(1);
                const avgDeptSalary = Math.round(dept.amount / 12); // Simulated average
                return (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-sm text-gray-500">Avg: Ksh {avgDeptSalary.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Ksh {dept.amount.toLocaleString()}</p>
                      <Badge variant="outline">{percentage}%</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900">
            <p>
              ✓ Total payroll has increased by <strong>{stats.payrollChange.toFixed(1)}%</strong> from
              previous month, primarily due to {stats.employeeCount > 59 ? "new hires" : "salary adjustments"}.
            </p>
            <p>
              ✓ <strong>Sales Department</strong> consumes the highest payroll at{" "}
              <strong>{((analyticsData.departmentWise[0].amount / analyticsData.totalPayroll) * 100).toFixed(1)}%</strong>
              .
            </p>
            <p>
              ✓ Average salary range of <strong>40K-50K</strong> covers the majority (
              <strong>{analyticsData.salaryDistribution[1].count}</strong>) of employees.
            </p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
