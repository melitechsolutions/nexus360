import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  isCustom?: boolean;
  isAdvanced?: boolean;
  baseRole?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SYSTEM_ROLES = [
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'hr', label: 'HR' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'ict_manager', label: 'ICT Manager' },
  { value: 'procurement_manager', label: 'Procurement Manager' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'user', label: 'User' },
];

export default function Roles() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    permissions: [] as string[],
    baseRole: "staff" as string,
    isAdvanced: false,
  });

  // Fetch roles from backend
  const { data: rolesData = [], isLoading, refetch } = trpc.roles.list.useQuery();
  const { data: permissionsData = [] } = trpc.roles.getPermissions.useQuery();
  const { data: availableFeatures = [] } = trpc.roles.getAvailableFeatures.useQuery();
  const { data: userCounts = {} } = trpc.roles.getUserCounts.useQuery();
  const utils = trpc.useUtils();

  // Use the feature-based permissions for custom roles
  const featurePermissions = useMemo(() => {
    const groups: Record<string, { key: string; label: string; isAdvanced: boolean }[]> = {};
    availableFeatures.forEach((f: any) => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return groups;
  }, [availableFeatures]);

  // Mutations - use custom role endpoints
  const createRoleMutation = trpc.roles.createCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully!");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to create role: ${error?.message || String(error)}`);
    },
  });

  const updateRoleMutation = trpc.roles.updateCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully!");
      setIsEditOpen(false);
      setSelectedRole(null);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to update role: ${error?.message || String(error)}`);
    },
  });

  const deleteRoleMutation = trpc.roles.deleteCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Role deleted successfully!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete role: ${error?.message || String(error)}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      permissions: [],
      baseRole: "staff",
      isAdvanced: false,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.displayName) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.permissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }
    createRoleMutation.mutate({
      name: formData.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: formData.displayName,
      description: formData.description,
      permissions: formData.permissions,
      baseRole: formData.baseRole as any,
      isAdvanced: formData.isAdvanced,
    });
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      permissions: role.permissions,
      baseRole: role.baseRole || "staff",
      isAdvanced: role.isAdvanced || false,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedRole) return;
    updateRoleMutation.mutate({
      id: selectedRole.id,
      displayName: formData.displayName,
      description: formData.description,
      permissions: formData.permissions,
      baseRole: formData.baseRole as any,
      isAdvanced: formData.isAdvanced,
    });
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) {
      toast.error("System roles cannot be deleted");
      return;
    }
    if (confirm(`Are you sure you want to delete the role "${role.displayName}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  // Filter roles
  const filteredRoles = useMemo(() => {
    if (!Array.isArray(rolesData)) return [];
    return rolesData.filter((role: any) => {
      const search = searchQuery.toLowerCase();
      const displayName = (role.displayName || "").toLowerCase();
      const name = (role.name || "").toLowerCase();
      const description = (role.description || "").toLowerCase();
      
      return displayName.includes(search) || 
             name.includes(search) || 
             description.includes(search);
    });
  }, [rolesData, searchQuery]);

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, typeof permissionsData> = {};
    permissionsData.forEach((perm: any) => {
      if (!groups[perm.category]) {
        groups[perm.category] = [];
      }
      groups[perm.category].push(perm);
    });
    return groups;
  }, [permissionsData]);

  const getRoleColor = (role: Role) => {
    if (role.name === 'super_admin') return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    if (role.name === 'admin') return "bg-red-500/10 text-red-500 border-red-500/20";
    if (role.name === 'hr') return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (role.name === 'accountant') return "bg-green-500/10 text-green-500 border-green-500/20";
    if (role.name === 'staff') return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  return (
    <ModuleLayout
      title="Roles & Permissions"
      description="Manage user roles and their permissions"
      icon={<Shield className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Settings", href: "/settings" },
        { label: "Roles" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Total Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredRoles.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {filteredRoles.filter((r: any) => r.isSystem).length} system roles
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(userCounts).reduce((a: number, b: any) => a + (b as number), 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Across all roles</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{permissionsData.length}</div>
              <p className="text-xs text-gray-500 mt-1">Available permissions</p>
            </CardContent>
          </Card>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>Manage roles and their permissions</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                      <DialogDescription>
                        Define a new role with specific permissions
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Role Name *</Label>
                          <Input
                            id="name"
                            placeholder="e.g., project_manager"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                          <p className="text-xs text-gray-500">Lowercase with underscores only</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="displayName">Display Name *</Label>
                          <Input
                            id="displayName"
                            placeholder="e.g., Project Manager"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe the role's responsibilities"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="baseRole">Base Role *</Label>
                          <Select
                            value={formData.baseRole}
                            onValueChange={(value) => setFormData({ ...formData, baseRole: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select base role" />
                            </SelectTrigger>
                            <SelectContent>
                              {SYSTEM_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">
                            Users with this role inherit base role access as a fallback
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Advanced Role</Label>
                          <div className="flex items-center gap-3 pt-2">
                            <Switch
                              checked={formData.isAdvanced}
                              onCheckedChange={(checked) => setFormData({ ...formData, isAdvanced: checked })}
                            />
                            <span className="text-sm text-muted-foreground">
                              {formData.isAdvanced ? "Advanced permissions enabled" : "Standard permissions only"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Advanced roles can access delete, approve, and management features
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Permissions *</Label>
                        <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                          {Object.keys(featurePermissions).length > 0
                            ? Object.entries(featurePermissions).map(([category, perms]) => (
                              <div key={category} className="mb-4">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">{category}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {perms.map((perm) => {
                                    const hidden = !formData.isAdvanced && perm.isAdvanced;
                                    if (hidden) return null;
                                    return (
                                      <div key={perm.key} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={perm.key}
                                          checked={formData.permissions.includes(perm.key)}
                                          onCheckedChange={() => togglePermission(perm.key)}
                                        />
                                        <label htmlFor={perm.key} className="text-sm cursor-pointer flex items-center gap-1">
                                          {perm.label}
                                          {perm.isAdvanced && <Sparkles className="h-3 w-3 text-amber-500" />}
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                            : Object.entries(groupedPermissions).map(([category, perms]) => (
                              <div key={category} className="mb-4">
                                <h4 className="font-medium text-sm mb-2">{category}</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {Array.isArray(perms) && perms.map((perm: any) => (
                                    <div key={perm.key} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={perm.key}
                                        checked={formData.permissions.includes(perm.key)}
                                        onCheckedChange={() => togglePermission(perm.key)}
                                      />
                                      <label htmlFor={perm.key} className="text-sm cursor-pointer">
                                        {perm.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreate} disabled={createRoleMutation.isPending}>
                        {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading roles...</div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No roles found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Base Role</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role: any) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleColor(role)}>
                            {role.displayName}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{role.name}</p>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        {role.isCustom && role.baseRole ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="capitalize">{role.baseRole}</Badge>
                            {role.isAdvanced && <Sparkles className="h-3 w-3 text-amber-500" />}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{(userCounts as any)[role.name] || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {role.permissions.length} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.isSystem ? (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            System
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Unlock className="h-3 w-3" />
                            Custom
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(role)}
                            disabled={role.isSystem}
                            title={role.isSystem ? "System roles cannot be edited" : "Edit role"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(role)}
                            disabled={role.isSystem}
                            title={role.isSystem ? "System roles cannot be deleted" : "Delete role"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update role details and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Role Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">Role name cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-displayName">Display Name *</Label>
                  <Input
                    id="edit-displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-baseRole">Base Role *</Label>
                  <Select
                    value={formData.baseRole}
                    onValueChange={(value) => setFormData({ ...formData, baseRole: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select base role" />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Advanced Role</Label>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={formData.isAdvanced}
                      onCheckedChange={(checked) => setFormData({ ...formData, isAdvanced: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {formData.isAdvanced ? "Advanced" : "Standard"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Permissions *</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  {Object.keys(featurePermissions).length > 0
                    ? Object.entries(featurePermissions).map(([category, perms]) => (
                      <div key={category} className="mb-4">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">{category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {perms.map((perm) => {
                            const hidden = !formData.isAdvanced && perm.isAdvanced;
                            if (hidden) return null;
                            return (
                              <div key={perm.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-${perm.key}`}
                                  checked={formData.permissions.includes(perm.key)}
                                  onCheckedChange={() => togglePermission(perm.key)}
                                />
                                <label htmlFor={`edit-${perm.key}`} className="text-sm cursor-pointer flex items-center gap-1">
                                  {perm.label}
                                  {perm.isAdvanced && <Sparkles className="h-3 w-3 text-amber-500" />}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                    : Object.entries(groupedPermissions).map(([category, perms]) => (
                      <div key={category} className="mb-4">
                        <h4 className="font-medium text-sm mb-2">{category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.isArray(perms) && perms.map((perm: any) => (
                            <div key={perm.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${perm.key}`}
                                checked={formData.permissions.includes(perm.key)}
                                onCheckedChange={() => togglePermission(perm.key)}
                              />
                              <label htmlFor={`edit-${perm.key}`} className="text-sm cursor-pointer">
                                {perm.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
