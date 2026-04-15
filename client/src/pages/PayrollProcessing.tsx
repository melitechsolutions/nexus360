import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { exportToCsv } from "@/utils/exportCsv";

interface PayrollProcessingSummary {
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  processedCount: number;
  averageSalary: number;
  status: "idle" | "processing" | "completed" | "error";
}

export default function PayrollProcessing() {
  const [, navigate] = useLocation();
  const [payMonth, setPayMonth] = useState<string>("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSummary, setProcessingSummary] = useState<PayrollProcessingSummary | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const { data: rawEmployees = [] } = trpc.employees.list.useQuery();
  const { data: rawPayrollData = [] } = trpc.payroll.list.useQuery();
  const employees = JSON.parse(JSON.stringify(rawEmployees));
  const payrollData: any[] = JSON.parse(JSON.stringify(rawPayrollData));

  const createPayroll = trpc.payroll.create.useMutation({
    onSuccess: () => toast.success("Payroll record created"),
    onError: (e) => toast.error(e.message || "Failed to create payroll record"),
  });

  // Map employees to their latest payroll records (real data)
  const payrollByEmployee = new Map<string, any>();
  payrollData.forEach((p: any) => {
    const existing = payrollByEmployee.get(p.employeeId);
    if (!existing || (p.createdAt && existing.createdAt && p.createdAt > existing.createdAt)) {
      payrollByEmployee.set(p.employeeId, p);
    }
  });

  const employeePayroll = employees.map((emp: any) => {
    const pr = payrollByEmployee.get(emp.id);
    return {
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      department: emp.department,
      basicSalary: pr?.basicSalary || 0,
      allowances: pr?.allowances || 0,
      deductions: pr?.deductions || 0,
      netSalary: pr?.netSalary || 0,
    };
  });

  const filteredPayroll = payMonth
    ? employeePayroll.filter((emp) =>
        payrollData.some(
          (p: any) =>
            p.employeeId === emp.id &&
            (p.month || p.payPeriodStart)?.toString().startsWith(payMonth)
        )
      )
    : employeePayroll;

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEmployeeIds(new Set(filteredPayroll.map((emp) => emp.id)));
    } else {
      setSelectedEmployeeIds(new Set());
    }
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    const newSet = new Set(selectedEmployeeIds);
    if (checked) {
      newSet.add(employeeId);
    } else {
      newSet.delete(employeeId);
    }
    setSelectedEmployeeIds(newSet);
  };

  const handleProcessPayroll = async () => {
    if (!payMonth) {
      toast.error("Please select a pay month");
      return;
    }

    if (selectedEmployeeIds.size === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    setIsProcessing(true);

    try {
      const selectedRecords = employeePayroll.filter((emp: any) =>
        selectedEmployeeIds.has(emp.id)
      );

      // Create payroll records for each selected employee
      for (const emp of selectedRecords) {
        await createPayroll.mutateAsync({
          employeeId: emp.id,
          month: payMonth,
          basicSalary: emp.basicSalary,
          allowances: emp.allowances,
          deductions: emp.deductions,
          netSalary: emp.netSalary,
          status: "processed",
        });
      }

      const totalGross = selectedRecords.reduce((sum: number, emp: any) => sum + (emp.basicSalary + emp.allowances), 0);
      const totalDeductions = selectedRecords.reduce((sum: number, emp: any) => sum + emp.deductions, 0);
      const totalNet = selectedRecords.reduce((sum: number, emp: any) => sum + emp.netSalary, 0);

      setProcessingSummary({
        totalEmployees: selectedRecords.length,
        totalGrossSalary: totalGross,
        totalDeductions: totalDeductions,
        totalNetSalary: totalNet,
        processedCount: selectedRecords.length,
        averageSalary: selectedRecords.length > 0 ? Math.floor(totalNet / selectedRecords.length) : 0,
        status: "completed",
      });

      setPayrollRecords(selectedRecords);
      toast.success(`Payroll processed for ${selectedRecords.length} employees!`);
    } catch (e) {
      toast.error("Payroll processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetProcessing = () => {
    setProcessingSummary(null);
    setPayrollRecords([]);
    setSelectedEmployeeIds(new Set());
    setSelectAll(false);
  };

  const totalSelected = selectedEmployeeIds.size;
  const totalGrossSelected = employeePayroll
    .filter((emp) => selectedEmployeeIds.has(emp.id))
    .reduce((sum, emp) => sum + (emp.basicSalary + emp.allowances), 0);

  return (
    <ModuleLayout
      title="Payroll Processing"
      description="Process and finalize payroll for selected employees"
      icon={<Play className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Processing" },
      ]}
      backLink={{ label: "Payroll", href: "/payroll" }}
    >
      <div className="space-y-6">
        {!processingSummary ? (
          <>
            {/* Payment Month Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Pay Month</CardTitle>
                <CardDescription>Choose the month for payroll processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs">
                  <Label htmlFor="payMonth">Pay Month *</Label>
                  <Input
                    id="payMonth"
                    type="month"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selection Summary */}
            {payMonth && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="selection" className="w-full">
                    <TabsList>
                      <TabsTrigger value="selection">
                        Employee Selection ({totalSelected})
                      </TabsTrigger>
                      <TabsTrigger value="preview">
                        Financial Preview
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="selection" className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="selectAll"
                            checked={selectAll && filteredPayroll.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                          <Label htmlFor="selectAll" className="font-medium">
                            Select All ({filteredPayroll.length})
                          </Label>
                        </div>
                        <span className="text-sm text-gray-600">
                          {totalSelected} selected
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={selectAll && filteredPayroll.length > 0}
                                  onCheckedChange={handleSelectAll}
                                />
                              </TableHead>
                              <TableHead>Employee</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Basic Salary</TableHead>
                              <TableHead>Allowances</TableHead>
                              <TableHead>Deductions</TableHead>
                              <TableHead>Net Salary</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPayroll.map((emp) => (
                              <TableRow key={emp.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedEmployeeIds.has(emp.id)}
                                    onCheckedChange={(checked) =>
                                      handleSelectEmployee(emp.id, checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {emp.firstName} {emp.lastName}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {emp.department}
                                </TableCell>
                                <TableCell>{emp.basicSalary.toLocaleString()}</TableCell>
                                <TableCell className="text-green-600">
                                  +{emp.allowances.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-red-600">
                                  -{emp.deductions.toLocaleString()}
                                </TableCell>
                                <TableCell className="font-bold">
                                  {emp.netSalary.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                              Employees Selected
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-3xl font-bold">{totalSelected}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                              Total Gross Salary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-3xl font-bold">
                              Ksh {totalGrossSelected.toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Review the payroll details carefully before processing. Once processed,
                          payroll cannot be undone without approval from a manager.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={handleProcessPayroll}
                      disabled={isProcessing || totalSelected === 0}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Process Payroll
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Processing Results */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  Payroll Processed Successfully
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-800 mb-4">
                  Payroll has been processed and is ready for approval and payment.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold">{processingSummary.totalEmployees}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Gross Salary</p>
                    <p className="text-2xl font-bold">
                      Ksh {processingSummary.totalGrossSalary.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Deductions</p>
                    <p className="text-2xl font-bold">
                      Ksh {processingSummary.totalDeductions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Net Salary</p>
                    <p className="text-2xl font-bold text-green-700">
                      Ksh {processingSummary.totalNetSalary.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Salary</p>
                    <p className="text-2xl font-bold">
                      Ksh {processingSummary.averageSalary.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Processed Payroll Table */}
            <Card>
              <CardHeader>
                <CardTitle>Processed Payroll Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRecords.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">
                            {emp.firstName} {emp.lastName}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {emp.department}
                          </TableCell>
                          <TableCell>{emp.basicSalary.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">
                            +{emp.allowances.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-red-600">
                            -{emp.deductions.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-bold">
                            {emp.netSalary.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800">Processed</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (!payrollRecords.length) {
                        toast.info("No payroll records available to export");
                        return;
                      }
                      exportToCsv(`payroll-${payMonth || "report"}`, payrollRecords, [
                        { key: "firstName", label: "First Name" },
                        { key: "lastName", label: "Last Name" },
                        { key: "department", label: "Department" },
                        { key: "basicSalary", label: "Basic Salary" },
                        { key: "allowances", label: "Allowances" },
                        { key: "deductions", label: "Deductions" },
                        { key: "netSalary", label: "Net Salary" },
                      ]);
                      toast.success("Payroll exported");
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as Excel
                  </Button>
                  <Button onClick={handleResetProcessing} variant="outline" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Process Another Month
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
