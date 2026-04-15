/**
 * Enterprise Tenants Management
 * Super admin page for managing all tenants/organizations
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Edit2,
  Users,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortField = "name" | "plan" | "createdAt" | "maxUsers";
type SortOrder = "asc" | "desc";

export default function EnterpriseTenantsManagement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Check if super admin
  if (user?.role !== "super_admin") {
    navigate("/");
    return null;
  }

  // State
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string | undefined>();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>();
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [updateFormData, setUpdateFormData] = useState({
    name: "",
    slug: "",
    plan: "",
    maxUsers: 10,
    isActive: true,
  });
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [selectedTierPlan, setSelectedTierPlan] = useState<string>("");
  const [selectedTierMaxUsers, setSelectedTierMaxUsers] = useState<number>(10);

  // Queries
  const { data: tenantsData, isLoading, refetch } = trpc.enterpriseTenants.list.useQuery({
    search: search || undefined,
    tier: tierFilter,
    isActive: isActiveFilter,
    sortBy,
    sortOrder,
    limit: 100,
    offset: 0,
  });

  const { data: pricingTiers = [], isLoading: tiersLoading } = trpc.enterpriseTenants.getPricingTiers.useQuery();

  // Mutations
  const updateMutation = trpc.enterpriseTenants.update.useMutation({
    onSuccess: () => {
      toast.success("Tenant updated successfully");
      setShowUpdateDialog(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePricingMutation = trpc.enterpriseTenants.updatePricingTier.useMutation({
    onSuccess: () => {
      toast.success("Pricing tier updated successfully");
      setShowTierDialog(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers
  const openUpdateDialog = (tenant: any) => {
    setSelectedTenant(tenant);
    setUpdateFormData({
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      maxUsers: tenant.maxUsers,
      isActive: tenant.isActive === 1,
    });
    setShowUpdateDialog(true);
  };

  const handleUpdateTenant = () => {
    if (!selectedTenant) return;

    updateMutation.mutate({
      tenantId: selectedTenant.id,
      name: updateFormData.name,
      slug: updateFormData.slug,
      plan: updateFormData.plan,
      maxUsers: updateFormData.maxUsers,
      isActive: updateFormData.isActive,
    });
  };

  const openTierDialog = (tenant: any) => {
    setSelectedTenant(tenant);
    setSelectedTierPlan(tenant.activePlan?.id || "");
    setSelectedTierMaxUsers(tenant.maxUsers || 10);
    setShowTierDialog(true);
  };

  const handleUpdateTier = () => {
    if (!selectedTenant || !selectedTierPlan) return;

    updatePricingMutation.mutate({
      tenantId: selectedTenant.id,
      planId: selectedTierPlan,
      maxUsers: selectedTierMaxUsers,
    });
  };

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      starter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      professional: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      enterprise: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    };
    return colors[tier] || "bg-gray-100 text-gray-800";
  };

  return (
    <ModuleLayout
      title="Enterprise Tenants"
      description="Manage all tenant organizations, plans, and user limits"
      icon={<Users className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm/super-admin" },
        { label: "Enterprise", href: "/enterprise" },
        { label: "Tenants Management" },
      ]}
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenantsData?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenantsData?.tenants?.filter((t) => t.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenantsData?.tenants?.reduce((sum, t) => sum + (t.userCount || 0), 0) || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pricingTiers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Tiers</TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-4">
            {/* Toolbar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search tenants..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={tierFilter || ""} onValueChange={(v) => setTierFilter(v || undefined)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Tiers</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={isActiveFilter === undefined ? "" : isActiveFilter ? "active" : "inactive"} onValueChange={(v) => {
                      if (v === "") setIsActiveFilter(undefined);
                      else setIsActiveFilter(v === "active");
                    }}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Tenants Table */}
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Spinner className="mr-2" />
                    Loading tenants...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer" onClick={() => {
                            if (sortBy === "name") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setSortBy("name");
                              setSortOrder("asc");
                            }
                          }}>
                            <div className="flex items-center gap-2">
                              Name
                              {sortBy === "name" && (
                                sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => {
                            if (sortBy === "plan") {
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            } else {
                              setSortBy("plan");
                              setSortOrder("asc");
                            }
                          }}>
                            <div className="flex items-center gap-2">
                              Plan
                              {sortBy === "plan" && (
                                sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              Users
                            </div>
                          </TableHead>
                          <TableHead>Max Users</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantsData?.tenants?.map((tenant) => (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-medium">{tenant.name}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">{tenant.slug}</TableCell>
                            <TableCell>
                              <Badge className={getTierBadgeColor(tenant.plan)}>
                                {tenant.plan}
                              </Badge>
                            </TableCell>
                            <TableCell>{tenant.userCount || 0}</TableCell>
                            <TableCell>{tenant.maxUsers === -1 ? "Unlimited" : tenant.maxUsers}</TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">{tenant.domain || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={tenant.isActive ? "default" : "secondary"}>
                                {tenant.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openUpdateDialog(tenant)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openTierDialog(tenant)}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Update Tier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Users className="h-4 w-4 mr-2" />
                                    View Users
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tiers Tab */}
          <TabsContent value="pricing" className="space-y-4">
            {tiersLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center p-8">
                    <Spinner className="mr-2" />
                    Loading pricing tiers...
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricingTiers.map((tier: any) => (
                  <Card key={tier.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{tier.planName}</CardTitle>
                      <Badge className={getTierBadgeColor(tier.tier)}>
                        {tier.tier}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Monthly Price</p>
                        <p className="text-lg font-semibold">KES {Number(tier.monthlyPrice || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Max Users</p>
                        <p className="text-lg font-semibold">{tier.maxUsers === -1 ? "Unlimited" : tier.maxUsers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Support Level</p>
                        <p className="text-sm capitalize">{tier.supportLevel?.replace(/_/g, " ")}</p>
                      </div>
                      {tier.description && (
                        <div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Description</p>
                          <p className="text-sm">{tier.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Update Tenant Dialog */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Tenant</DialogTitle>
              <DialogDescription>Update organization details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={updateFormData.name}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={updateFormData.slug}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, slug: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Input
                  id="plan"
                  value={updateFormData.plan}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, plan: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={updateFormData.maxUsers}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, maxUsers: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  title="Active status"
                  checked={updateFormData.isActive}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTenant} disabled={updateMutation.isPending}>
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Tier Dialog */}
        <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Pricing Tier</DialogTitle>
              <DialogDescription>Change the tenant's pricing plan and user limit</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="plan">Pricing Plan</Label>
                <Select value={selectedTierPlan} onValueChange={setSelectedTierPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingTiers.map((tier: any) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.planName} ({tier.tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={selectedTierMaxUsers}
                  onChange={(e) => setSelectedTierMaxUsers(parseInt(e.target.value) || 10)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTierDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTier} disabled={updatePricingMutation.isPending}>
                Update Tier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
