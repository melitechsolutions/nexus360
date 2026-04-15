import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";

export default function CreatePurchaseOrder() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"equipment" | "supplies" | "services" | "materials">("supplies");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.procurement.create.useMutation({
    onSuccess: () => {
      toast.success("Done");
      setLocation("/purchase-orders");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Name is required"); return; }
    if (quantity <= 0) { toast.error("Quantity must be greater than 0"); return; }
    if (price <= 0) { toast.error("Price must be greater than 0"); return; }
    createMutation.mutate({
      name,
      description: description || undefined,
      category,
      quantity,
      price,
      requiredDate: requiredDate ? new Date(requiredDate) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <ModuleLayout
      title="Create Purchase Order"
      icon={<ShoppingCart className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Procurement" },
        { label: "Create Purchase Order" },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purchase"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="equipment">Equipment</option>
                <option value="supplies">Supplies</option>
                <option value="services">Services</option>
                <option value="materials">Materials</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <Input
                  type="number"
                  value={quantity || ""}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit Price (KES) *</label>
                <Input
                  type="number"
                  value={price || ""}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Required Date</label>
              <Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setLocation("/purchase-orders")}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </ModuleLayout>
  );
}
