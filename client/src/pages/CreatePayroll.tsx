import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DollarSign, Calculator } from "lucide-react";

// Kenyan payroll calculator function
function calculateKenyanPayroll(info: {
  basicSalary: number;
  allowances?: number;
  housingAllowance?: number;
}) {
  const basicSalary = info.basicSalary;
  const allowances = info.allowances || 0;
  const grossSalary = basicSalary + allowances;

  // NSSF Calculation
  const nssfTier1 = Math.min(grossSalary * 0.06, 18000);
  const nssfTier2 = grossSalary > 300000 ? (grossSalary - 300000) * 0.06 : 0;
  const nssfTotal = Math.round(nssfTier1 + nssfTier2);

  // Housing Levy
  const housingLevy = Math.round(Math.min(grossSalary * 0.015, 15000));

  // Taxable Income
  const taxableIncome = grossSalary - nssfTotal - housingLevy;

  // PAYE Calculation (progressive)
  const annualTaxable = taxableIncome * 12;
  let tax = 0;

  if (annualTaxable <= 288000) {
    tax = annualTaxable * 0.1;
  } else if (annualTaxable <= 388000) {
    tax = 288000 * 0.1 + (annualTaxable - 288000) * 0.15;
  } else if (annualTaxable <= 6000000) {
    tax = 288000 * 0.1 + 100000 * 0.15 + (annualTaxable - 388000) * 0.2;
  } else if (annualTaxable <= 9600000) {
    tax = 288000 * 0.1 + 100000 * 0.15 + 5612000 * 0.2 + (annualTaxable - 6000000) * 0.25;
  } else {
    tax = 288000 * 0.1 + 100000 * 0.15 + 5612000 * 0.2 + 3600000 * 0.25 + (annualTaxable - 9600000) * 0.3;
  }

  const monthlyTaxBefore = Math.round(tax / 12);
  const personalRelief = 2400;
  const monthlyTaxAfter = Math.max(0, monthlyTaxBefore - personalRelief);

  // SHIF Calculation
  const shifBefore = grossSalary * 0.025;
  const shifTotal = Math.round(Math.min(shifBefore, 15000));

  // Net Salary
  const totalDeductions = nssfTotal + monthlyTaxAfter + shifTotal + housingLevy;
  const netSalary = grossSalary - totalDeductions;

  return {
    basicSalary: Math.round(basicSalary),
    grossSalary: Math.round(grossSalary),
    nssfContribution: nssfTotal,
    payeeTax: monthlyTaxAfter,
    shifContribution: shifTotal,
    housingLevyDeduction: housingLevy,
    personalRelief,
    netSalary: Math.round(netSalary),
    totalDeductions: totalDeductions,
  };
}

