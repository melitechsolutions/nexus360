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
import { ArrowLeft, Save, Loader2, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";

export default function CreateSalaryStructure() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    employeeId: "",
    basicSalary: "",
    allowances: "0",
    deductions: "0",
    taxRate: "0",
    notes: "",
  });

  const { data: employees = [] } = trpc.employees.list.useQuery();

  const createMutation = trpc.payroll.salaryStructures.create.useMutation({
    onSuccess: () => {
      toast.success("Salary structure created successfully!");
      utils.payroll.salaryStructures.list.invalidate();
      navigate("/payroll");
    },
    onError: (error) => {
      toast.error(`Failed to create salary structure: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.basicSalary) {
      toast.error("Please fill in required fields (Employee and Basic Salary)");
      return;
    }

    setIsLoading(true);
    try {
      await mutateAsync(createMutation, {
        employeeId: formData.employeeId,
        basicSalary: parseInt(formData.basicSalary) * 100, // convert to cents
        allowances: parseInt(formData.allowances) * 100,
        deductions: parseInt(formData.deductions) * 100,
        taxRate: parseInt(formData.taxRate) * 100, // percentage * 100
        notes: formData.notes || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModuleLayout
      title="Create Salary Structure"
      description="Set up salary structure for an employee"
      icon={<DollarSign className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Payroll", href: "/payroll" },
        { label: "Create Salary Structure" },
      ]}
      backLink={{ label: "Payroll", href: "/payroll" }}
    >
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Salary Structure Details</CardTitle>
            <CardDescription>
              Define the salary components for an employee including allowances, deductions, and tax
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">
                    Basic Salary (KES) *
                    <span className="text-xs text-muted-foreground ml-1">(before allowances)</span>
                  </Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    step="0.01"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    placeholder="50000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowances">
                    Total Allowances (KES)
                    <span className="text-xs text-muted-foreground ml-1">(house, transport, etc.)</span>
                  </Label>
                  <Input
                    id="allowances"
                    type="number"
                    step="0.01"
                    value={formData.allowances}
                    onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deductions">
                    Total Deductions (KES)
                    <span className="text-xs text-muted-foreground ml-1">(loan, pension, etc.)</span>
                  </Label>
                  <Input
                    id="deductions"
                    type="number"
                    step="0.01"
                    value={formData.deductions}
                    onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                    placeholder="5000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate">
                    Tax Rate (%)
                    <span className="text-xs text-muted-foreground ml-1">(percentage)</span>
                  </Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    placeholder="25"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about this salary structure"
                  rows={4}
                />
              </div>

              {/* Salary Summary */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Salary Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Basic Salary:</div>
                  <div className="font-semibold">
                    KES {parseInt(formData.basicSalary || 0).toLocaleString()}
                  </div>
                  <div>+ Allowances:</div>
                  <div className="font-semibold">
                    KES {parseInt(formData.allowances || 0).toLocaleString()}
                  </div>
                  <div>- Deductions:</div>
                  <div className="font-semibold">
                    KES {parseInt(formData.deductions || 0).toLocaleString()}
                  </div>
                  <div>- Tax ({parseInt(formData.taxRate || 0)}%):</div>
                  <div className="font-semibold">
                    KES{" "}
                    {(
                      ((parseInt(formData.basicSalary || 0) + parseInt(formData.allowances || 0)) *
                        parseInt(formData.taxRate || 0)) /
                      100
                    ).toLocaleString()}
                  </div>
                  <div className="border-t pt-2 font-bold">Net Salary:</div>
                  <div className="border-t pt-2 font-bold">
                    KES{" "}
                    {(
                      parseInt(formData.basicSalary || 0) +
                      parseInt(formData.allowances || 0) -
                      parseInt(formData.deductions || 0) -
                      ((parseInt(formData.basicSalary || 0) + parseInt(formData.allowances || 0)) *
                        parseInt(formData.taxRate || 0)) /
                        100
                    ).toLocaleString()}
                  </div>
                </div>
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
                      Create Salary Structure
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
