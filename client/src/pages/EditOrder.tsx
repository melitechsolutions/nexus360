import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Spinner } from "@/components/ui/spinner";

interface OrderLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function EditOrder() {
  const [, navigate] = useLocation();
  const orderId = new URLSearchParams(window.location.search).get("id") || "";

  const [orderNumber, setOrderNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: rawSuppliers = [] } = trpc.suppliers.list.useQuery();
  const suppliers = JSON.parse(JSON.stringify(rawSuppliers));

  const { data: rawOrder, isLoading: isFetching } = trpc.lpo.getById.useQuery(orderId, { enabled: !!orderId });
  const order = rawOrder ? JSON.parse(JSON.stringify(rawOrder)) : null;

  const updateMutation = trpc.lpo.update.useMutation({
    onSuccess: () => {
      toast.success("Purchase order updated successfully");
      navigate("/procurement");
    },
    onError: () => toast.error("Failed to update purchase order"),
  });

  useEffect(() => {
    if (order) {
      setOrderNumber(order.lpoNumber || "");
      setVendorId(order.vendorId || "");
      setStatus(order.status || "draft");
      setNotes(order.description || "");
    }
  }, [order]);

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
      await updateMutation.mutateAsync({
        id: orderId,
        status: status as any,
        description: notes || undefined,
        amount: getTotalAmount() > 0 ? getTotalAmount() : undefined,
      });
    } catch (error) {
      // error handled by mutation onError
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <ModuleLayout
        title="Edit Purchase Order"
        description="Modify purchase order details"
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Procurement", href: "/procurement" },
          { label: "Orders", href: "/orders" },
          { label: "Edit Order" },
        ]}
      >
        <div className="flex items-center justify-center h-screen">
          <Spinner className="size-8" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Purchase Order"
      description="Modify purchase order details and line items"
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Procurement", href: "/procurement" },
        { label: "Orders", href: "/orders" },
        { label: "Edit Order" },
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
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number *</Label>
                <Input
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., PO-2024-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger id="vendor">
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

              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or special instructions"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" onClick={handleAddLineItem} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lineItems.map((item) => (
                <div key={item.id} className="grid md:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`desc-${item.id}`}>Description</Label>
                    <Input
                      id={`desc-${item.id}`}
                      value={item.description}
                      onChange={(e) =>
                        handleUpdateLineItem(item.id, "description", e.target.value)
                      }
                      placeholder="Item description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`qty-${item.id}`}>Quantity</Label>
                    <Input
                      id={`qty-${item.id}`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateLineItem(item.id, "quantity", Number(e.target.value))
                      }
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`price-${item.id}`}>Unit Price</Label>
                    <Input
                      id={`price-${item.id}`}
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleUpdateLineItem(item.id, "unitPrice", Number(e.target.value))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2 flex flex-col justify-end">
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

            {/* Total */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-gray-600 mb-2">Order Total</p>
                  <p className="text-3xl font-bold text-blue-600">
                    KES {getTotalAmount().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
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
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="w-4 h-4 mr-2" />
                Update Order
              </>
            )}
          </Button>
        </div>
      </div>
    </ModuleLayout>
  );
}
