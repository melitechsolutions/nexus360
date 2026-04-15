import { useParams, useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Edit, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import UnifiedModuleLayout, { ContentSection, MetadataDisplay } from "@/components/UnifiedModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ServiceTemplateDetails() {
  const params = useParams();
  const templateId = params?.id;
  const [, setLocation] = useLocation();

  const { allowed: canView } = useRequireFeature("services:read");
  const { allowed: canEdit } = useRequireFeature("services:update");
  const { allowed: canDelete } = useRequireFeature("services:delete");

  // Fetch template details
  const getQuery = trpc.serviceTemplates.getById.useQuery(templateId || "", {
    enabled: !!templateId,
    onError: (error) => {
      toast.error(`Failed to load template: ${error.message}`);
      setLocation("/service-templates");
    },
  });

  // Fetch usage stats
  const statsQuery = trpc.serviceTemplates.getUsageStats.useQuery(templateId || "", {
    enabled: !!templateId,
  });

  // Delete mutation
  const deleteMutation = trpc.serviceTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Service template deleted successfully");
      setLocation("/service-templates");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(templateId!);
    }
  };

  if (!canView) return <div className="text-center py-10 text-red-600">Access Denied</div>;
  if (getQuery.isLoading || !getQuery.data) return <Spinner />;

  const template = getQuery.data;
  const stats = statsQuery.data;
  const deliverables = template.deliverables 
    ? typeof template.deliverables === 'string' 
      ? JSON.parse(template.deliverables)
      : template.deliverables
    : [];

  return (
    <UnifiedModuleLayout
      pageTitle={template.name}
      pageDescription="Service template details and usage information"
      breadcrumbs={[
        { label: "Services", href: "/services" },
        { label: "Templates", href: "/service-templates" },
        { label: template.name, href: "#" },
      ]}
      secondaryAction={{
        label: "Back",
        icon: ArrowLeft,
        onClick: () => setLocation("/service-templates"),
      }}
      primaryAction={canEdit ? {
        label: "Edit",
        icon: Edit,
        onClick: () => setLocation(`/service-templates/${template.id}/edit`),
      } : undefined}
    >
      {/* Status Badge */}
      <ContentSection variant="card" className="mb-4">
        <div className="flex items-center gap-2">
          <Badge variant={template.isActive ? "default" : "secondary"}>
            {template.isActive ? "Active" : "Inactive"}
          </Badge>
          {template.category && (
            <Badge variant="outline">{template.category}</Badge>
          )}
        </div>
      </ContentSection>

      {/* Template Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Description */}
        {template.description && (
          <ContentSection title="Description" variant="card">
            <p className="text-gray-700">{template.description}</p>
          </ContentSection>
        )}

        {/* Pricing */}
        <ContentSection title="Pricing" variant="card">
          <div className="space-y-2">
            {template.fixedPrice && (
              <div className="flex justify-between">
                <span>Fixed Price:</span>
                <span className="font-semibold">KES {(template.fixedPrice / 100).toLocaleString()}</span>
              </div>
            )}
            {template.hourlyRate && (
              <div className="flex justify-between">
                <span>Hourly Rate:</span>
                <span className="font-semibold">KES {(template.hourlyRate / 100).toLocaleString()}/hr</span>
              </div>
            )}
            {!template.fixedPrice && !template.hourlyRate && (
              <div className="text-gray-500">Custom pricing</div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span>Tax Rate:</span>
              <span className="font-semibold">{template.taxRate}%</span>
            </div>
          </div>
        </ContentSection>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ContentSection title="Unit" variant="card">
          <p className="text-lg font-semibold">{template.unit || "—"}</p>
        </ContentSection>
        <ContentSection title="Est. Duration" variant="card">
          <p className="text-lg font-semibold">
            {template.estimatedDuration ? `${template.estimatedDuration} hours` : "—"}
          </p>
        </ContentSection>
        <ContentSection title="Created" variant="card">
          <p className="text-lg font-semibold">
            {new Date(template.createdAt).toLocaleDateString()}
          </p>
        </ContentSection>
      </div>

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <ContentSection title="Deliverables" variant="card" className="mb-6">
          <ul className="space-y-2">
            {deliverables.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      {/* Terms */}
      {template.terms && (
        <ContentSection title="Terms & Conditions" variant="card" className="mb-6">
          <p className="text-gray-700 whitespace-pre-wrap">{template.terms}</p>
        </ContentSection>
      )}

      {/* Usage Statistics */}
      {stats && (
        <ContentSection title="Usage Statistics" variant="card" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Uses</p>
              <p className="text-2xl font-bold">{stats.totalUsages}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Quantity</p>
              <p className="text-2xl font-bold">{stats.totalQuantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Duration</p>
              <p className="text-2xl font-bold">{stats.totalDuration} hrs</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Est. Revenue</p>
              <p className="text-2xl font-bold">KES {(stats.estimatedRevenue / 100).toLocaleString()}</p>
            </div>
          </div>
          {stats.lastUsed && (
            <p className="mt-4 text-sm text-gray-500">
              Last used: {new Date(stats.lastUsed).toLocaleDateString()}
            </p>
          )}
        </ContentSection>
      )}

      {/* Actions */}
      <ContentSection variant="card" className="flex gap-2">
        {canEdit && (
          <Button onClick={() => setLocation(`/service-templates/${template.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Template
          </Button>
        )}
        {canDelete && (
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Template
          </Button>
        )}
        <Button variant="outline" onClick={() => setLocation("/service-templates")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </ContentSection>

      {/* Footer metadata */}
      <MetadataDisplay
        items={{
          "Template ID": template.id,
          "Created": new Date(template.createdAt).toLocaleString(),
          "Last Updated": new Date(template.updatedAt).toLocaleString(),
        }}
        variant="footer"
      />
    </UnifiedModuleLayout>
  );
}
