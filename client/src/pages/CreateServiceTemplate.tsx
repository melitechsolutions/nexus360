import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import UnifiedModuleLayout, { ContentSection } from "@/components/UnifiedModuleLayout";
import { Checkbox } from "@/components/ui/checkbox";

interface ServiceTemplateForm {
  name: string;
  description?: string;
  category?: string;
  hourlyRate?: number;
  fixedPrice?: number;
  unit?: string;
  taxRate?: number;
  estimatedDuration?: number;
  deliverables?: string[];
  terms?: string;
  isActive?: boolean;
}

export default function CreateServiceTemplate() {
  const params = useParams();
  const templateId = params?.id;
  const isEditing = !!templateId;

  const { allowed: canView } = useRequireFeature("services:read");
  const { allowed: canCreate } = useRequireFeature("services:create");
  const { allowed: canEdit } = useRequireFeature("services:update");
  const [, setLocation] = useLocation();

  const [form, setForm] = useState<ServiceTemplateForm>({
    name: "",
    description: "",
    category: "",
    hourlyRate: undefined,
    fixedPrice: undefined,
    unit: "hour",
    taxRate: 0,
    estimatedDuration: undefined,
    deliverables: [],
    terms: "",
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [deliverableInput, setDeliverableInput] = useState("");

  // Fetch existing template if editing
  const getQuery = trpc.serviceTemplates.getById.useQuery(
    templateId || "",
    {
      enabled: isEditing,
      onSuccess: (data) => {
        if (data) {
          setForm({
            name: data.name,
            description: data.description || "",
            category: data.category || "",
            hourlyRate: data.hourlyRate ? data.hourlyRate / 100 : undefined,
            fixedPrice: data.fixedPrice ? data.fixedPrice / 100 : undefined,
            unit: data.unit || "hour",
            taxRate: data.taxRate || 0,
            estimatedDuration: data.estimatedDuration,
            deliverables: data.deliverables ? JSON.parse(data.deliverables) : [],
            terms: data.terms || "",
            isActive: data.isActive,
          });
        }
      },
      onError: (error) => {
        toast.error(`Failed to load template: ${error.message}`);
        setLocation("/service-templates");
      },
    }
  );

  // Create mutation
  const createMutation = trpc.serviceTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Service template created successfully");
      setLocation("/service-templates");
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
      setIsLoading(false);
    },
  });

  // Update mutation
  const updateMutation = trpc.serviceTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Service template updated successfully");
      setLocation("/service-templates");
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        hourlyRate: form.hourlyRate ? Math.round(form.hourlyRate * 100) : undefined,
        fixedPrice: form.fixedPrice ? Math.round(form.fixedPrice * 100) : undefined,
        unit: form.unit,
        taxRate: form.taxRate || 0,
        estimatedDuration: form.estimatedDuration,
        deliverables: form.deliverables,
        terms: form.terms,
        isActive: form.isActive,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: templateId!,
          ...payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAddDeliverable = () => {
    if (deliverableInput.trim()) {
      setForm(prev => ({
        ...prev,
        deliverables: [...(prev.deliverables || []), deliverableInput],
      }));
      setDeliverableInput("");
    }
  };

  const handleRemoveDeliverable = (index: number) => {
    setForm(prev => ({
      ...prev,
      deliverables: prev.deliverables?.filter((_, i) => i !== index),
    }));
  };

  const allowed = isEditing ? canEdit : canCreate;
  if (!allowed) return <div className="text-center py-10 text-red-600">Access Denied</div>;

  if (isEditing && getQuery.isLoading) {
    return <Spinner />;
  }

  return (
    <UnifiedModuleLayout
      pageTitle={isEditing ? "Edit Service Template" : "New Service Template"}
      pageDescription={isEditing ? "Update service template details" : "Create a new service template for reuse"}
      breadcrumbs={[
        { label: "Services", href: "/services" },
        { label: "Templates", href: "/service-templates" },
        { label: isEditing ? "Edit" : "Create", href: "#" },
      ]}
      secondaryAction={{
        label: "Back",
        icon: ArrowLeft,
        onClick: () => setLocation("/service-templates"),
      }}
    >
      <ContentSection title={isEditing ? "Edit Template" : "Create New Template"} variant="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Web Development Services"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Professional Services"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the service..."
                rows={4}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Pricing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate (KES)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={form.hourlyRate || ""}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    hourlyRate: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="fixedPrice">Fixed Price (KES)</Label>
                <Input
                  id="fixedPrice"
                  type="number"
                  step="0.01"
                  value={form.fixedPrice || ""}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    fixedPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={form.unit || "hour"} onValueChange={(value) => setForm(prev => ({ ...prev, unit: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="item">Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  value={form.taxRate || 0}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    taxRate: parseFloat(e.target.value),
                  }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="estimatedDuration">Estimated Duration (hours)</Label>
                <Input
                  id="estimatedDuration"
                  type="number"
                  step="0.5"
                  value={form.estimatedDuration || ""}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    estimatedDuration: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))}
                  placeholder="40"
                />
              </div>
            </div>
          </div>

          {/* Deliverables */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Deliverables</h3>
            <div className="flex gap-2">
              <Input
                value={deliverableInput}
                onChange={(e) => setDeliverableInput(e.target.value)}
                placeholder="Add a deliverable and press Add"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDeliverable();
                  }
                }}
              />
              <Button type="button" onClick={handleAddDeliverable} variant="outline">
                Add
              </Button>
            </div>
            {form.deliverables && form.deliverables.length > 0 && (
              <div className="space-y-2">
                {form.deliverables.map((d, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                    <span>{d}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDeliverable(i)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Terms</h3>
            <Textarea
              value={form.terms}
              onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
              placeholder="Enter terms and conditions..."
              rows={4}
            />
          </div>

          {/* Status */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.isActive !== false}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, isActive: !!checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4 border-t">
            <Button
              type="submit"
              disabled={isLoading || createMutation.isPending || updateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : isEditing ? "Update Template" : "Create Template"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/service-templates")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </ContentSection>
    </UnifiedModuleLayout>
  );
}
