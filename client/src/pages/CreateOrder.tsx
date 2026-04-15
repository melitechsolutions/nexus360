import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2, SaveIcon, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";

interface OrderLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function CreateOrder() {
  const [, navigate] = useLocation();
  const [orderNumber, setOrderNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);

  const { data: rawSuppliers = [] } = trpc.suppliers.list.useQuery();
  const suppliers = JSON.parse(JSON.stringify(rawSuppliers)) as any[];
  const createLpo = trpc.lpo.create.useMutation();

  const handleAddLineItem = () => {
    const newItem: OrderLineItem = {
      id: String(Date.now()),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    } else {
      toast.error("Order must have at least one line item");
    }
  };

  const handleUpdateLineItem = (
    id: string,
    field: keyof OrderLineItem,
    value: any
  ) => {
    const updatedItems = lineItems.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate total
        if (field === "quantity" || field === "unitPrice") {
          updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      }
      return item;
    });
    setLineItems(updatedItems);
  };

  const getTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSave = async () => {
    if (!orderNumber.trim()) {
      toast.error("Order number is required");
      return;
    }

    if (!vendorId) {
      toast.error("Please select a vendor");
      return;
    }

    if (lineItems.some((item) => !item.description)) {
      toast.error("All line items must have a description");
      return;
    }

    setIsLoading(true);
    try {
      await createLpo.mutateAsync({
        vendorId,
        description: `${orderNumber} — ${notes}`.trim(),
        amount: getTotalAmount(),
      });

      toast.success("Purchase order created successfully");
      navigate("/procurement");
    } catch (error) {
      toast.error("Failed to create purchase order");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModuleLayout
      title="Create Purchase Order"
      description="Create a new purchase order for vendor management"
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "Orders", href: "/orders" },
        { label: "Create Order" },
      ]}
    >
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/orders")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Order Header */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>

          <div className="space-y-3">
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm font-medium">Order Number <span className="text-red-500">*</span></Label>
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., PO-2024-001"
              />
            </div>

            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm font-medium">Vendor <span className="text-red-500">*</span></Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name || supplier.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm font-medium">Order Date</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="max-w-[200px]"
              />
            </div>

            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm font-medium">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="max-w-[200px]"
              />
            </div>

            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Additional Information - Collapsible */}
          <Collapsible open={additionalInfoOpen} onOpenChange={setAdditionalInfoOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
              {additionalInfoOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Additional Information
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="grid grid-cols-[140px_1fr] items-start gap-3">
                <Label className="text-sm font-medium pt-2">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or special instructions"
                  rows={3}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Line Items */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <Button size="sm" onClick={handleAddLineItem} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="grid md:grid-cols-5 gap-4 p-4 border rounded-lg">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-semibold text-gray-600">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      handleUpdateLineItem(item.id, "description", e.target.value)
                    }
                    placeholder="Item description"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600">Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleUpdateLineItem(item.id, "quantity", Number(e.target.value))
                    }
                    min="1"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600">Unit Price</Label>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleUpdateLineItem(item.id, "unitPrice", Number(e.target.value))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <div className="text-sm font-semibold">
                    Total: KES {item.total.toFixed(2)}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveLineItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-gray-600 mb-2">Order Total</p>
              <p className="text-3xl font-bold text-blue-600">
                KES {getTotalAmount().toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate("/orders")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isLoading}
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        </div>
      </div>
    </ModuleLayout>
  );
}

