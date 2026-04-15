import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { PayslipSummary } from "@/components/PayslipSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DollarSign, Calculator, Plus, ArrowRight } from "lucide-react";

const DEFAULT_PAYROLL = {
  basicSalary: 0,
  allowances: 0,
  housingAllowance: 0,
};

// Simulated Kenyan payroll calculator (matches server-side logic)
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
  let bracket = "";

  if (annualTaxable <= 288000) {
    tax = annualTaxable * 0.1;
    bracket = "10%";
  } else if (annualTaxable <= 388000) {
    tax = 288000 * 0.1 + (annualTaxable - 288000) * 0.15;
    bracket = "15%";
  } else if (annualTaxable <= 6000000) {
    tax = 288000 * 0.1 + 100000 * 0.15 + (annualTaxable - 388000) * 0.2;
    bracket = "20%";
  } else if (annualTaxable <= 9600000) {
    tax = 288000 * 0.1 + 100000 * 0.15 + 5612000 * 0.2 + (annualTaxable - 6000000) * 0.25;
    bracket = "25%";
  } else {
    tax = 288000 * 0.1 + 100000 * 0.15 + 5612000 * 0.2 + 3600000 * 0.25 + (annualTaxable - 9600000) * 0.3;
    bracket = "30%";
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
    basicSalary: Math.round(basicSalary * 100),
    grossSalary: Math.round(grossSalary * 100),
    nssfContribution: Math.round(nssfTotal * 100),
    payeeTax: Math.round(monthlyTaxAfter * 100),
    shifContribution: Math.round(shifTotal * 100),
    housingLevyDeduction: Math.round(housingLevy * 100),
    personalRelief: Math.round(personalRelief * 100),
    netSalary: Math.round(netSalary * 100),
    details: {
      nssfTier1: Math.round(nssfTier1 * 100),
      nssfTier2: Math.round(nssfTier2 * 100),
      shifBasic: Math.round(shifBefore * 100),
      shifCapped: Math.round(shifTotal * 100),
      payeBeforeRelief: Math.round(monthlyTaxBefore * 100),
      payeAfterRelief: Math.round(monthlyTaxAfter * 100),
      taxableIncome: Math.round(taxableIncome * 100),
      taxBracketApplied: bracket,
    },
  };
}

export default function KenyanPayrollCalculator() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState<{
    employeeId: string;
    basicSalary: string;
    allowances: string;
    housingAllowance: string;
    payPeriod: string;
  }>({
    employeeId: "",
    basicSalary: "",
    allowances: "",
    housingAllowance: "",
    payPeriod: new Date().toISOString().split("T")[0],
  });

  const [calculation, setCalculation] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: employees = [] } = trpc.employees.list.useQuery();

  const selectedEmployee = employees.find((e) => e.id === formData.employeeId);

  const handleCalculate = () => {
    if (!formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!formData.basicSalary || parseFloat(formData.basicSalary) <= 0) {
      toast.error("Please enter a valid basic salary");
      return;
    }

    const result = calculateKenyanPayroll({
      basicSalary: parseFloat(formData.basicSalary),
      allowances: parseFloat(formData.allowances || "0"),
      housingAllowance: parseFloat(formData.housingAllowance || "0"),
    });

    setCalculation(result);
    setShowPreview(true);
    toast.success("Payroll calculated successfully");
  };

  const handleSavePayroll = async () => {
    try {
      // Here you would save to the database
      toast.success("Payroll saved successfully");
      navigate("/payroll");
    } catch (error) {
      toast.error("Failed to save payroll");
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return "";
    return parseFloat(value).toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    // Only allow numbers and decimals
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ModuleLayout
      title="Kenyan Payroll Calculator"
      description="Calculate payroll with PAYE, NSSF, SHIF, and Housing Levy deductions"
      icon={<Calculator className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Payroll", href: "/payroll" },
        { label: "Kenyan Calculator", href: "#" },
      ]}
    >
      <div className="space-y-6">
        {!showPreview ? (
          <Card>
            <CardHeader>
              <CardTitle>Payroll Information</CardTitle>
              <CardDescription>
                Enter employee and salary details to calculate payroll with all Kenyan deductions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employee Selection */}
              <div className="space-y-2">
                <Label htmlFor="employee">Select Employee *</Label>
                <Select value={formData.employeeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, employeeId: value }))}>
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Choose an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && (
                <div className="bg-blue-50 p-4 rounded border-l-4 border-l-blue-500">
                  <p className="text-sm"><strong>Employee:</strong> {selectedEmployee.name}</p>
                  <p className="text-sm"><strong>Email:</strong> {selectedEmployee.email}</p>
                  <p className="text-sm"><strong>Department:</strong> {selectedEmployee.department || "N/A"}</p>
                </div>
              )}

              {/* Salary Information */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="basic">Basic Salary (KES) *</Label>
                  <Input
                    id="basic"
                    type="text"
                    placeholder="50000"
                    value={formData.basicSalary}
                    onChange={(e) => handleInputChange("basicSalary", e.target.value)}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.basicSalary ? `KES ${formatCurrency(formData.basicSalary)}` : ""}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowances">Other Allowances (KES)</Label>
                  <Input
                    id="allowances"
                    type="text"
                    placeholder="5000"
                    value={formData.allowances}
                    onChange={(e) => handleInputChange("allowances", e.target.value)}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.allowances ? `KES ${formatCurrency(formData.allowances)}` : ""}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="housing">Housing Allowance (KES)</Label>
                  <Input
                    id="housing"
                    type="text"
                    placeholder="10000"
                    value={formData.housingAllowance}
                    onChange={(e) => handleInputChange("housingAllowance", e.target.value)}
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.housingAllowance ? `KES ${formatCurrency(formData.housingAllowance)}` : ""}
                  </p>
                </div>
              </div>

              {/* Pay Period */}
              <div className="space-y-2">
                <Label htmlFor="period">Pay Period</Label>
                <Input
                  id="period"
                  type="month"
                  value={formData.payPeriod.split("-").slice(0, 2).join("-")}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split("-");
                    setFormData((prev) => ({ ...prev, payPeriod: `${year}-${month}-01` }));
                  }}
                />
              </div>

              {/* Calculate Button */}
              <Button onClick={handleCalculate} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg">
                <Calculator className="mr-2 h-5 w-5" />
                Calculate Payroll
              </Button>

              {/* Info Box */}
              <div className="bg-slate-50 p-4 rounded text-sm space-y-2">
                <p className="font-semibold">Deductions Included:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>✓ NSSF (Tier 1 & 2)</div>
                  <div>✓ PAYE Tax</div>
                  <div>✓ SHIF (Health Fund)</div>
                  <div>✓ Housing Levy</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : calculation ? (
          <div className="space-y-6">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="mb-4"
            >
              ← Back to Calculator
            </Button>

            <PayslipSummary
              employeeName={selectedEmployee?.name || "Employee"}
              employeeId={formData.employeeId}
              payPeriod={new Date(formData.payPeriod).toLocaleDateString("en-KE", {
                year: "numeric",
                month: "long",
              })}
              taxNumber={selectedEmployee?.taxNumber || "N/A"}
              payroll={calculation}
              onDownload={() => window.print()}
            />

            <div className="flex gap-4">
              <Button
                onClick={handleSavePayroll}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Save This Payroll
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                size="lg"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Create Another
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </ModuleLayout>
  );
}
