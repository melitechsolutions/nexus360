import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { X, Plus, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export interface LineItem {
  itemNumber: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountPercent: number;
  amount: number;
}

interface ProcurementFormProps {
  title: string;
  type: "lpo" | "imprest" | "purchase-order";
  onSubmit: (data: any) => void;
}

export function ProcurementFormComponent({ title, type, onSubmit }: ProcurementFormProps) {
  const [supplierMode, setSupplierMode] = useState<"existing" | "manual">("manual");
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const { data: suppliersData } = trpc.suppliers?.list?.useQuery?.() ?? { data: undefined };
  const [formData, setFormData] = useState({
    documentNumber: "",
    supplier: "",
    supplierContact: "",
    deliveryAddress: "",
    deliveryDate: "",
    notes: "",
    lineItems: [
      {
        itemNumber: "001",
        itemName: "",
        description: "",
        quantity: 0,
        unitPrice: 0,
        discount: 0,
        discountPercent: 0,
        amount: 0,
      },
    ] as LineItem[],
  });

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          itemNumber: String(prev.lineItems.length + 1).padStart(3, "0"),
          itemName: "",
          description: "",
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountPercent: 0,
          amount: 0,
        },
      ],
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.lineItems.length > 1) {
      setFormData((prev) => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index),
      }));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setFormData((prev) => {
      const items = [...prev.lineItems];
      const item = { ...items[index], [field]: value };

      // Calculate amount based on quantity, unit price, and discount
      if (field === "quantity" || field === "unitPrice" || field === "discountPercent") {
        const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        const discountAmount = subtotal * ((Number(item.discountPercent) || 0) / 100);
        item.discount = Math.round(discountAmount * 100) / 100;
        item.amount = Math.round((subtotal - item.discount) * 100) / 100;
      } else if (field === "discount") {
        const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        item.discount = Number(value);
        item.discountPercent = subtotal > 0 ? Math.round((item.discount / subtotal) * 10000) / 100 : 0;
        item.amount = Math.round((subtotal - item.discount) * 100) / 100;
      }

      items[index] = item;
      return { ...prev, lineItems: items };
    });
  };

  const totalAmount = formData.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalDiscount = formData.lineItems.reduce((sum, item) => sum + (item.discount || 0), 0);
  const subtotal = formData.lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">{title}</h2>

        {/* Supplier Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Supplier / Vendor</Label>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Supplier *</Label>
              <Input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Enter supplier / vendor name"
                required
              />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Contact Person</Label>
              <Input
                type="text"
                value={formData.supplierContact}
                onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
                placeholder="Contact person name"
              />
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Document Details */}
        <div className="grid gap-4">
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <Label className="text-right text-sm">Document No.</Label>
            <Input
              type="text"
              value={formData.documentNumber}
              readOnly
              className="bg-muted cursor-not-allowed font-mono max-w-xs"
              placeholder="Auto-generated"
            />
          </div>
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <Label className="text-right text-sm">Delivery Date *</Label>
            <Input
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
              required
              className="max-w-xs"
            />
          </div>
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <Label className="text-right text-sm">Delivery Address *</Label>
            <Input
              type="text"
              value={formData.deliveryAddress}
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
              placeholder="Complete delivery address"
              required
            />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Additional Information - Collapsible */}
        <Collapsible open={showAdditionalInfo} onOpenChange={setShowAdditionalInfo}>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <span>Additional Information</span>
              {showAdditionalInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <Label className="text-right text-sm pt-2">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or special instructions"
                rows={3}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Line Items Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Line Items</h2>
          <Button type="button" onClick={addLineItem} size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />Add Item
          </Button>
        </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Item #
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Item Name *
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Description
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Qty *
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Unit Price *
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Discount %
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Amount
                  </th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-2">
                      <span className="text-gray-600 dark:text-gray-400">{item.itemNumber}</span>
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => updateLineItem(idx, "itemName", e.target.value)}
                        placeholder="Item name"
                        required
                        className="w-full"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                        placeholder="Description"
                        className="w-full"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                        required
                        className="w-full text-right"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="number"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                        className="w-full text-right"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="number"
                        value={item.discountPercent || ""}
                        onChange={(e) => updateLineItem(idx, "discountPercent", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full text-right"
                      />
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-gray-900 dark:text-white">
                      {item.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        disabled={formData.lineItems.length === 1}
                        title="Remove item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="flex justify-end mt-6">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono">{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Discount:</span>
                <span className="font-mono text-orange-500">-{totalDiscount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="font-mono text-primary">{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground"><strong>* Required</strong></p>
        <div className="flex gap-2">
          <Button type="button" variant="outline">Save as Draft</Button>
          <Button type="submit">Submit for Approval</Button>
        </div>
      </div>
    </form>
  );
}
