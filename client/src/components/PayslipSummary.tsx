import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useCurrencySettings } from "@/lib/currency";

interface PayrollBreakdown {
  basicSalary: number;
  grossSalary: number;
  nssfContribution: number;
  payeeTax: number;
  shifContribution: number;
  housingLevyDeduction: number;
  personalRelief: number;
  netSalary: number;
  details: {
    nssfTier1: number;
    nssfTier2: number;
    shifBasic: number;
    shifCapped: number;
    payeBeforeRelief: number;
    payeAfterRelief: number;
    taxableIncome: number;
    taxBracketApplied: string;
  };
}

interface PayslipSummaryProps {
  employeeName: string;
  employeeId: string;
  payPeriod: string;
  taxNumber?: string;
  payroll: PayrollBreakdown;
  onDownload?: () => void;
}

export function PayslipSummary({
  employeeName,
  employeeId,
  payPeriod,
  taxNumber,
  payroll,
  onDownload,
}: PayslipSummaryProps) {
  const { code: currencyCode } = useCurrencySettings();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(value / 100);
  };

  const totalDeductions =
    payroll.nssfContribution +
    payroll.payeeTax +
    payroll.shifContribution +
    payroll.housingLevyDeduction;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{employeeName}</h2>
            <p className="text-sm text-muted-foreground">Employee ID: {employeeId}</p>
            {taxNumber && <p className="text-sm text-muted-foreground">Tax No: {taxNumber}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{payPeriod}</p>
            <Badge variant="outline" className="mt-2">Payslip</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Earnings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Earnings</CardTitle>
            <CardDescription>Total compensation components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Basic Salary</span>
              <span className="font-semibold">{formatCurrency(payroll.basicSalary)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center font-semibold">
              <span>Gross Salary</span>
              <span className="text-green-600">{formatCurrency(payroll.grossSalary)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Deductions</CardTitle>
            <CardDescription>Statutory and other deductions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Deductions Total</span>
              <span className="font-semibold text-red-600">{formatCurrency(totalDeductions)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center font-semibold bg-slate-50 p-2 rounded">
              <span>NET SALARY</span>
              <span className="text-green-600 text-lg">{formatCurrency(payroll.netSalary)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Deductions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deduction Breakdown</CardTitle>
          <CardDescription>Detailed breakdown of all statutory deductions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* NSSF */}
          <div className="border-l-4 border-l-blue-500 pl-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">NSSF (National Social Security Fund)</h4>
                <p className="text-xs text-muted-foreground">Pension Contribution</p>
              </div>
              <span className="font-semibold">{formatCurrency(payroll.nssfContribution)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-2 rounded">
              <div>
                <p className="text-xs text-muted-foreground">Tier 1 (6% base)</p>
                <p className="font-semibold">{formatCurrency(payroll.details.nssfTier1)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tier 2 (Above 300K)</p>
                <p className="font-semibold">{formatCurrency(payroll.details.nssfTier2)}</p>
              </div>
            </div>
          </div>

          {/* PAYE */}
          <div className="border-l-4 border-l-amber-500 pl-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">PAYE (Pay As You Earn)</h4>
                <p className="text-xs text-muted-foreground">Income Tax</p>
              </div>
              <span className="font-semibold">{formatCurrency(payroll.payeeTax)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-2 rounded mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Tax Bracket</p>
                <p className="font-semibold">{payroll.details.taxBracketApplied}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxable Income</p>
                <p className="font-semibold">{formatCurrency(payroll.details.taxableIncome)}</p>
              </div>
            </div>
            <div className="border-t pt-2 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-xs">Tax (before relief)</span>
                <span>{formatCurrency(payroll.details.payeBeforeRelief)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs">Personal Relief</span>
                <span className="text-green-600">-{formatCurrency(payroll.personalRelief)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-xs">Tax (after relief)</span>
                <span>{formatCurrency(payroll.payeeTax)}</span>
              </div>
            </div>
          </div>

          {/* SHIF */}
          <div className="border-l-4 border-l-green-500 pl-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">SHIF (Social Health Insurance Fund)</h4>
                <p className="text-xs text-muted-foreground">Health Insurance - 2.5% of Gross</p>
              </div>
              <span className="font-semibold">{formatCurrency(payroll.shifContribution)}</span>
            </div>
            {payroll.details.shifBasic !== payroll.details.shifCapped && (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Capped at KES 15,000/month (calculated: {formatCurrency(payroll.details.shifBasic)})
              </div>
            )}
          </div>

          {/* Housing Levy */}
          <div className="border-l-4 border-l-purple-500 pl-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">Housing Levy (Building Levy)</h4>
                <p className="text-xs text-muted-foreground">1.5% of Gross Salary (max KES 15,000)</p>
              </div>
              <span className="font-semibold">{formatCurrency(payroll.housingLevyDeduction)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payslip Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span>Gross Salary</span>
              <span className="font-semibold">{formatCurrency(payroll.grossSalary)}</span>
            </div>
            <div className="space-y-2 py-2 border-b">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">- NSSF Contribution</span>
                <span>{formatCurrency(payroll.nssfContribution)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">- PAYE Tax</span>
                <span>{formatCurrency(payroll.payeeTax)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">- SHIF Contribution</span>
                <span>{formatCurrency(payroll.shifContribution)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">- Housing Levy</span>
                <span>{formatCurrency(payroll.housingLevyDeduction)}</span>
              </div>
            </div>
            <div className="flex justify-between py-2 font-bold text-base bg-green-50 p-3 rounded">
              <span>NET SALARY</span>
              <span className="text-green-600">{formatCurrency(payroll.netSalary)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Button */}
      {onDownload && (
        <Button onClick={onDownload} className="w-full bg-blue-600 hover:bg-blue-700">
          <Download className="mr-2 h-4 w-4" />
          Download Payslip PDF
        </Button>
      )}

      {/* Footer Note */}
      <div className="bg-slate-50 p-4 rounded text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Note:</strong> This payslip is generated based on the current Kenyan tax regulations and rates
          as of 2024.
        </p>
        <p>• NSSF: National Social Security Fund contributions (Tier 1 & 2)</p>
        <p>• PAYE: Income tax with personal relief deduction</p>
        <p>• SHIF: Social Health Insurance Fund contributions (capped at 15,000)</p>
        <p>• Housing Levy: Building fund contribution (capped at 15,000)</p>
      </div>
    </div>
  );
}
