import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ModuleLayout } from "@/components/ModuleLayout";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, ArrowLeft, Save, Building2, DollarSign, ClipboardList, Loader2, Hash, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function EditLPO() {
  const { allowed, isLoading } = useRequireFeature("procurement:lpo:edit");
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/lpos/:id/edit");
  const utils = trpc.useUtils();
  const lpoId = params?.id;

  const [formData, setFormData] = useState({
    vendorId: "",
    vendorName: "",
    description: "",
    amount: 0,
    lpoNumber: "",
    status: "draft",
  });
  const [isLoadingLPO, setIsLoadingLPO] = useState(true);

  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 100 });

  const getLPO = trpc.lpo.getById.useQuery(lpoId || "", {
    enabled: !!lpoId,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          vendorId: data.vendorId,
          vendorName: data.vendorName || "",
          description: data.description || "",
          amount: data.amount ? data.amount / 100 : 0,
          lpoNumber: data.lpoNumber,
          status: (data as any).status || "draft",
        });
      }
      setIsLoadingLPO(false);
    },
    onError: () => { toast.error("Failed to load LPO"); setIsLoadingLPO(false); },
  });

  const updateMutation = trpc.lpo.update.useMutation({
    onSuccess: () => {
      toast.success("LPO updated successfully!");
      utils.lpo.list.invalidate();
      navigate("/lpos");
    },
    onError: (error: any) => toast.error(`Failed to update LPO: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpoId) { toast.error("LPO ID not found"); return; }
    if (!formData.vendorId || formData.amount <= 0) { toast.error("Please fill in vendor and amount"); return; }
    updateMutation.mutate({
      id: lpoId,
      description: formData.description || undefined,
      amount: Math.round(formData.amount * 100),
      status: formData.status as any,
    });
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Procurement", href: "/procurement" },
    { label: "LPOs", href: "/lpos" },
    { label: "Edit LPO" },
  ];

  if (isLoading || isLoadingLPO) {
    return (
      <ModuleLayout title="Edit Local Purchase Order" description="Update LPO details" icon={<FileText className="w-6 h-6" />} breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center p-8"><Spinner /></div>
      </ModuleLayout>
    );
  }

  const suppliersList = Array.isArray(suppliers) ? suppliers : (suppliers as any)?.data ?? [];

  return (
    <ModuleLayout title="Edit Local Purchase Order" description="Update LPO details" icon={<FileText className="w-6 h-6" />} breadcrumbs={breadcrumbs}>
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6 p-4 sm:p-6">
        {/* LPO Number & Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              LPO Reference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>LPO Number</Label>
                <Input value={formData.lpoNumber} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor / Supplier */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Vendor / Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:w-1/2">
              <Label>Select Supplier *</Label>
              <Select value={formData.vendorId} onValueChange={v => setFormData({ ...formData, vendorId: v })}>
                <SelectTrigger><SelectValue placeholder="Choose a supplier..." /></SelectTrigger>
                <SelectContent>
                  {suppliersList.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name || s.companyName || s.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Value */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:w-1/2">
              <Label>Amount (KES) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="number" step="0.01" min="0" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="pl-9" required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Purchase Description</Label>
              <RichTextEditor value={formData.description} onChange={v => setFormData({ ...formData, description: v })} placeholder="Describe what is being purchased, quantities, specifications..." minHeight="140px" />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate("/lpos")}>
            <ArrowLeft className="w-4 h-4 mr-2" />Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {updateMutation.isPending ? "Updating..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </ModuleLayout>
  );
}
