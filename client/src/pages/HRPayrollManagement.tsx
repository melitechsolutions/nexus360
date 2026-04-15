import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";
import PayrollImportTab from "@/components/PayrollImportTab";
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Users,
  Heart,
  Percent,
  FileText,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";

export default function HRPayrollManagement() {
  const { code: currencyCode } = useCurrencySettings();

  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("salaryStructures");
  const utils = trpc.useUtils();

  // Fetch data for different tabs
  const { data: employees = [] } = trpc.employees.list.useQuery();
  const { data: payrolls = [] } = trpc.payroll.list.useQuery();
  const { data: salaryStructures = [] } = trpc.payroll.salaryStructures.list.useQuery();
  const { data: allowances = [] } = trpc.payroll.allowances.list.useQuery();
  const { data: deductions = [] } = trpc.payroll.deductions.list.useQuery();
  const { data: benefits = [] } = trpc.payroll.benefits.list.useQuery();

  // Mutations
  const deletePayrollMutation = trpc.payroll.delete.useMutation({
    onSuccess: () => {
      toast.success("Payroll deleted successfully");
      utils.payroll.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete payroll: ${error.message}`);
    },
  });

  const handleDeletePayroll = (payrollId: string) => {
    if (confirm("Are you sure you want to delete this payroll?")) {
      deletePayrollMutation.mutate(payrollId);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
    }).format(value / 100);
  };

  const getPayrollStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-slate-50">Draft</Badge>;
      case "processed":
        return <Badge className="bg-blue-600">Processed</Badge>;
      case "paid":
        return <Badge className="bg-green-600">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <ModuleLayout
      title="HR & Payroll Management"
      description="Manage employee payroll, benefits, and compensation"
      icon={<DollarSign className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR & Payroll", href: "/payroll" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button onClick={() => navigate("/payroll/kenyan")} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="mr-2 h-4 w-4" />
            Kenyan Payroll
          </Button>
          <Button onClick={() => navigate("/payroll/create")} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            New Payroll
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Total Employees"
            value={employees.length}
            description="Active staff"
            icon={<Users className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="Pending Payroll"
            value={payrolls.filter((p) => p.status === "draft").length}
            description="Awaiting processing"
            icon={<FileText className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Salary Structures"
            value={salaryStructures.length}
            description="Configured"
            icon={<Percent className="h-5 w-5" />}
            color="border-l-amber-500"
          />

          <StatsCard
            label="Benefits"
            value={benefits.length}
            description="Active benefits"
            icon={<Heart className="h-5 w-5" />}
            color="border-l-purple-500"
          />
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Payroll & Compensation</CardTitle>
            <CardDescription>
              Manage employee payroll, salary structures, and compensation packages
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="salaryStructures">Salary Structures</TabsTrigger>
                <TabsTrigger value="allowances">Allowances</TabsTrigger>
                <TabsTrigger value="deductions">Deductions</TabsTrigger>
                <TabsTrigger value="benefits">Benefits</TabsTrigger>
                <TabsTrigger value="payroll">Payroll</TabsTrigger>
                <TabsTrigger value="import">Import Payroll</TabsTrigger>
              </TabsList>

              {/* Salary Structures Tab */}
              <TabsContent value="salaryStructures" className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => utils.payroll.salaryStructures.list.invalidate()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/salary-structures/create")}
                    className="bg-blue-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Structure
                  </Button>
                </div>
                {salaryStructures.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No salary structures configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Tax Rate</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaryStructures.map((structure: any) => (
                        <TableRow key={structure.id}>
                          <TableCell className="font-medium">
                            {(employees.find((e) => e.id === structure.employeeId)?.firstName || "")}{" "}
                            {(employees.find((e) => e.id === structure.employeeId)?.lastName || "")}
                          </TableCell>
                          <TableCell>{formatCurrency(structure.basicSalary)}</TableCell>
                          <TableCell>{formatCurrency(structure.allowances)}</TableCell>
                          <TableCell>{formatCurrency(structure.deductions)}</TableCell>
                          <TableCell>{(structure.taxRate / 100).toFixed(1)}%</TableCell>
                          <TableCell>
                            {new Date(structure.effectiveDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/salary-structures/${structure.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Allowances Tab */}
              <TabsContent value="allowances" className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => utils.payroll.allowances.list.invalidate()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/allowances/create")}
                    className="bg-blue-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Allowance
                  </Button>
                </div>

                {/* Quick Custom Allowance Creation */}
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-base">Quick Add Custom Allowance</CardTitle>
                    <CardDescription>Add a one-time custom allowance for an employee</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="allowance-employee" className="text-sm">Employee</Label>
                        <select id="allowance-employee" className="w-full px-3 py-2 border rounded-md text-sm">
                          <option value="">Select employee...</option>
                          {employees.map((emp: any) => (
                            <option key={emp.id} value={emp.id}>{(emp.firstName || "")} {(emp.lastName || "")}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="allowance-type" className="text-sm">Allowance Type</Label>
                        <input 
                          id="allowance-type" 
                          type="text" 
                          placeholder="e.g., Transport, Meal" 
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="allowance-amount" className="text-sm">Amount (KES)</Label>
                        <input 
                          id="allowance-amount" 
                          type="number" 
                          placeholder="5000" 
                          className="w-full px-3 py-2 border rounded-md text-sm text-right"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          size="sm"
                          className="bg-blue-600 w-full"
                          onClick={() => {
                            const employeeEl = document.getElementById("allowance-employee") as HTMLSelectElement | null;
                            const typeEl = document.getElementById("allowance-type") as HTMLInputElement | null;
                            const amountEl = document.getElementById("allowance-amount") as HTMLInputElement | null;
                            const employeeId = employeeEl?.value || "";
                            const allowanceType = (typeEl?.value || "").trim();
                            const amount = Number(amountEl?.value || 0);

                            if (!employeeId || !allowanceType || amount <= 0) {
                              toast.error("Select employee, type, and amount before adding");
                              return;
                            }

                            toast.success(`Added ${allowanceType} allowance (KES ${amount.toLocaleString()}) to draft`);
                            if (typeEl) typeEl.value = "";
                            if (amountEl) amountEl.value = "";
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {allowances.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No allowances configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Allowance Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allowances.map((allowance: any) => (
                        <TableRow key={allowance.id}>
                          <TableCell className="font-medium">
                            {(employees.find((e) => e.id === allowance.employeeId)?.firstName || "")}{" "}
                            {(employees.find((e) => e.id === allowance.employeeId)?.lastName || "")}
                          </TableCell>
                          <TableCell>{allowance.allowanceType}</TableCell>
                          <TableCell>{formatCurrency(allowance.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{allowance.frequency}</Badge>
                          </TableCell>
                          <TableCell>
                            {allowance.isActive ? (
                              <Badge className="bg-green-600">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/allowances/${allowance.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Deductions Tab */}
              <TabsContent value="deductions" className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => utils.payroll.deductions.list.invalidate()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/payroll/deductions/create")}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Deduction
                  </Button>
                </div>
                {deductions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No deductions configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Deduction Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deductions.map((deduction: any) => (
                        <TableRow key={deduction.id}>
                          <TableCell className="font-medium">
                            {(employees.find((e) => e.id === deduction.employeeId)?.firstName || "")}{" "}
                            {(employees.find((e) => e.id === deduction.employeeId)?.lastName || "")}
                          </TableCell>
                          <TableCell>{deduction.deductionType}</TableCell>
                          <TableCell>{formatCurrency(deduction.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{deduction.frequency}</Badge>
                          </TableCell>
                          <TableCell>
                            {deduction.isActive ? (
                              <Badge className="bg-green-600">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/payroll/deductions/${deduction.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Benefits Tab */}
              <TabsContent value="benefits" className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => utils.payroll.benefits.list.invalidate()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/payroll/benefits/create")}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Benefit
                  </Button>
                </div>
                {benefits.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No benefits configured</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Benefit Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {benefits.map((benefit: any) => (
                        <TableRow key={benefit.id}>
                          <TableCell className="font-medium">
                            {(employees.find((e) => e.id === benefit.employeeId)?.firstName || "")}{" "}
                            {(employees.find((e) => e.id === benefit.employeeId)?.lastName || "")}
                          </TableCell>
                          <TableCell>{benefit.benefitType}</TableCell>
                          <TableCell>{benefit.provider || "-"}</TableCell>
                          <TableCell>{formatCurrency(benefit.cost || 0)}</TableCell>
                          <TableCell>
                            {benefit.isActive ? (
                              <Badge className="bg-green-600">Active</Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/payroll/benefits/${benefit.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Payroll Tab */}
              <TabsContent value="payroll" className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => utils.payroll.list.invalidate()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export to Excel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/payroll/create")}
                    className="bg-green-600"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Payroll
                  </Button>
                </div>
                {payrolls.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No payroll records found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Pay Period</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrolls.map((payroll: any) => (
                        <TableRow key={payroll.id}>
                          <TableCell className="font-medium">
                            {(employees.find((e) => e.id === payroll.employeeId)?.firstName || "")}{" "}
                            {(employees.find((e) => e.id === payroll.employeeId)?.lastName || "")}
                          </TableCell>
                          <TableCell>
                            {payroll.payPeriodStart
                              ? new Date(payroll.payPeriodStart).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>{formatCurrency(payroll.basicSalary)}</TableCell>
                          <TableCell>{formatCurrency(payroll.allowances || 0)}</TableCell>
                          <TableCell>{formatCurrency(payroll.deductions || 0)}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(payroll.netSalary)}
                          </TableCell>
                          <TableCell>{getPayrollStatusBadge(payroll.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/payroll/${payroll.id}`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeletePayroll(payroll.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Import Payroll Tab */}
              <TabsContent value="import" className="space-y-4">
                <PayrollImportTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
