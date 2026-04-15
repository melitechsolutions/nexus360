import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";

const DEDUCTION_TYPES = [
  "Loan Repayment",
  "Pension Contribution",
  "Insurance Deduction",
  "Union Fees",
  "Savings Plan",
  "Court Order Deduction",
  "Advance Repayment",
  "Disciplinary Fine",
  "Medical Aid Premium",
  "Other",
];

export default function CreateDeduction() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    employeeId: "",
    deductionType: "",
    amount: "",
    frequency: "monthly" as "monthly" | "quarterly" | "annual" | "one_time",
    reference: "",
    notes: "",
  });

  const { data: employees = [] } = trpc.employees.list.useQuery();

  const createMutation = trpc.payroll.deductions.create.useMutation({
    onSuccess: () => {
      toast.success("Deduction created successfully!");
      utils.payroll.deductions.list.invalidate();
      navigate("/payroll");
    },
    onError: (error) => {
      toast.error(`Failed to create deduction: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.deductionType || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      await mutateAsync(createMutation, {
        employeeId: formData.employeeId,
        deductionType: formData.deductionType,
        amount: parseInt(formData.amount) * 100, // convert to cents
        frequency: formData.frequency,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModuleLayout
      title="Create Salary Deduction"
      description="Add a new salary deduction for an employee"
      icon={<Minus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Payroll", href: "/payroll" },
        { label: "Create Deduction" },
      ]}
      backLink={{ label: "Payroll", href: "/payroll" }}
    >
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Deduction Details</CardTitle>
            <CardDescription>
              Create a new salary deduction for an employee (loans, pension, insurance, union fees, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee *</Label>
                <Select value={formData.employeeId} onValueChange={(value) => setFormData({ ...formData, employeeId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {(employee.firstName || "")} {(employee.lastName || "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deductionType">Deduction Type *</Label>
                <Select value={formData.deductionType} onValueChange={(value) => setFormData({ ...formData, deductionType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select deduction type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KES) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="2000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="one_time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference (e.g., Loan ID, Policy Number)</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="LOAN-001 or POLICY-12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about this deduction"
                  rows={3}
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/payroll")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || createMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {(isLoading || createMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Deduction
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Deduction Types</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-gray-700">
            <p>• <strong>Loan Repayment</strong>: Staff loan or personal loan installments</p>
            <p>• <strong>Pension</strong>: Additional pension/NSSF contributions beyond statutory</p>
            <p>• <strong>Insurance</strong>: Health, life, or other insurance premiums</p>
            <p>• <strong>Union Fees</strong>: Professional or labor union membership fees</p>
            <p>• <strong>Court Order</strong>: Child support or court-ordered deductions</p>
            <p>• <strong>Disciplinary Fine</strong>: Deductions due to disciplinary actions</p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
