import { ModuleLayout } from "@/components/ModuleLayout";
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
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Users, Download, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";

export default function DepartmentPayrollReports() {
  const { code: currencyCode } = useCurrencySettings();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

  // Fetch data
  const { data: departments = [] } = trpc.departments.list.useQuery();
  const { data: payrollData = [], isLoading: payrollLoading } = trpc.payroll.list.useQuery();
  const { data: employeeData = [] } = trpc.employees.list.useQuery();

  // Export mutation
  const exportPayrollMutation = trpc.payrollExport.exportPayroll.useMutation({
    onSuccess: () => {
      toast.success("Payroll export started!");
    },
    onError: (error: any) => {
      toast.error(`Export failed: ${error?.message || "Unknown error"}`);
    },
  });

  const isLoading = payrollLoading;

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  });

  const months = [
    { value: "all", label: "All Months" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Filter data based on selections
  const filteredPayroll = useMemo(() => {
    return payrollData.filter((p: any) => {
      const pYear = new Date(p.payrollDate).getFullYear().toString();
      const pMonth = String(new Date(p.payrollDate).getMonth() + 1).padStart(2, "0");
      const pDept = p.employee?.departmentId;

      let matches = pYear === selectedYear;
      if (selectedMonth !== "all") matches = matches && pMonth === selectedMonth;
      if (selectedDept !== "all") matches = matches && pDept === selectedDept;

      return matches;
    });
  }, [payrollData, selectedYear, selectedMonth, selectedDept]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalNetPay = filteredPayroll.reduce((sum: number, p: any) => sum + (p.netSalary || 0), 0);
    const totalGrossSalary = filteredPayroll.reduce((sum: number, p: any) => sum + (p.basicSalary || 0), 0);
    const totalDeductions = filteredPayroll.reduce((sum: number, p: any) => sum + (p.totalDeductions || 0), 0);
    const totalAllowances = filteredPayroll.reduce((sum: number, p: any) => sum + (p.totalAllowances || 0), 0);
    const employeeCount = new Set(filteredPayroll.map((p: any) => p.employeeId)).size;

    return {
      totalNetPay,
      totalGrossSalary,
      totalDeductions,
      totalAllowances,
      employeeCount,
      avgNetPay: employeeCount > 0 ? Math.round(totalNetPay / employeeCount) : 0,
    };
  }, [filteredPayroll]);

  // Prepare department comparison data
  const departmentComparison = useMemo(() => {
    const deptMap: Record<string, any> = {};

    filteredPayroll.forEach((p: any) => {
      const deptName = departments.find((d: any) => d.id === p.employee?.departmentId)?.departmentName || "Unassigned";
      if (!deptMap[deptName]) {
        deptMap[deptName] = {
          department: deptName,
          grossSalary: 0,
          netSalary: 0,
          deductions: 0,
          allowances: 0,
          count: 0,
        };
      }
      deptMap[deptName].grossSalary += p.basicSalary || 0;
      deptMap[deptName].netSalary += p.netSalary || 0;
      deptMap[deptName].deductions += p.totalDeductions || 0;
      deptMap[deptName].allowances += p.totalAllowances || 0;
      deptMap[deptName].count += 1;
    });

    return Object.values(deptMap);
  }, [filteredPayroll, departments]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const handleExport = () => {
    exportPayrollMutation.mutate({
      year: parseInt(selectedYear),
      departmentId: selectedDept !== "all" ? selectedDept : undefined,
      month: selectedMonth !== "all" ? selectedMonth : undefined,
      format: "excel",
    });
  };

  return (
    <ModuleLayout
      title="Department Payroll Reports"
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Reports" },
      ]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
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

            <div className="flex-1 min-w-48">
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
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

            <div className="flex-1 min-w-48">
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleExport} disabled={exportPayrollMutation.isPending} className="flex gap-2">
                <Download className="h-4 w-4" />
                {exportPayrollMutation.isPending ? "Exporting..." : "Export Excel"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            label="Total Gross Salary"
            value={<><DollarSign className="h-6 w-6 text-blue-500" /></>}
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="Total Net Pay"
            value={<><TrendingUp className="h-6 w-6 text-green-500" /></>}
            icon={<TrendingUp className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Total Deductions"
            value={<><DollarSign className="h-6 w-6 text-red-500" /></>}
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-red-500"
          />

          <StatsCard
            label="Total Allowances"
            value={<><DollarSign className="h-6 w-6 text-amber-500" /></>}
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-amber-500"
          />

          <StatsCard
            label="Employees Processed"
            value={<><Users className="h-6 w-6 text-purple-500" /> {stats.employeeCount}</>}
            icon={<Users className="h-5 w-5" />}
            color="border-l-purple-500"
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Payroll by Department</CardTitle>
                  <CardDescription>Gross salary comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  {departmentComparison.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={departmentComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend />
                        <Bar dataKey="grossSalary" fill="#3b82f6" name="Gross Salary" />
                        <Bar dataKey="netSalary" fill="#10b981" name="Net Pay" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Salary Composition */}
              <Card>
                <CardHeader>
                  <CardTitle>Salary Composition</CardTitle>
                  <CardDescription>Distribution breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.totalGrossSalary > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Net Pay", value: stats.totalNetPay },
                            { name: "Deductions", value: stats.totalDeductions },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deductions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deductions Summary</CardTitle>
                <CardDescription>PAYE, NSSF, SHIF, and other deductions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">Deduction details based on payroll data</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>YTD Payroll Summary</CardTitle>
                <CardDescription>Year-to-date overview by department</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : departmentComparison.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Employees</TableHead>
                        <TableHead className="text-right">Total Gross</TableHead>
                        <TableHead className="text-right">Total Net</TableHead>
                        <TableHead className="text-right">Total Deductions</TableHead>
                        <TableHead className="text-right">Avg Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentComparison.map((dept: any, idx: number) => (
                        <TableRow key={dept.department || `comp-${idx}`}>
                          <TableCell className="font-medium">{dept.department}</TableCell>
                          <TableCell className="text-right">{dept.count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dept.grossSalary)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dept.netSalary)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dept.deductions)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(dept.netSalary / (dept.count || 1))}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-gray-50">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{stats.employeeCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(stats.totalGrossSalary)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(stats.totalNetPay)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(stats.totalDeductions)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(stats.avgNetPay)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No payroll data found for the selected criteria</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
