import { forwardRef } from "react";
import { useCurrencySettings } from "@/lib/currency";

interface PayslipData {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  position: string;
  payPeriod: { start: Date; end: Date };
  basicSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  netSalary: number;
  bankAccount?: string;
  companyName: string;
  companyAddress?: string;
  payDate: Date;
  totalEarnings: number;
  totalDeductions: number;
}

export const PayslipTemplate = forwardRef<HTMLDivElement, { data: PayslipData }>(
  ({ data }, ref) => {
    const { symbol, position: symbolPosition } = useCurrencySettings();

    const fmt = (amount: number) => {
      const value = amount / 100;
      if (symbolPosition === "prefix") return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${symbol}`;
    };

    return (
      <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data.companyName}</h1>
              {data.companyAddress && (
                <p className="text-sm text-gray-600 mt-1">{data.companyAddress}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">PAY SLIP</p>
              <p className="text-sm text-gray-600">ID: {data.id}</p>
            </div>
          </div>
        </div>

        {/* Employee Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Employee Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{data.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Employee ID:</span>
                <span className="font-medium">{data.employeeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Department:</span>
                <span className="font-medium">{data.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Position:</span>
                <span className="font-medium">{data.position}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Pay Period</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Period Start:</span>
                <span className="font-medium">{data.payPeriod.start.toLocaleDateString("en-GB")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Period End:</span>
                <span className="font-medium">{data.payPeriod.end.toLocaleDateString("en-GB")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pay Date:</span>
                <span className="font-medium">{data.payDate.toLocaleDateString("en-GB")}</span>
              </div>
              {data.bankAccount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank Account:</span>
                  <span className="font-medium">••••{data.bankAccount.slice(-4)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Earnings & Deductions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          {/* Earnings */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-300">Earnings</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Basic Salary</span>
                <span className="font-medium">{fmt(data.basicSalary)}</span>
              </div>
              {data.allowances.map((allowance, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">{allowance.name}</span>
                  <span className="font-medium">{fmt(allowance.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2 font-semibold">
                <span className="text-gray-900">Total Earnings</span>
                <span className="text-gray-900">{fmt(data.totalEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-300">Deductions</h3>
            <div className="space-y-2">
              {data.deductions.map((deduction, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">{deduction.name}</span>
                  <span className="font-medium text-red-600">({fmt(deduction.amount)})</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2 font-semibold">
                <span className="text-gray-900">Total Deductions</span>
                <span className="text-red-600">({fmt(data.totalDeductions)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div className="bg-gray-100 p-4 rounded-lg mb-8">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">NET SALARY (Payment Amount)</span>
            <span className="text-3xl font-bold text-green-700">{fmt(data.netSalary)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-300 text-xs text-gray-600">
          <p>This is an electronically generated payslip. No signature required.</p>
          <p className="mt-2">For queries, contact HR Department</p>
        </div>
      </div>
    );
  }
);

PayslipTemplate.displayName = "PayslipTemplate";
