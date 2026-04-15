import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export default function CreateWarranty() {
  const [, navigate] = useLocation();

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

  const createMutation = trpc.warranty.create.useMutation({
    onSuccess: () => {
      toast.success("Warranty created successfully!");
      navigate("/warranty");
    },
    onError: (err: any) => toast.error(`Failed to create warranty: ${err.message}`),
  });

  const update = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product || !formData.vendor) {
      toast.error("Product and vendor are required");
      return;
    }
    createMutation.mutate({
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

  return (
    <ModuleLayout
      title="Add Warranty"
      icon={<Shield className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Warranties", href: "/warranty" },
        { label: "Add Warranty" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/warranty")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Create Warranty
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Warranty Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product">Product *</Label>
              <Input id="product" value={formData.product} onChange={(e) => update("product", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="vendor">Vendor *</Label>
              <Input id="vendor" value={formData.vendor} onChange={(e) => update("vendor", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input id="serialNumber" value={formData.serialNumber} onChange={(e) => update("serialNumber", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input id="expiryDate" type="date" value={formData.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="coverage">Coverage</Label>
              <Input id="coverage" value={formData.coverage} onChange={(e) => update("coverage", e.target.value)} placeholder="e.g. Full parts & labor" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="claimTerms">Claim Terms</Label>
              <RichTextEditor value={formData.claimTerms} onChange={(html) => update("claimTerms", html)} minHeight="100px" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <RichTextEditor value={formData.notes} onChange={(html) => update("notes", html)} minHeight="100px" />
            </div>
          </CardContent>
        </Card>
      </form>
    </ModuleLayout>
  );
}
