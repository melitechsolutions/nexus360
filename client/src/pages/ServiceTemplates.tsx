import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Eye, Edit, Trash2, Download, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import UnifiedModuleLayout, { DashboardCard, ContentSection, PrintOptimizedTable, MetadataDisplay } from "@/components/UnifiedModuleLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ServiceTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  hourlyRate?: number;
  fixedPrice?: number;
  unit?: string;
  taxRate: number;
  estimatedDuration?: number;
  deliverables?: string[];
  terms?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TemplateWithStats extends ServiceTemplate {
  usageStats?: {
    totalUsages: number;
    totalQuantity: number;
    totalDuration: number;
    estimatedRevenue: number;
    lastUsed?: Date;
  };
}

export default function ServiceTemplates() {
  const { allowed, isLoading: permLoading } = useRequireFeature("services:read");
  const canCreate = useRequireFeature("services:create").allowed;
  const canEdit = useRequireFeature("services:update").allowed;
  const canDelete = useRequireFeature("services:delete").allowed;

  const [, setLocation] = useLocation();
  const [templates, setTemplates] = useState<TemplateWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch service templates
  const listQuery = trpc.serviceTemplates.list.useQuery({}, {
    onSuccess: (data) => {
      setTemplates(data || []);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set((data || []).map(t => t.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories);
      
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(`Failed to load service templates: ${error.message}`);
      setIsLoading(false);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.serviceTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Service template deleted successfully");
      listQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (searchTerm) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter(t => t.category === categoryFilter);
    }

    return result;
  }, [templates, searchTerm, categoryFilter]);

  // Calculate stats
  const stats = {
    totalTemplates: templates.length,
    activeTemplates: templates.filter(t => t.isActive).length,
    totalValue: templates.reduce((sum, t) => sum + ((t.fixedPrice || 0) + (t.hourlyRate || 0) * 40), 0),
  };

  if (permLoading) return <Spinner />;
  if (!allowed) return <div className="text-center py-10 text-red-600">Access Denied</div>;

  return (
    <UnifiedModuleLayout
      title="Service Templates"
      description="Manage reusable service templates for invoicing and quotes"
      breadcrumbs={[
        { label: "Services", href: "/services" },
        { label: "Templates", href: "/service-templates" },
      ]}
      actions={canCreate ? (
        <Button onClick={() => setLocation("/service-templates/create")}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      ) : undefined}
      themeControl
      brandControl
      printable
    >
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <DashboardCard
          id="total-templates"
          title="Total Templates"
          value={stats.totalTemplates.toString()}
          subtitle={`${stats.activeTemplates} active`}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient={{ from: "#3b82f6", to: "#1d4ed8" }}
        />
        <DashboardCard
          id="active-templates"
          title="Active Templates"
          value={stats.activeTemplates.toString()}
          subtitle={stats.totalTemplates > 0 ? `${(stats.activeTemplates / stats.totalTemplates * 100).toFixed(0)}%` : "0%"}
          icon={<Eye className="w-5 h-5" />}
          gradient={{ from: "#22c55e", to: "#15803d" }}
        />
        <DashboardCard
          id="monthly-value"
          title="Est. Monthly Value"
          value={`KES ${(stats.totalValue / 100).toLocaleString()}`}
          subtitle="Based on hourly rates (40hrs)"
          icon={<TrendingUp className="w-5 h-5" />}
          gradient={{ from: "#a855f7", to: "#7e22ce" }}
        />
      </div>

      {/* Filters */}
      <ContentSection title="Filters" variant="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search templates by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ContentSection>

      {/* Templates Table */}
      {isLoading ? (
        <ContentSection variant="card">
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        </ContentSection>
      ) : filteredTemplates.length === 0 ? (
        <ContentSection variant="card">
          <div className="text-center py-10 text-gray-500">
            {templates.length === 0
              ? "No service templates created yet"
              : "No templates match your filters"}
          </div>
        </ContentSection>
      ) : (
        <ContentSection title="Service Templates" className="print-section">
          <PrintOptimizedTable
            columns={[
              { key: "name", label: "Template Name", width: 200 },
              { key: "category", label: "Category", width: 120 },
              { key: "pricing", label: "Pricing", width: 150 },
              { key: "unit", label: "Unit", width: 80 },
              { key: "taxRate", label: "Tax Rate", width: 80 },
              { key: "status", label: "Status", width: 100 },
              { key: "actions", label: "Actions", width: 150, printHidden: true },
            ]}
            data={filteredTemplates.map(template => ({
              name: template.name,
              category: template.category || "—",
              pricing: template.fixedPrice 
                ? `KES ${(template.fixedPrice / 100).toLocaleString()}`
                : template.hourlyRate
                ? `KES ${(template.hourlyRate / 100).toLocaleString()}/hr`
                : "Custom",
              unit: template.unit || "—",
              taxRate: `${template.taxRate}%`,
              status: (
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  template.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {template.isActive ? "Active" : "Inactive"}
                </span>
              ),
              actions: (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/service-templates/${template.id}`)}
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/service-templates/${template.id}/edit`)}
                      title="Edit template"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ),
            }))}
          />
        </ContentSection>
      )}

      {/* Footer metadata */}
      <MetadataDisplay
        items={[
          { label: "Total Records", value: filteredTemplates.length },
          { label: "Last Updated", value: new Date().toLocaleDateString() },
          { label: "System", value: "Service Template Management" },
        ]}
      />
    </UnifiedModuleLayout>
  );
}
