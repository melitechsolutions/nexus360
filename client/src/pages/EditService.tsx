import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
import { toast } from "sonner";
import { Briefcase, ArrowLeft, Trash2, Loader2, Save } from "lucide-react";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";

export default function EditService() {
  const { allowed, isLoading } = useRequireFeature("services:edit");
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const serviceId = params.id;
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    hourlyRate: "",
    fixedPrice: "",
    unit: "hour",
    taxRate: "",
    isActive: true,
  });

  // Fetch service data
  const { data: service, isLoading: isLoadingServiceData } = trpc.services.getById.useQuery(serviceId || "", {
    enabled: !!serviceId,
  });

  // Fetch categories and units for dropdowns
  const { data: categories = [] } = trpc.services.getCategories.useQuery();
  const { data: units = [] } = trpc.services.getUnits.useQuery();
  
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  // Default categories if none exist in database
  const defaultCategories = [
    "Consulting",
    "Development",
    "Design",
    "Support",
    "Training",
    "Maintenance",
    "Installation",
    "Repair",
    "Other",
  ];

  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  // Default units
  const defaultUnits = [
    { value: "hour", label: "Hour" },
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "project", label: "Project" },
    { value: "unit", label: "Unit" },
    { value: "item", label: "Item" },
    { value: "service", label: "Service" },
  ];

  const displayUnits = units.length > 0 
    ? units.map((u: string) => ({ value: u, label: u.charAt(0).toUpperCase() + u.slice(1) }))
    : defaultUnits;

  // Populate form when service data loads
  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || "",
        description: service.description || "",
        category: service.category || "",
        hourlyRate: service.hourlyRate ? (service.hourlyRate / 100).toString() : "",
        fixedPrice: service.fixedPrice ? (service.fixedPrice / 100).toString() : "",
        unit: service.unit || "hour",
        taxRate: service.taxRate ? (service.taxRate / 100).toString() : "",
        isActive: (service as any).isActive !== 0,
      });
    }
  }, [service]);

  const updateServiceMutation = trpc.services.update.useMutation({
    onSuccess: () => {
      toast.success("Service updated successfully!");
      utils.services.list.invalidate();
      utils.services.getById.invalidate(serviceId || "");
      navigate("/services");
    },
    onError: (error: any) => {
      toast.error(`Failed to update service: ${error.message}`);
    },
  });

  const deleteServiceMutation = trpc.services.delete.useMutation({
    onSuccess: () => {
      toast.success("Service deleted successfully!");
      utils.services.list.invalidate();
      navigate("/services");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete service: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Service name is required");
      return;
    }

    if (!serviceId) {
      toast.error("Service ID is missing");
      return;
    }

    updateServiceMutation.mutate({
      id: serviceId,
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category || undefined,
      hourlyRate: formData.hourlyRate ? Math.round(parseFloat(formData.hourlyRate) * 100) : undefined,
      fixedPrice: formData.fixedPrice ? Math.round(parseFloat(formData.fixedPrice) * 100) : undefined,
      unit: formData.unit || "hour",
      taxRate: formData.taxRate ? Math.round(parseFloat(formData.taxRate) * 100) : undefined,
      // Map boolean to API `status` enum for compatibility
      status: formData.isActive ? 'active' : 'inactive',
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this service? This action cannot be undone.")) {
      deleteServiceMutation.mutate(serviceId || "");
    }
  };

  if (isLoadingServiceData) {
    return (
      <ModuleLayout
        title="Edit Service"
        description="Loading service details..."
        icon={<Briefcase className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Products & Services", href: "/services" },
          { label: "Edit Service" },
        ]}
      >
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Service"
      description="Update service details"
      icon={<Briefcase className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Products & Services", href: "/services" },
        { label: "Edit Service" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Service</CardTitle>
            <CardDescription>
              Update the service details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter service name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter service description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayCategories.map((cat: string) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayUnits.map((unit: { value: string; label: string }) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (Ksh)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    placeholder="0.00"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData({ ...formData, hourlyRate: e.target.value })
                    }
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fixedPrice">Fixed Price (Ksh)</Label>
                  <Input
                    id="fixedPrice"
                    type="number"
                    placeholder="0.00"
                    value={formData.fixedPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, fixedPrice: e.target.value })
                    }
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  placeholder="0"
                  value={formData.taxRate}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRate: e.target.value })
                  }
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex gap-4 justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteServiceMutation.isPending}
                >
                  {deleteServiceMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete Service
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/services")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateServiceMutation.isPending}
                  >
                    {updateServiceMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Update Service
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
