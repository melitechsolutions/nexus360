import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import { Spinner } from "@/components/ui/spinner";

export default function EditSalaryStructure() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    basicSalary: "",
    allowances: "",
    deductions: "",
    taxRate: "",
    notes: "",
  });

  const { data: structures = [], isLoading: isLoadingData } = trpc.payroll.salaryStructures.list.useQuery();
  const structure = structures.find((s: any) => s.id === id);

  useEffect(() => {
    if (structure) {
      setFormData({
        basicSalary: (structure as any).basicSalary ? String(Number((structure as any).basicSalary) / 100) : "",
        allowances: (structure as any).allowances ? String(Number((structure as any).allowances) / 100) : "",
        deductions: (structure as any).deductions ? String(Number((structure as any).deductions) / 100) : "",
        taxRate: (structure as any).taxRate ? String((structure as any).taxRate) : "",
        notes: (structure as any).notes || "",
      });
    }
  }, [structure]);

  const updateMutation = trpc.payroll.salaryStructures.update.useMutation({
    onSuccess: () => {
      toast.success("Salary structure updated successfully!");
      utils.payroll.salaryStructures.list.invalidate();
      navigate("/payroll");
    },
    onError: (error: any) => {
      toast.error(`Failed to update salary structure: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.basicSalary) {
      toast.error("Basic salary is required");
      return;
    }
    setIsLoading(true);
    try {
      await mutateAsync(updateMutation, {
        id: id || "",
        basicSalary: parseFloat(formData.basicSalary) * 100,
        allowances: formData.allowances ? parseFloat(formData.allowances) * 100 : undefined,
        deductions: formData.deductions ? parseFloat(formData.deductions) * 100 : undefined,
        taxRate: formData.taxRate ? parseFloat(formData.taxRate) : undefined,
        notes: formData.notes || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <ModuleLayout title="Edit Salary Structure" icon={<Layers className="w-6 h-6" />}>
        <div className="flex items-center justify-center py-12"><Spinner className="h-8 w-8" /></div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Salary Structure"
      description="Update salary structure details"
      icon={<Layers className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Payroll", href: "/payroll" },
        { label: "Edit Salary Structure" },
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
            <CardTitle>Salary Structure Details</CardTitle>
            <CardDescription>Update the salary structure breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="basicSalary">Basic Salary (KES) *</Label>
                <Input id="basicSalary" type="number" step="0.01" value={formData.basicSalary} onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allowances">Total Allowances (KES)</Label>
                  <Input id="allowances" type="number" step="0.01" value={formData.allowances} onChange={(e) => setFormData({ ...formData, allowances: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deductions">Total Deductions (KES)</Label>
                  <Input id="deductions" type="number" step="0.01" value={formData.deductions} onChange={(e) => setFormData({ ...formData, deductions: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input id="taxRate" type="number" step="0.01" value={formData.taxRate} onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })} placeholder="e.g., 30" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <RichTextEditor value={formData.notes} onChange={(html) => setFormData({ ...formData, notes: html })} minHeight="100px" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/payroll")}>Cancel</Button>
                <Button type="submit" disabled={isLoading || updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {(isLoading || updateMutation.isPending) ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
