import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
import { Spinner } from "@/components/ui/spinner";

const BENEFIT_TYPES = [
  "Health Insurance",
  "Life Insurance",
  "Dental Insurance",
  "Vision Insurance",
  "Retirement Plan",
  "Education Fund",
  "Gym Membership",
  "Company Car",
  "Housing Benefit",
  "Other",
];

export default function EditBenefit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    benefitType: "",
    provider: "",
    coverage: "",
    cost: "",
    employerCost: "",
    notes: "",
  });

  const { data: benefits = [], isLoading: isLoadingData } = trpc.payroll.benefits.list.useQuery();
  const benefit = benefits.find((b: any) => b.id === id);

  useEffect(() => {
    if (benefit) {
      setFormData({
        benefitType: (benefit as any).benefitType || "",
        provider: (benefit as any).provider || "",
        coverage: (benefit as any).coverage || "",
        cost: (benefit as any).cost ? String(Number((benefit as any).cost) / 100) : "",
        employerCost: (benefit as any).employerCost ? String(Number((benefit as any).employerCost) / 100) : "",
        notes: (benefit as any).notes || "",
      });
    }
  }, [benefit]);

  const updateMutation = trpc.payroll.benefits.update.useMutation({
    onSuccess: () => {
      toast.success("Benefit updated successfully!");
      utils.payroll.benefits.list.invalidate();
      navigate("/payroll");
    },
    onError: (error: any) => {
      toast.error(`Failed to update benefit: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.benefitType) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsLoading(true);
    try {
      await mutateAsync(updateMutation, {
        id: id || "",
        benefitType: formData.benefitType,
        provider: formData.provider || undefined,
        coverage: formData.coverage || undefined,
        cost: formData.cost ? parseInt(formData.cost) * 100 : undefined,
        employerCost: formData.employerCost ? parseInt(formData.employerCost) * 100 : undefined,
        notes: formData.notes || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <ModuleLayout title="Edit Benefit" icon={<Heart className="w-6 h-6" />}>
        <div className="flex items-center justify-center py-12"><Spinner className="h-8 w-8" /></div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Employee Benefit"
      description="Update employee benefit details"
      icon={<Heart className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Payroll", href: "/payroll" },
        { label: "Edit Benefit" },
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
            <CardDescription>Update the employee benefit details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="benefitType">Benefit Type *</Label>
                <Select value={formData.benefitType} onValueChange={(value) => setFormData({ ...formData, benefitType: value })}>
                  <SelectTrigger><SelectValue placeholder="Select benefit type" /></SelectTrigger>
                  <SelectContent>
                    {BENEFIT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input id="provider" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} placeholder="Insurance company, etc." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverage">Coverage</Label>
                <Input id="coverage" value={formData.coverage} onChange={(e) => setFormData({ ...formData, coverage: e.target.value })} placeholder="e.g., Family, Individual" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Employee Cost (KES)</Label>
                  <Input id="cost" type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employerCost">Employer Cost (KES)</Label>
                  <Input id="employerCost" type="number" step="0.01" value={formData.employerCost} onChange={(e) => setFormData({ ...formData, employerCost: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <RichTextEditor value={formData.notes} onChange={(html) => setFormData({ ...formData, notes: html })} minHeight="100px" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/payroll")}>Cancel</Button>
                <Button type="submit" disabled={isLoading || updateMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
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
