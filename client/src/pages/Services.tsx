import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import DashboardLayout from "@/components/DashboardLayout";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ServiceSearchFilter, type ServiceFilters } from "@/components/SearchAndFilter";
import { trpc } from "@/lib/trpc";
import {
  Wrench,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  DollarSign,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

export default function Services() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("services:view");
  
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ServiceFilters>({
    category: "all",
    status: "all",
    sortBy: "name",
    sortOrder: "asc",
  });

  // Fetch services from backend
  const { data: services = [], isLoading: isLoadingServices } = trpc.services.list.useQuery();
  const utils = trpc.useUtils();
  
  // Delete mutation
  const deleteServiceMutation = trpc.services.delete.useMutation({
    onSuccess: () => {
      toast.success("Service deleted successfully");
      utils.services.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete service");
    },
  });

  const filteredServices = services
    .filter(
      (service: any) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a: any, b: any) => {
      let aVal: any = a[filters.sortBy as keyof typeof a];
      let bVal: any = b[filters.sortBy as keyof typeof b];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    if (confirm(`Are you sure you want to delete service "${serviceName}"?`)) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <ModuleLayout
      title="Services"
      description="Manage your service offerings and rates"
      icon={<Wrench className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Products & Services", href: "/services" },
        { label: "Services", href: "/services" },
      ]}
      actions={
        <Button onClick={() => navigate("/services/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      }
    >
      <div className="space-y-6">
        <ServiceSearchFilter
          onSearch={setSearchQuery}
          onFilter={setFilters}
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Total Services" value={services.length} icon={<Wrench className="h-5 w-5" />} color="border-l-orange-500" />
          <StatsCard
            label="Active"
            value={services.filter((s: any) => s.isActive !== 0).length}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="border-l-green-500"
          />
          <StatsCard
            label="Avg Rate"
            value={<>Ksh {services.length > 0 ? (services.reduce((sum: number, s: any) => sum + Number(s.hourlyRate || s.fixedPrice || 0), 0) / (services.length * 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}</>}
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-blue-500"
          />
          <StatsCard
            label="Inactive"
            value={services.filter((s: any) => s.isActive === 0).length}
            icon={<XCircle className="h-5 w-5" />}
            color="border-l-red-500"
          />
        </div>

        {/* Services Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Rate/Price</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading services...
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No services found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service: any) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.category || "Uncategorized"}</TableCell>
                      <TableCell>
                        Ksh {(Number(service.hourlyRate || service.fixedPrice || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{service.unit || "hour"}</TableCell>
                      <TableCell>
                        {service.isActive !== 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/services/${service.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/services/${service.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteService(service.id, service.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
