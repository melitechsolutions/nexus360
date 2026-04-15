import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";

const BENEFIT_TYPES = [
  "Health Insurance",
  "Life Insurance",
  "Dental Insurance",
  "Vision Insurance",
  "Medical Aid",
  "Pension Plan",
  "Disability Insurance",
  "Travel Insurance",
  "Education Benefit",
  "Housing Benefit",
  "Vehicle Allowance",
  "Other",
];

export default function CreateBenefit() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    employeeId: "",
    benefitType: "",
    provider: "",
    coverage: "",
    employeeCost: "",
    employerCost: "",
    notes: "",
  });

  const { data: employees = [] } = trpc.employees.list.useQuery();

  const createMutation = trpc.payroll.benefits.create.useMutation({
    onSuccess: () => {
      toast.success("Benefit created successfully!");
      utils.payroll.benefits.list.invalidate();
      navigate("/payroll");
    },
    onError: (error) => {
      toast.error(`Failed to create benefit: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.benefitType) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      await mutateAsync(createMutation, {
        employeeId: formData.employeeId,
        benefitType: formData.benefitType,
        provider: formData.provider || undefined,
        coverage: formData.coverage || undefined,
        cost: formData.employeeCost ? parseInt(formData.employeeCost) * 100 : 0,
        employerCost: formData.employerCost ? parseInt(formData.employerCost) * 100 : 0,
        notes: formData.notes || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalCost = {
    employee: formData.employeeCost ? parseFloat(formData.employeeCost) : 0,
    employer: formData.employerCost ? parseFloat(formData.employerCost) : 0,
  };
  totalCost.employee = totalCost.employee || 0;
  totalCost.employer = totalCost.employer || 0;

  return (
    <ModuleLayout
      title="Create Employee Benefit"
      description="Add a new benefit for an employee"
      icon={<Heart className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Payroll", href: "/payroll" },
        { label: "Create Benefit" },
      ]}
      actions={
        <Button variant="outline" onClick={() => navigate("/payroll")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payroll
        </Button>
      }
    >
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Benefit Details</CardTitle>
            <CardDescription>
              Create a new employee benefit (insurance, health plans, pension, etc.)
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
                <Label htmlFor="benefitType">Benefit Type *</Label>
                <Select value={formData.benefitType} onValueChange={(value) => setFormData({ ...formData, benefitType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select benefit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BENEFIT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Provider Name (Insurance Company, etc.)</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="e.g., AAR Insurance, Britam, NSSF"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverage">Coverage Details</Label>
                <RichTextEditor
                  value={formData.coverage}
                  onChange={(html) => setFormData({ ...formData, coverage: html })}
                  placeholder="e.g., Full coverage for individual and family, includes outpatient and inpatient..."
                  minHeight="100px"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeCost">Employee Cost (KES per month)</Label>
                  <Input
                    id="employeeCost"
                    type="number"
                    step="0.01"
                    value={formData.employeeCost}
                    onChange={(e) => setFormData({ ...formData, employeeCost: e.target.value })}
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employerCost">Employer Cost (KES per month)</Label>
                  <Input
                    id="employerCost"
                    type="number"
                    step="0.01"
                    value={formData.employerCost}
                    onChange={(e) => setFormData({ ...formData, employerCost: e.target.value })}
                    placeholder="2000"
                  />
                </div>
              </div>

              {/* Cost Summary */}
              {(totalCost.employee > 0 || totalCost.employer > 0) && (
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Employee Cost</p>
                      <p className="font-semibold">KES {totalCost.employee.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Employer Cost</p>
                      <p className="font-semibold">KES {totalCost.employer.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Monthly Cost</p>
                      <p className="font-semibold text-blue-600">KES {(totalCost.employee + totalCost.employer).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <RichTextEditor
                  value={formData.notes}
                  onChange={(html) => setFormData({ ...formData, notes: html })}
                  placeholder="Any additional notes about this benefit (e.g., policy number, enroll date, etc.)"
                  minHeight="100px"
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
                      Create Benefit
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-base">Employee Benefits</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1 text-gray-700">
            <p>• <strong>Health Insurance</strong>: Medical coverage for employee and dependents</p>
            <p>• <strong>Life Insurance</strong>: Life coverage (usually 2-5x salary)</p>
            <p>• <strong>Pension Plan</strong>: Retirement savings plan</p>
            <p>• <strong>Medical Aid</strong>: Monthly medical aid subscription</p>
            <p>• <strong>Housing Benefit</strong>: Mortgage assistance or housing loan</p>
            <p>• <strong>Vehicle Allowance</strong>: Transport or vehicle benefit</p>
            <p>Employee Cost is deducted from salary. Employer Cost is company expense.</p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