export default function CreatePayroll() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [payrollMode, setPayrollMode] = useState<"kenyan" | "manual">("kenyan");
  const [formData, setFormData] = useState({
    employeeId: "",
    payPeriodStart: "",
    payPeriodEnd: "",
    basicSalary: "",
    allowances: "",
    housingAllowance: "",
    deductions: "",
    tax: "",
    netSalary: "",
    status: "draft",
  });
  const [calculation, setCalculation] = useState<any>(null);

  const { data: employees = [] } = trpc.employees.list.useQuery();

  // Auto-calculate when mode is "kenyan" and salary fields change
  useEffect(() => {
    if (payrollMode === "kenyan" && formData.basicSalary) {
      const basicSalary = parseFloat(formData.basicSalary) || 0;
      const allowances = parseFloat(formData.allowances) || 0;
      const housingAllowance = parseFloat(formData.housingAllowance) || 0;

      const result = calculateKenyanPayroll({
        basicSalary,
        allowances,
        housingAllowance,
      });

      setCalculation(result);

      // Auto-populate the form fields
      setFormData((prev) => ({
        ...prev,
        deductions: String(
          (result.nssfContribution + result.shifTotal + result.housingLevyDeduction) / 100
        ),
        tax: String(result.payeeTax / 100),
        netSalary: String(result.netSalary / 100),
      }));
    }
  }, [
    payrollMode,
    formData.basicSalary,
    formData.allowances,
    formData.housingAllowance,
  ]);

  const createPayrollMutation = trpc.payroll.create.useMutation({
    onSuccess: () => {
      toast.success("Payroll record created successfully!");
      utils.payroll.list.invalidate();
      navigate("/payroll");
    },
    onError: (error: any) => {
      toast.error(`Failed to create payroll record: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.payPeriodStart || !formData.payPeriodEnd || !formData.basicSalary || !formData.netSalary) {
      toast.error("Please fill in all required fields");
      return;
    }

    createPayrollMutation.mutate({
      employeeId: formData.employeeId,
      payPeriodStart: new Date(formData.payPeriodStart),
      payPeriodEnd: new Date(formData.payPeriodEnd),
      basicSalary: Math.round(parseFloat(formData.basicSalary)),
      allowances: formData.allowances ? Math.round(parseFloat(formData.allowances)) : 0,
      deductions: formData.deductions ? Math.round(parseFloat(formData.deductions)) : 0,
      tax: formData.tax ? Math.round(parseFloat(formData.tax)) : 0,
      netSalary: Math.round(parseFloat(formData.netSalary)),
      status: formData.status as any,
    });
  };

  return (
    <ModuleLayout
      title="Create Payroll"
      description="Process employee payroll with automatic Kenyan calculation"
      icon={<Calculator className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Payroll", href: "/payroll" },
        { label: "Create Payroll" },
      ]}
      backLink={{ label: "Payroll", href: "/payroll" }}
    >
      <div className="max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Payroll</CardTitle>
            <CardDescription>
              Process payroll with automatic Kenyan tax calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={payrollMode} onValueChange={(v) => setPayrollMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="kenyan">Kenyan Payroll (Automatic)</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>

              <TabsContent value="kenyan" className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee *</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, employeeId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(employees) && employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {(emp.firstName || "")} {(emp.lastName || "")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="payPeriodStart">Pay Period Start *</Label>
                      <Input
                        id="payPeriodStart"
                        type="date"
                        value={formData.payPeriodStart}
                        onChange={(e) =>
                          setFormData({ ...formData, payPeriodStart: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payPeriodEnd">Pay Period End *</Label>
                      <Input
                        id="payPeriodEnd"
                        type="date"
                        value={formData.payPeriodEnd}
                        onChange={(e) =>
                          setFormData({ ...formData, payPeriodEnd: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Income Components
                    </h3>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="basicSalary">Basic Salary (Ksh) *</Label>
                        <Input
                          id="basicSalary"
                          type="number"
                          placeholder="0.00"
                          value={formData.basicSalary}
                          onChange={(e) =>
                            setFormData({ ...formData, basicSalary: e.target.value })
                          }
                          step="1"
                          min="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="allowances">Allowances (Ksh)</Label>
                        <Input
                          id="allowances"
                          type="number"
                          placeholder="0.00"
                          value={formData.allowances}
                          onChange={(e) =>
                            setFormData({ ...formData, allowances: e.target.value })
                          }
                          step="1"
                          min="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="housingAllowance">Housing Allowance (Ksh)</Label>
                        <Input
                          id="housingAllowance"
                          type="number"
                          placeholder="0.00"
                          value={formData.housingAllowance}
                          onChange={(e) =>
                            setFormData({ ...formData, housingAllowance: e.target.value })
                          }
                          step="1"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {calculation && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-green-900">Payroll Summary (Auto-calculated)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Gross Salary</p>
                          <p className="font-bold text-lg">Ksh {(calculation.grossSalary / 100).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">NSSF</p>
                          <p className="font-bold">-Ksh {(calculation.nssfContribution / 100 || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">PAYE Tax</p>
                          <p className="font-bold">-Ksh {(calculation.payeeTax / 100 || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Housing Levy</p>
                          <p className="font-bold">-Ksh {(calculation.housingLevyDeduction / 100 || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">SHIF</p>
                          <p className="font-bold">-Ksh {(calculation.shifContribution / 100 || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Deductions</p>
                          <p className="font-bold">-Ksh {(calculation.totalDeductions / 100).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-green-200">
                        <p className="text-gray-600">Net Salary</p>
                        <p className="font-bold text-xl text-green-700">Ksh {(calculation.netSalary / 100).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="processed">Processed</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={createPayrollMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {createPayrollMutation.isPending
                        ? "Creating..."
                        : "Create Payroll"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="manual" className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee *</Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, employeeId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(employees) && employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {(emp.firstName || "")} {(emp.lastName || "")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="payPeriodStart">Pay Period Start *</Label>
                      <Input
                        id="payPeriodStart"
                        type="date"
                        value={formData.payPeriodStart}
                        onChange={(e) =>
                          setFormData({ ...formData, payPeriodStart: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payPeriodEnd">Pay Period End *</Label>
                      <Input
                        id="payPeriodEnd"
                        type="date"
                        value={formData.payPeriodEnd}
                        onChange={(e) =>
                          setFormData({ ...formData, payPeriodEnd: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="basicSalary">Basic Salary (Ksh) *</Label>
                      <Input
                        id="basicSalary"
                        type="number"
                        placeholder="0.00"
                        value={formData.basicSalary}
                        onChange={(e) =>
                          setFormData({ ...formData, basicSalary: e.target.value })
                        }
                        step="1"
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allowances">Allowances (Ksh)</Label>
                      <Input
                        id="allowances"
                        type="number"
                        placeholder="0.00"
                        value={formData.allowances}
                        onChange={(e) =>
                          setFormData({ ...formData, allowances: e.target.value })
                        }
                        step="1"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="deductions">Deductions (Ksh)</Label>
                      <Input
                        id="deductions"
                        type="number"
                        placeholder="0.00"
                        value={formData.deductions}
                        onChange={(e) =>
                          setFormData({ ...formData, deductions: e.target.value })
                        }
                        step="1"
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax">Tax (Ksh)</Label>
                      <Input
                        id="tax"
                        type="number"
                        placeholder="0.00"
                        value={formData.tax}
                        onChange={(e) =>
                          setFormData({ ...formData, tax: e.target.value })
                        }
                        step="1"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="netSalary">Net Salary (Ksh) *</Label>
                    <Input
                      id="netSalary"
                      type="number"
                      placeholder="0.00"
                      value={formData.netSalary}
                      onChange={(e) =>
                        setFormData({ ...formData, netSalary: e.target.value })
                      }
                      step="1"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="processed">Processed</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={createPayrollMutation.isPending}
                    >
                      {createPayrollMutation.isPending
                        ? "Creating..."
                        : "Create Payroll"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

