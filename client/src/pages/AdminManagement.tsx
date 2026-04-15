import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Settings,
  Shield,
  Search,
  Loader2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  BarChart3,
  Lock,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import mutateAsync from "@/lib/mutationHelpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { StatsCard } from "@/components/ui/stats-card";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction } from "@/components/list-page/EnhancedBulkActions";

/**
 * Admin Management Page
 * 
 * Features:
 * - User management (create, edit, delete users)
 * - Role management
 * - Permissions management
 * - System settings and configuration
 * - Activity logs and audit trails
 * 
 * Access: super_admin, admin users only
 */

/**
 * Permissions Management Component
 * Allows super_admin to manage user permissions by category
 */
function PermissionsManagement({ users, searchQuery, setSearchQuery }: {
  users: any[],
  searchQuery: string,
  setSearchQuery: (q: string) => void,
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: permissionDefs } = trpc.permissions.getAll.useQuery();
  const { data: userPerms, refetch: refetchUserPerms } = trpc.permissions.getUserPermissions.useQuery(
    selectedUserId || "",
    { enabled: !!selectedUserId }
  );

  const updatePermMutation = trpc.permissions.bulkUpdatePermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissions updated successfully");
      refetchUserPerms();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update permissions");
    },
  });

  useEffect(() => {
    if (userPerms) {
      setUserPermissions(userPerms);
      const categories = Object.keys(userPerms);
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0]);
      }
    }
  }, [userPerms, selectedCategory]);

  const handlePermissionToggle = (permissionId: string) => {
    if (!selectedCategory) return;
    
    const updated = { ...userPermissions };
    if (!updated[selectedCategory]) {
      updated[selectedCategory] = {};
    }
    updated[selectedCategory][permissionId] = !updated[selectedCategory][permissionId];
    setUserPermissions(updated);
  };

  const handleSelectAllPermissions = () => {
    if (!selectedCategory || !permissionDefs) return;
    
    const updated = { ...userPermissions };
    if (!updated[selectedCategory]) {
      updated[selectedCategory] = {};
    }
    
    const categoryKey = selectedCategory.toLowerCase().replace(/\s+/g, '_') as keyof typeof permissionDefs;
    const permissions = permissionDefs?.[categoryKey]?.permissions || [];
    
    permissions.forEach((perm: any) => {
      updated[selectedCategory][perm.id] = true;
    });
    
    setUserPermissions(updated);
    toast.success(`All ${selectedCategory} permissions selected`);
  };

  const handleDeselectAllPermissions = () => {
    if (!selectedCategory) return;
    
    const updated = { ...userPermissions };
    if (!updated[selectedCategory]) {
      updated[selectedCategory] = {};
    }
    
    Object.keys(updated[selectedCategory]).forEach(key => {
      updated[selectedCategory][key] = false;
    });
    
    setUserPermissions(updated);
    toast.success(`All ${selectedCategory} permissions deselected`);
  };

  const getSeletedPermissionCount = () => {
    if (!selectedCategory || !userPermissions[selectedCategory]) return 0;
    return Object.values(userPermissions[selectedCategory]).filter(Boolean).length;
  };

  const getTotalPermissionCount = () => {
    if (!selectedCategory || !permissionDefs) return 0;
    const categoryKey = selectedCategory.toLowerCase().replace(/\s+/g, '_') as keyof typeof permissionDefs;
    return permissionDefs?.[categoryKey]?.permissions?.length || 0;
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId) return;
    
    setIsSaving(true);
    // Flatten all permissions and ensure they are proper booleans
    const flatPermissions: Record<string, boolean> = {};
    Object.values(userPermissions).forEach(category => {
      Object.entries(category).forEach(([key, value]) => {
        // Explicitly cast to boolean to handle any type coercion issues
        flatPermissions[key] = Boolean(value);
      });
    });
    
    try {
      await updatePermMutation.mutateAsync({
        userId: selectedUserId,
        permissions: flatPermissions,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (u: any) =>
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Permissions Management</CardTitle>
        <CardDescription>
          Configure granular permissions for each user by role and category
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* User Selection Panel */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-2">Select User</h3>
              <p className="text-xs text-gray-500 mb-3">Choose a user to manage their permissions</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8 border-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-2">
              {filteredUsers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6 bg-gray-50 rounded">
                  <Users className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  No users found
                </div>
              ) : (
                filteredUsers.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedUserId === u.id
                        ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200"
                        : "hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">{u.fullName || u.name}</div>
                    <div className="text-xs text-gray-600 truncate">{u.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                        {u.role}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Permission Categories Panel */}
          {selectedUserId && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Permission Categories</h3>
                <p className="text-xs text-gray-500 mb-3">Select a category to view permissions</p>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-2">
                {permissionDefs && Object.entries(permissionDefs).length > 0 ? (
                  Object.entries(permissionDefs).map(([key, category]: any) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(category.category)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedCategory === category.category
                          ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200"
                          : "hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">{category.category}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {category.permissions?.length || 0} permissions
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-6 bg-gray-50 rounded">
                    <Lock className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    No categories available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permissions Checkboxes Panel */}
          {selectedUserId && selectedCategory && permissionDefs && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{selectedCategory}</h3>
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {getSeletedPermissionCount()}/{getTotalPermissionCount()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Select permissions to assign to this user</p>
              </div>
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllPermissions}
                  className="text-xs flex-1"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllPermissions}
                  className="text-xs flex-1"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50/50">
                {permissionDefs?.[selectedCategory.toLowerCase().replace(/\s+/g, '_') as keyof typeof permissionDefs]?.permissions?.map((perm: any) => (
                  <label 
                    key={perm.id} 
                    className="flex items-start gap-3 p-2.5 hover:bg-white rounded cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={userPermissions[selectedCategory]?.[perm.id] || false}
                      onCheckedChange={() => handlePermissionToggle(perm.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{perm.label}</div>
                      <div className="text-xs text-gray-500">{perm.description}</div>
                    </div>
                  </label>
                )) || (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    No permissions found for this category
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedUserId && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedUserId(null);
                setSelectedCategory(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Saving Permissions..." : "Save Permissions"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Admin Management Page
 * 
 * Features:
 * - User management (create, edit, delete users)
 * - Role management
 * - Permissions management
 * - System settings and configuration
 * - Activity logs and audit trails
 * 
 * Access: super_admin, admin users only
 */
export default function AdminManagement() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  const { user, loading, isAuthenticated, logout } = useAuthWithPersistence({
    redirectOnUnauthenticated: true,
  });
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("users");
  
  // Role Management State
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [showDeleteRoleDialog, setShowDeleteRoleDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  
  const [systemSettings, setSystemSettings] = useState({
    appName: "CRM Platform",
    supportEmail: "support@example.com",
    sessionTimeout: "30",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [newPermissionName, setNewPermissionName] = useState("");
  const [newPermissionDescription, setNewPermissionDescription] = useState("");
  const [newPermissionCategory, setNewPermissionCategory] = useState("general");
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState({
    totalInvoices: 0,
    totalPayments: 0,
    totalExpenses: 0,
    totalRevenue: 0,
    netProfit: 0,
  });

  // Fetch users list from backend
  const { data: usersData = [], isLoading: usersLoading, error: usersError, refetch: refetchUsers } = trpc.users.list.useQuery();

  // Fetch roles and permissions
  const { data: roles = [], isLoading: rolesLoading, refetch: refetchRoles } = trpc.settings.getRoles.useQuery();
  const { data: permissions = [] } = trpc.settings.getPermissions.useQuery();
  
  // Fetch system settings
  const { data: settingsData } = trpc.settings.getAll.useQuery();

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = trpc.dashboard.metrics.useQuery();
  
  // Fetch accounting metrics for analytics
  const { data: invoices = [] } = trpc.invoices.list.useQuery();
  const { data: payments = [] } = trpc.payments.list.useQuery();
  const { data: expenses = [] } = trpc.expenses.list.useQuery();

  // Delete user mutation
  const permanentDeleteUserMutation = trpc.users.permanentDelete.useMutation({
    onSuccess: () => {
      toast.success("User permanently deleted");
      setShowPermanentDeleteDialog(false);
      setSelectedUser(null);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to permanently delete user");
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      setShowDeleteDialog(false);
      setSelectedUser(null);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  // Role mutations
  const createRoleMutation = trpc.settings.createRole.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully");
      setShowRoleDialog(false);
      setNewRoleName("");
      setNewRoleDescription("");
      refetchRoles();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create role");
    },
  });

  const updateRoleMutation = trpc.settings.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      setShowRoleDialog(false);
      setEditingRole(null);
      setNewRoleName("");
      setNewRoleDescription("");
      refetchRoles();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const deleteRoleMutation = trpc.settings.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("Role deleted successfully");
      setShowDeleteRoleDialog(false);
      setRoleToDelete(null);
      refetchRoles();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete role");
    },
  });

  // Settings mutations
  const updateSettingMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  // MOVE ALL useEffect HOOKS HERE BEFORE CONDITIONAL RETURNS
  // Calculate financial metrics
  useEffect(() => {
    if (settingsData && Array.isArray(settingsData)) {
      const appNameSetting = settingsData.find((s: any) => s.key === "app_name");
      const emailSetting = settingsData.find((s: any) => s.key === "support_email");
      const timeoutSetting = settingsData.find((s: any) => s.key === "session_timeout");

      setSystemSettings({
        appName: appNameSetting?.value || "CRM Platform",
        supportEmail: emailSetting?.value || "support@example.com",
        sessionTimeout: timeoutSetting?.value || "30",
      });
    }
  }, [settingsData]);

  useEffect(() => {
    if (!Array.isArray(invoices) || !Array.isArray(payments) || !Array.isArray(expenses)) {
      return;
    }
    
    const totalRevenue = (invoices as any[]).reduce((sum, inv) => sum + (inv.total || 0), 0) / 100;
    const totalExpensesAmount = (expenses as any[]).reduce((sum, exp) => sum + (exp.amount || 0), 0) / 100;
    const netProfit = totalRevenue - totalExpensesAmount;

    const newData = {
      totalInvoices: invoices.length,
      totalPayments: payments.length,
      totalExpenses: expenses.length,
      totalRevenue,
      netProfit,
    };

    setFinancialData(prev => {
      if (
        prev.totalInvoices === newData.totalInvoices &&
        prev.totalPayments === newData.totalPayments &&
        prev.totalExpenses === newData.totalExpenses &&
        prev.totalRevenue === newData.totalRevenue &&
        prev.netProfit === newData.netProfit
      ) {
        return prev;
      }
      return newData;
    });
  }, [invoices, payments, expenses]);

  useEffect(() => {
    // Verify user has super_admin or admin role
    if (!loading && isAuthenticated && user?.role !== "super_admin" && user?.role !== "admin") {
      setLocation("/dashboard");
    }
    // setLocation is intentionally omitted; it is stable in practice but
    // including it causes React to complain about changing dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, user]);
  
  // NOW PERFORM CONDITIONAL RETURNS AFTER ALL HOOKS ARE CALLED
  // Check if user has required role
  const isAdmin = user && (user.role === "super_admin" || user.role === "admin");
  
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!isAuthenticated || !isAdmin) return null;

  const filteredUsers = usersData.filter(
    (u: any) => {
      // Super admins: exclude org-scoped users (managed via multi-tenancy)
      if (user?.role === "super_admin" && u.organizationId) return false;
      return (
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  );

  const handleDeleteUser = async () => {
    if (selectedUser?.id) {
      try {
        await deleteUserMutation.mutateAsync(selectedUser.id);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await Promise.all([
        updateSettingMutation.mutateAsync({
          key: "app_name",
          value: systemSettings.appName,
          category: "general",
          description: "Application name",
        }),
        updateSettingMutation.mutateAsync({
          key: "support_email",
          value: systemSettings.supportEmail,
          category: "general",
          description: "Support email address",
        }),
        updateSettingMutation.mutateAsync({
          key: "session_timeout",
          value: systemSettings.sessionTimeout,
          category: "security",
          description: "Session timeout in minutes",
        }),
      ]);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Role Handlers
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    try {
      await createRoleMutation.mutateAsync({
        name: newRoleName,
        displayName: newRoleName,
        description: newRoleDescription,
      });
    } catch (error) {
      console.error("Error creating role:", error);
    }
  };

  const handleUpdateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    if (!editingRole?.id) return;
    
    try {
      await updateRoleMutation.mutateAsync({
        id: editingRole.id,
        displayName: newRoleName,
        description: newRoleDescription,
      });
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setNewRoleName(role.displayName || role.name || "");
    setNewRoleDescription(role.description || "");
    setShowRoleDialog(true);
  };

  const handleDeleteRole = async () => {
    if (roleToDelete?.id) {
      try {
        await deleteRoleMutation.mutateAsync(roleToDelete.id);
      } catch (error) {
        console.error("Error deleting role:", error);
      }
    }
  };

  const handleOpenRoleDialog = () => {
    setEditingRole(null);
    setNewRoleName("");
    setNewRoleDescription("");
    setShowRoleDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ModuleLayout
      title="Admin Management"
      description="Manage users, roles, permissions, and system settings"
      icon={<Shield className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Admin Management" },
      ]}
    >
      <div className="space-y-6 p-4 sm:p-6">

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <StatsCard
            label="Total Users"
            value={usersData?.length || 0}
            description={<>{usersData?.filter((u: any) => u.isActive).length || 0} active</>}
            color="border-l-blue-500"
            onClick={() => setLocation("/admin/management")}
          />

          <StatsCard label="Total Invoices" value={financialData.totalInvoices} description="Documents created" color="border-l-amber-500" onClick={() => setLocation("/invoices")} />

          <StatsCard
            label="Total Revenue"
            value={<>KES {(financialData.totalRevenue || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}</>}
            description="All time revenue"
            color="border-l-cyan-500"
            onClick={() => setLocation("/reports")}
          />

          <StatsCard label="Active Clients" value={metrics?.activeClients || 0} description="Client accounts" color="border-l-pink-500" onClick={() => setLocation("/clients")} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${financialData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                KES {(financialData.netProfit || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Revenue - Expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="h-4 w-4 mr-2" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Lock className="h-4 w-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Users Management</CardTitle>
                    <CardDescription>
                      Create, edit, and manage user accounts and permissions
                    </CardDescription>
                  </div>
                  <Button onClick={() => setLocation("/users/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    New User
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, email, or role..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedUsers.size > 0 && (
                  <EnhancedBulkActions
                    selectedCount={selectedUsers.size}
                    onClear={() => setSelectedUsers(new Set())}
                    actions={[
                      bulkExportAction(selectedUsers, filteredUsers, [
                        { key: "fullName", label: "Name" },
                        { key: "email", label: "Email" },
                        { key: "role", label: "Role" },
                        { key: "isActive", label: "Status" },
                      ], "users"),
                      bulkCopyIdsAction(selectedUsers),
                      bulkDeleteAction(selectedUsers, async (ids) => {
                        for (const id of ids) {
                          try { await deleteUserMutation.mutateAsync(id); } catch {}
                        }
                        setSelectedUsers(new Set());
                        refetchUsers();
                      }),
                    ]}
                  />
                )}

                {/* Users Table */}
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : usersError ? (
                  <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    Error loading users
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedUsers(new Set(filteredUsers.map((u: any) => u.id)));
                                else setSelectedUsers(new Set());
                              }}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedUsers.has(u.id)}
                                onCheckedChange={(checked) => {
                                  const next = new Set(selectedUsers);
                                  if (checked) next.add(u.id);
                                  else next.delete(u.id);
                                  setSelectedUsers(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{u.fullName || u.name || "N/A"}</TableCell>
                            <TableCell>{u.accountName || u.username || u.email?.split("@")[0] || "N/A"}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                {u.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              {u.isActive ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/users/${u.id}/edit`)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {!u.isActive && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  title="Permanently delete this inactive user"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setShowPermanentDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="ml-1 text-xs">Perm</span>
                                </Button>
                              )}
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

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Roles & Permissions</CardTitle>
                    <CardDescription>
                      Manage user roles and their associated permissions
                    </CardDescription>
                  </div>
                  <Button onClick={handleOpenRoleDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {rolesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Custom Roles Section */}
                    <div className="space-y-3">
                      {roles?.filter((r: any) => !r.isSystem)?.length > 0 ? (
                        <>
                          <h3 className="text-sm font-semibold text-gray-700">Custom Roles</h3>
                          <div className="space-y-3">
                            {roles?.filter((r: any) => !r.isSystem)?.map((role: any) => (
                              <div 
                                key={role.id} 
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm text-gray-900">{role.displayName || role.name}</h4>
                                  <p className="text-xs text-gray-500 mt-1">{role.description || "No description provided"}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditRole(role)}
                                    className="gap-2"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    Configure
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setRoleToDelete(role);
                                      setShowDeleteRoleDialog(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-lg">
                          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No custom roles created yet</p>
                        </div>
                      )}
                    </div>

                    {/* System Roles Section */}
                    <div className="pt-4 border-t space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700">System Roles</h3>
                      <div className="space-y-3">
                        {roles?.filter((r: any) => r.isSystem)?.length > 0 ? (
                          roles?.filter((r: any) => r.isSystem)?.map((role: any) => (
                            <div 
                              key={role.id} 
                              className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-gray-900">{role.displayName || role.name}</h4>
                                <p className="text-xs text-gray-500 mt-1">{role.description || "System role"}</p>
                              </div>
                              <span className="text-xs font-medium text-gray-500 px-2.5 py-1 bg-gray-200 rounded">
                                System
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-lg">
                            <p className="text-sm">No system roles available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Role Dialog */}
            <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
                  <DialogDescription>
                    {editingRole 
                      ? "Update role details. System roles cannot be modified." 
                      : "Create a new custom role for your organization"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Role Name *</label>
                    <Input
                      placeholder="e.g., Manager, Senior Analyst, Supervisor"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="border-gray-300"
                    />
                    <p className="text-xs text-gray-500">The display name for this role</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <Input
                      placeholder="Describe the purpose and responsibilities of this role"
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      className="border-gray-300"
                    />
                    <p className="text-xs text-gray-500">Optional description for role reference</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> After creating the role, you can assign specific permissions to users under the Permissions tab.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRoleDialog(false);
                        setEditingRole(null);
                        setNewRoleName("");
                        setNewRoleDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={editingRole ? handleUpdateRole : handleCreateRole}
                      disabled={
                        !newRoleName.trim() || 
                        createRoleMutation.isPending || 
                        updateRoleMutation.isPending
                      }
                    >
                      {(createRoleMutation.isPending || updateRoleMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingRole ? "Update Role" : "Create Role"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Role Dialog */}
            <AlertDialog open={showDeleteRoleDialog} onOpenChange={setShowDeleteRoleDialog}>
              <AlertDialogContent>
                <AlertDialogTitle>Delete Role?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the role <strong>"{roleToDelete?.displayName || roleToDelete?.name}"</strong>? 
                  This action cannot be undone and users with this role will be affected.
                </AlertDialogDescription>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 my-4">
                  <p className="text-xs text-red-800">
                    <strong>Warning:</strong> Deleting this role may impact users currently assigned to it.
                  </p>
                </div>
                <div className="flex gap-4 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteRole}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteRoleMutation.isPending}
                  >
                    {deleteRoleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Role"
                    )}
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <PermissionsManagement users={usersData} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure general system settings, application preferences, and security options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="appName" className="text-sm font-medium text-gray-700">Application Name</label>
                  <Input
                    id="appName"
                    placeholder="Enter application name"
                    value={systemSettings.appName}
                    onChange={(e) => setSystemSettings({ ...systemSettings, appName: e.target.value })}
                    className="border-gray-300"
                  />
                  <p className="text-xs text-gray-500">This name appears in the application header and emails</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="supportEmail" className="text-sm font-medium text-gray-700">Support Email</label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="support@example.com"
                    value={systemSettings.supportEmail}
                    onChange={(e) => setSystemSettings({ ...systemSettings, supportEmail: e.target.value })}
                    className="border-gray-300"
                  />
                  <p className="text-xs text-gray-500">Email address users can contact for support</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="sessionTimeout" className="text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    placeholder="30"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) => setSystemSettings({ ...systemSettings, sessionTimeout: e.target.value })}
                    min="5"
                    max="480"
                    className="border-gray-300"
                  />
                  <p className="text-xs text-gray-500">Time before automatic logout. Range: 5-480 minutes</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Security Tip:</strong> Shorter session timeouts provide better security but may require more frequent logins.
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    onClick={handleSaveSettings} 
                    disabled={isSavingSettings}
                    className="gap-2"
                  >
                    {isSavingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSavingSettings ? "Saving..." : "Save Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSystemSettings({
                        appName: settingsData?.find((s: any) => s.key === "app_name")?.value || "CRM Platform",
                        supportEmail: settingsData?.find((s: any) => s.key === "support_email")?.value || "support@example.com",
                        sessionTimeout: settingsData?.find((s: any) => s.key === "session_timeout")?.value || "30",
                      });
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {/* Top Analytics Cards */}
            <div className="grid gap-4 md:grid-cols-6">
              <StatsCard label="Total Invoices" value={financialData.totalInvoices} description="Documents" color="border-l-emerald-500" />

              <StatsCard label="Total Payments" value={financialData.totalPayments} description="Received" color="border-l-orange-500" />

              <StatsCard label="Total Expenses" value={financialData.totalExpenses} description="Recorded" color="border-l-purple-500" />

              <StatsCard
                label="Total Revenue"
                value={<>KES {(financialData.totalRevenue || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}</>}
                description="All time"
                color="border-l-green-500"
              />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${financialData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    KES {(financialData.netProfit || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Profit/Loss</p>
                </CardContent>
              </Card>

              <StatsCard
                label="Active Users"
                value={usersData?.filter((u: any) => u.isActive).length || 0}
                description={<>Of {usersData?.length || 0}</>}
                color="border-l-blue-500"
              />
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Revenue Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Financial Breakdown</CardTitle>
                  <CardDescription>Revenue vs Expenses distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Revenue", value: financialData.totalRevenue || 0, fill: "#10b981" },
                          { name: "Expenses", value: financialData.totalExpenses || 0, fill: "#ef4444" },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${(value / 1000).toFixed(0)}k`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip formatter={(value) => `KES ${(value || 0).toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* User Status Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>User Status Distribution</CardTitle>
                  <CardDescription>Active vs Inactive users</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Active", value: usersData?.filter((u: any) => u.isActive).length || 0, fill: "#3b82f6" },
                          { name: "Inactive", value: (usersData?.length || 0) - (usersData?.filter((u: any) => u.isActive).length || 0), fill: "#9ca3af" },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#9ca3af" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Income Sources Bar Chart */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Financial Metrics Comparison</CardTitle>
                  <CardDescription>Key financial indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          name: "Financial Metrics",
                          "Invoices": financialData.totalInvoices * 1000,
                          "Payments": financialData.totalPayments * 1000,
                          "Expenses": financialData.totalExpenses,
                          "Revenue": financialData.totalRevenue,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${(value).toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="Invoices" fill="#8b5cf6" />
                      <Bar dataKey="Payments" fill="#10b981" />
                      <Bar dataKey="Expenses" fill="#ef4444" />
                      <Bar dataKey="Revenue" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* User Role Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Users by Role</CardTitle>
                  <CardDescription>User distribution across roles</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={
                          usersData?.length > 0
                            ? Object.entries(
                                (usersData || []).reduce((acc: any, u: any) => {
                                  acc[u.role || "unassigned"] = (acc[u.role || "unassigned"] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([role, count]: [string, any]) => ({ name: role, value: count }))
                            : []
                        }
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Count Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Summary</CardTitle>
                  <CardDescription>Invoices, Payments, and Expenses count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          category: "Documents",
                          count: financialData.totalInvoices,
                          fill: "#8b5cf6",
                        },
                        {
                          category: "Payments",
                          count: financialData.totalPayments,
                          fill: "#10b981",
                        },
                        {
                          category: "Expenses",
                          count: financialData.totalExpenses,
                          fill: "#ef4444",
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Performance Summary</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{usersData?.length || 0}</p>
                    <p className="text-xs text-gray-500 mt-2">{(((usersData?.filter((u: any) => u.isActive).length || 0) / (usersData?.length || 1)) * 100).toFixed(1)}% active</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">KES {((financialData.totalRevenue || 0) / 1000000).toFixed(1)}M</p>
                    <p className="text-xs text-gray-500 mt-2">All invoices combined</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Invoice Value</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">
                      KES {financialData.totalInvoices > 0 ? ((financialData.totalRevenue / financialData.totalInvoices) / 1000).toFixed(0) : 0}k
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Per document</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">System Health</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">98%</p>
                    <p className="text-xs text-gray-500 mt-2">Uptime this month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete user "{selectedUser?.fullName}"? This action
            cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      {/* Permanent Delete User Dialog */}
      <AlertDialog open={showPermanentDeleteDialog} onOpenChange={setShowPermanentDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle className="text-red-600">Permanently Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>WARNING: This cannot be undone.</strong> User &ldquo;{selectedUser?.fullName}&rdquo; and all their data
            (activity logs, audit logs, settings, API keys) will be permanently removed from the database.
            This action is irreversible.
          </AlertDialogDescription>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser?.id && permanentDeleteUserMutation.mutate(selectedUser.id)}
              className="bg-red-700 hover:bg-red-800"
              disabled={permanentDeleteUserMutation.isPending}
            >
              {permanentDeleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting permanently...
                </>
              ) : (
                "Yes, permanently delete"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}
