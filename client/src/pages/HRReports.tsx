import { useState, useMemo, useCallback } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCurrencySettings } from "@/lib/currency";
import { Users, DollarSign, Calendar, TrendingUp, Briefcase, AlertCircle } from "lucide-react";

export default function HRReports() {
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const { symbol, position } = useCurrencySettings();

  // Fetch HR data
  const { data: employees = [] } = trpc.employees.list.useQuery({});
  const { data: leaves = [] } = trpc.leaves.list.useQuery({});
  const { data: payslips = [] } = trpc.payroll.list.useQuery({});
  const { data: attendance = [] } = trpc.attendance.list.useQuery({});

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2].map(String);

  const fmt = useCallback((amount: number) => {
    const value = amount / 100;
    if (position === "prefix") return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${symbol}`;
  }, [symbol, position]);

  // Filter data by year
  const filteredPayslips = useMemo(() => {
    return payslips.filter((ps: any) => {
      const date = new Date(ps.payDate || ps.createdAt);
      return date.getFullYear() === Number(yearFilter);
    });
  }, [payslips, yearFilter]);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l: any) => {
      const date = new Date(l.startDate || l.createdAt);
      return date.getFullYear() === Number(yearFilter);
    });
  }, [leaves, yearFilter]);

  // Key Metrics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e: any) => e.status === "active").length;
  const totalPayroll = useMemo(
    () => filteredPayslips.reduce((sum: number, ps: any) => sum + (ps.netSalary || 0), 0),
    [filteredPayslips]
  );
  const avgEmployeeSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0;

  // Leave data by type
  const leavesByType = useMemo(() => {
    const typeMap: Record<string, number> = {};
    filteredLeaves.forEach((l: any) => {
      const type = l.type || "other";
      typeMap[type] = (typeMap[type] || 0) + 1;
    });

    return Object.entries(typeMap).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));
  }, [filteredLeaves]);

  // Department distribution
  const departmentDistribution = useMemo(() => {
    const deptMap: Record<string, number> = {};
    employees.forEach((e: any) => {
      const dept = e.department || "unassigned";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    return Object.entries(deptMap).map(([dept, count]) => ({
      name: dept.charAt(0).toUpperCase() + dept.slice(1),
      value: count,
    }));
  }, [employees]);

  // Attendance trend
  const attendanceTrend = useMemo(() => {
    const monthMap: Record<string, { present: number; absent: number; late: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 12; i++) {
      const month = monthNames[i];
      monthMap[month] = { present: 0, absent: 0, late: 0 };
    }

    attendance.forEach((att: any) => {
      const date = new Date(att.date || att.createdAt);
      if (date.getFullYear() === Number(yearFilter)) {
        const month = monthNames[date.getMonth()];
        if (att.status === "present") monthMap[month].present += 1;
        else if (att.status === "absent") monthMap[month].absent += 1;
        else if (att.status === "late") monthMap[month].late += 1;
      }
    });

    return Object.entries(monthMap).map(([month, data]) => ({
      month,
      present: data.present,
      absent: data.absent,
      late: data.late,
    }));
  }, [attendance, yearFilter]);

  // Payroll trend
  const payrollTrend = useMemo(() => {
    const monthMap: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 12; i++) {
      monthMap[monthNames[i]] = 0;
    }

    filteredPayslips.forEach((ps: any) => {
      const date = new Date(ps.payDate || ps.createdAt);
      const month = monthNames[date.getMonth()];
      monthMap[month] += (ps.netSalary || 0);
    });

    return Object.entries(monthMap).map(([month, total]) => ({
      month,
      payroll: Math.round(total / 100),
    }));
  }, [filteredPayslips]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <ModuleLayout title="HR Reports">
      <div className="max-w-7xl mx-auto">
        {/* Year Filter */}
        <div className="flex gap-4 mb-6">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Employees"
            value={totalEmployees.toString()}
            icon={<Users className="h-4 w-4" />}
            trend={activeEmployees}
            trendLabel="active"
          />
          <StatsCard
            title="Active Employees"
            value={activeEmployees.toString()}
            icon={<TrendingUp className="h-4 w-4" />}
            trend={Math.round((activeEmployees / totalEmployees) * 100) || 0}
            trendLabel="% active"
          />
          <StatsCard
            title="Total Payroll"
            value={fmt(totalPayroll)}
            icon={<DollarSign className="h-4 w-4" />}
            trend={filteredPayslips.length}
            trendLabel="payslips"
          />
          <StatsCard
            title="Avg Salary"
            value={fmt(avgEmployeeSalary)}
            icon={<Briefcase className="h-4 w-4" />}
            trend={0}
            trendLabel="per employee"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Departments */}
          <Card>
            <CardHeader>
              <CardTitle>Employees by Department</CardTitle>
              <CardDescription>Department distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {departmentDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leave Types */}
          <Card>
            <CardHeader>
              <CardTitle>Leaves by Type</CardTitle>
              <CardDescription>Leave usage in {yearFilter}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leavesByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leavesByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Trend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Monthly attendance summary in {yearFilter}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" />
                <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Late" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payroll Trend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payroll Trend</CardTitle>
            <CardDescription>Monthly payroll expenses in {yearFilter}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={payrollTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => fmt(value * 100)}
                  contentStyle={{ backgroundColor: "rgba(0, 0, 0, 0.8)", border: "none", borderRadius: "8px" }}
                />
                <Bar dataKey="payroll" fill="#3b82f6" name="Payroll" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employees List</CardTitle>
            <CardDescription>All employees</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.slice(0, 10).map((emp: any) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell>{emp.department || "N/A"}</TableCell>
                    <TableCell>{emp.position || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={emp.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}>
                        {emp.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>{emp.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
