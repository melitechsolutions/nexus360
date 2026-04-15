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
import { ArrowLeft, Save, Loader2, Percent } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import { Spinner } from "@/components/ui/spinner";

const ALLOWANCE_TYPES = [
  "House Allowance",
  "Transport Allowance",
  "Meal Allowance",
  "Phone Allowance",
  "Internet Allowance",
  "Responsibility Allowance",
  "Special Allowance",
  "Other",
];

export default function EditAllowance() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    allowanceType: "",
    amount: "",
    frequency: "monthly" as "monthly" | "quarterly" | "annual" | "one_time",
    notes: "",
  });

  // Fetch all allowances and find the one matching this id
  const { data: allowances = [], isLoading: isLoadingData } = trpc.payroll.allowances.list.useQuery();
  const allowance = allowances.find((a: any) => a.id === id);

  useEffect(() => {
    if (allowance) {
      setFormData({
        allowanceType: (allowance as any).allowanceType || "",
        amount: (allowance as any).amount ? String(Number((allowance as any).amount) / 100) : "",
        frequency: (allowance as any).frequency || "monthly",
        notes: (allowance as any).notes || "",
      });
    }
  }, [allowance]);

  const updateMutation = trpc.payroll.allowances.update.useMutation({
    onSuccess: () => {
      toast.success("Allowance updated successfully!");
      utils.payroll.allowances.list.invalidate();
      navigate("/payroll");
    },
    onError: (error: any) => {
      toast.error(`Failed to update allowance: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.allowanceType || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsLoading(true);
    try {
      await mutateAsync(updateMutation, {
        id: id || "",
        allowanceType: formData.allowanceType,
        amount: parseInt(formData.amount) * 100,
        frequency: formData.frequency,
        notes: formData.notes || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <ModuleLayout title="Edit Allowance" icon={<Percent className="w-6 h-6" />}>
        <div className="flex items-center justify-center py-12"><Spinner className="h-8 w-8" /></div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Salary Allowance"
      description="Update salary allowance details"
      icon={<Percent className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Payroll", href: "/payroll" },
        { label: "Edit Allowance" },
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
            <CardTitle>Allowance Details</CardTitle>
            <CardDescription>Update the salary allowance details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="allowanceType">Allowance Type *</Label>
                <Select value={formData.allowanceType} onValueChange={(value) => setFormData({ ...formData, allowanceType: value })}>
                  <SelectTrigger><SelectValue placeholder="Select allowance type" /></SelectTrigger>
                  <SelectContent>
                    {ALLOWANCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KES) *</Label>
                  <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label htmlFor="notes">Notes</Label>
                <RichTextEditor value={formData.notes} onChange={(html) => setFormData({ ...formData, notes: html })} minHeight="100px" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/payroll")}>Cancel</Button>
                <Button type="submit" disabled={isLoading || updateMutation.isPending} className="bg-green-600 hover:bg-green-700">
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
