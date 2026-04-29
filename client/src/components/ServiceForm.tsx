import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Wrench, Loader2 } from "lucide-react";

interface ServiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
}

export function ServiceForm({ onSuccess, onCancel, initialData }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    serviceName: initialData?.serviceName || "",
    description: initialData?.description || "",
    serviceType: initialData?.serviceType || "",
    rate: initialData?.rate || "",
    unit: initialData?.unit || "hour",
    status: initialData?.status || "active",
  });

  const { data: categories = [] } = trpc.services.getCategories.useQuery({});
  const { data: units = [] } = trpc.services.getUnits.useQuery({});

  const createServiceMutation = trpc.services.create.useMutation({
    onSuccess: () => {
      toast.success("Service created successfully");
      setFormData({
        serviceName: "",
        description: "",
        serviceType: "",
        rate: "",
        unit: "hour",
        status: "active",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create service");
    },
  });

  const updateServiceMutation = trpc.services.update.useMutation({
    onSuccess: () => {
      toast.success("Service updated successfully");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update service");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serviceName || !formData.rate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const serviceData = {
      serviceName: formData.serviceName,
      description: formData.description,
      serviceType: formData.serviceType,
      rate: parseFloat(formData.rate),
      unit: formData.unit,
      status: formData.status as any,
    };

    if (initialData?.id) {
      updateServiceMutation.mutate({
        id: initialData.id,
        ...serviceData,
      });
    } else {
      createServiceMutation.mutate(serviceData);
    }
  };

  const isLoading = createServiceMutation.isPending || updateServiceMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          {initialData ? "Edit Service" : "Create New Service"}
        </CardTitle>
        <CardDescription>
          {initialData ? "Update service details" : "Add a new service to your offerings"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Name */}
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name *</Label>
              <Input
                id="serviceName"
                placeholder="e.g., Web Development"
                value={formData.serviceName}
                onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                required
              />
            </div>

            {/* Service Type / Category */}
            <div className="space-y-2">
              <Label htmlFor="serviceType">Category</Label>
              <Select value={formData.serviceType} onValueChange={(value) => setFormData({ ...formData, serviceType: value })}>
                <SelectTrigger id="serviceType">
                  <SelectValue placeholder="Select or type category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rate */}
            <div className="space-y-2">
              <Label htmlFor="rate">Rate (Ksh) *</Label>
              <Input
                id="rate"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                required
              />
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add service details, what's included, etc..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initialData ? "Update Service" : "Create Service"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
