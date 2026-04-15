import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, ArrowLeft, Save, Building2, DollarSign, ClipboardList, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function CreateLPO() {
  const [, setLocation] = useLocation();
  const [vendorId, setVendorId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");

  const { data: suppliers = [] } = trpc.suppliers.list.useQuery({ limit: 100 });

  const createMutation = trpc.lpo.create.useMutation({
    onSuccess: () => {
      toast.success("LPO created successfully");
      setLocation("/lpos");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) { toast.error("Please select a vendor/supplier"); return; }
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) { toast.error("Amount must be greater than 0"); return; }
    createMutation.mutate({ vendorId, description: description || undefined, amount: parsedAmount });
  };

  return (
    <ModuleLayout
      title="Create Local Purchase Order"
      description="Create a new LPO for procurement"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "LPOs", href: "/lpos" },
        { label: "Create LPO" },
      ]}
    >
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6 p-4 sm:p-6">
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
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Choose a supplier..." /></SelectTrigger>
                <SelectContent>
                  {(Array.isArray(suppliers) ? suppliers : (suppliers as any)?.data ?? []).map((s: any) => (
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
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="0.01" min="0" className="pl-9" required />
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
              <RichTextEditor value={description} onChange={setDescription} placeholder="Describe what is being purchased, quantities, specifications..." minHeight="140px" />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setLocation("/lpos")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || !vendorId || !amount}>
            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {createMutation.isPending ? "Creating..." : "Create LPO"}
          </Button>
        </div>
      </form>
    </ModuleLayout>
  );
}
