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
import { ArrowLeft, Save, Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

export default function EditWarranty() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    product: "",
    vendor: "",
    expiryDate: "",
    coverage: "",
    status: "active" as "active" | "expiring_soon" | "expired",
    serialNumber: "",
    claimTerms: "",
    notes: "",
  });

  const { data: warranty, isLoading: isLoadingData } = trpc.warranty.getById.useQuery(id || "", { enabled: !!id });

  useEffect(() => {
    if (warranty) {
      setFormData({
        product: warranty.product || "",
        vendor: warranty.vendor || "",
        expiryDate: warranty.expiryDate ? new Date(warranty.expiryDate).toISOString().split("T")[0] : "",
        coverage: warranty.coverage || "",
        status: (warranty.status as any) || "active",
        serialNumber: warranty.serialNumber || "",
        claimTerms: warranty.claimTerms || "",
        notes: warranty.notes || "",
      });
    }
  }, [warranty]);

  const updateMutation = trpc.warranty.update.useMutation({
    onSuccess: () => {
      toast.success("Warranty updated successfully!");
      utils.warranty.list.invalidate();
      utils.warranty.getById.invalidate(id || "");
      navigate("/warranty");
    },
    onError: (error: any) => {
      toast.error(`Failed to update warranty: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product || !formData.vendor || !formData.expiryDate || !formData.coverage) {
      toast.error("Please fill in all required fields");
      return;
    }
    updateMutation.mutate({
      id: id || "",
      product: formData.product,
      vendor: formData.vendor,
      expiryDate: formData.expiryDate,
      coverage: formData.coverage,
      status: formData.status,
      serialNumber: formData.serialNumber || undefined,
      claimTerms: formData.claimTerms || undefined,
      notes: formData.notes || undefined,
    });
  };

  if (isLoadingData) {
    return (
      <ModuleLayout title="Edit Warranty" icon={<ShieldCheck className="w-6 h-6" />}>
        <div className="flex items-center justify-center py-12"><Spinner className="h-8 w-8" /></div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Warranty"
      description="Update warranty record details"
      icon={<ShieldCheck className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Warranty", href: "/warranty" },
        { label: "Edit Warranty" },
      ]}
      actions={
        <Button variant="outline" onClick={() => navigate("/warranty")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Warranties
        </Button>
      }
    >
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Warranty Details</CardTitle>
            <CardDescription>Update the warranty record</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product *</Label>
                  <Input id="product" value={formData.product} onChange={(e) => setFormData({ ...formData, product: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor *</Label>
                  <Input id="vendor" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input id="expiryDate" type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverage">Coverage *</Label>
                <Input id="coverage" value={formData.coverage} onChange={(e) => setFormData({ ...formData, coverage: e.target.value })} required placeholder="e.g., Full, Parts Only" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="claimTerms">Claim Terms</Label>
                <RichTextEditor value={formData.claimTerms} onChange={(html) => setFormData({ ...formData, claimTerms: html })} minHeight="100px" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <RichTextEditor value={formData.notes} onChange={(html) => setFormData({ ...formData, notes: html })} minHeight="100px" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/warranty")}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
