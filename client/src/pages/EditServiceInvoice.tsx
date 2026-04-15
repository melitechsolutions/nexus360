import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useRequireFeature } from "@/lib/permissions";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface ServiceItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface EditServiceInvoiceProps {
  params?: { id: string };
}

export default function EditServiceInvoice({ params }: EditServiceInvoiceProps) {
  const [, setLocation] = useLocation();
  const id = params?.id || "";
  const { allowed, isLoading: permLoading } = useRequireFeature("accounting:service-invoices:edit");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    serviceInvoiceNumber: "",
    issueDate: "",
    dueDate: "",
    clientId: "",
    clientName: "",
    serviceDescription: "",
    taxAmount: "0",
    notes: "",
    status: "draft",
  });

  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  const getQuery = trpc.serviceInvoices.get.useQuery({ id });
  const updateMutation = trpc.serviceInvoices.update.useMutation({
    onSuccess: () => {
      toast.success("Service invoice updated successfully!");
      setLocation("/service-invoices");
    },
    onError: (error: any) => {
      toast.error(`Failed to update service invoice: ${error.message}`);
    },
  });

  useEffect(() => {
    if (getQuery.data) {
      const si = getQuery.data as any;
      setFormData({
        serviceInvoiceNumber: si.serviceInvoiceNumber || "",
        issueDate: new Date(si.issueDate).toISOString().split("T")[0],
        dueDate: new Date(si.dueDate).toISOString().split("T")[0],
        clientId: si.clientId || "",
        clientName: si.clientName || "",
        serviceDescription: si.serviceDescription || "",
        taxAmount: si.taxAmount?.toString() || "0",
        notes: si.notes || "",
        status: si.status || "draft",
      });
      setServiceItems(
        si.serviceItems?.map((item: any) => ({
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
        })) || []
      );
    }
  }, [getQuery.data]);

  const calculateTotal = () => {
    const itemsTotal = serviceItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
    return itemsTotal + (parseFloat(formData.taxAmount) || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const total = calculateTotal();

      updateMutation.mutate({
        id,
        serviceInvoiceNumber: formData.serviceInvoiceNumber,
        issueDate: new Date(formData.issueDate),
        dueDate: new Date(formData.dueDate),
        clientId: formData.clientId,
        clientName: formData.clientName,
        serviceDescription: formData.serviceDescription,
        serviceItems: serviceItems.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          total: (parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
        })),
        total,
        taxAmount: parseFloat(formData.taxAmount) || 0,
        notes: formData.notes,
        status: formData.status as any,
      });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addServiceItem = () => {
    setServiceItems([...serviceItems, { description: "", quantity: "1", unitPrice: "0" }]);
  };

  const removeServiceItem = (index: number) => {
    setServiceItems(serviceItems.filter((_, i) => i !== index));
  };

  if (permLoading || getQuery.isLoading) return <Spinner />;
  if (!allowed) return <div className="text-center py-10">Access Denied</div>;
  if (getQuery.isError) return <div className="text-center py-10">Service Invoice not found</div>;

  return (
    <ModuleLayout
      title="Edit Service Invoice"
      description="Update service invoice details"
      icon={<Pencil className="w-5 h-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Service Invoices", href: "/service-invoices" }, { label: "Edit" }]}
      backLink={{ label: "Service Invoices", href: "/service-invoices" }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Edit Service Invoice</CardTitle>
          <CardDescription>Update the details for this service invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="serviceInvoiceNumber">Invoice Number *</Label>
                <Input
                  id="serviceInvoiceNumber"
                  value={formData.serviceInvoiceNumber}
                  onChange={(e) => setFormData({ ...formData, serviceInvoiceNumber: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="clientId">Client ID *</Label>
                <Input
                  id="clientId"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="serviceDescription">Service Description *</Label>
              <Textarea
                id="serviceDescription"
                value={formData.serviceDescription}
                onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Service Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addServiceItem}
                  disabled={serviceItems.length >= 50}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {serviceItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...serviceItems];
                        newItems[index].description = e.target.value;
                        setServiceItems(newItems);
                      }}
                    />
                    <Input
                      placeholder="Quantity"
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...serviceItems];
                        newItems[index].quantity = e.target.value;
                        setServiceItems(newItems);
                      }}
                    />
                    <Input
                      placeholder="Unit Price"
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...serviceItems];
                        newItems[index].unitPrice = e.target.value;
                        setServiceItems(newItems);
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeServiceItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="taxAmount">Tax Amount (KES)</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                />
              </div>

              <div className="flex items-end">
                <div className="text-lg font-bold">
                  Total: KES {calculateTotal().toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || updateMutation.isPending}>
                {isLoading || updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/service-invoices")}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
