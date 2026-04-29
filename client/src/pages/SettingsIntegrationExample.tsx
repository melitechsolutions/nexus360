import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EnhancedRoleManagement } from '@/components/EnhancedRoleManagement';
import { CustomDashboardBuilder } from '@/components/CustomDashboardBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/utils/api';
import {
  usePermissionCategories,
  useRolePermissions,
  useAssignPermissionToRole,
  useRemovePermissionFromRole,
} from '@/hooks/useEnhancedPermissions';
import {
  useDefaultDashboardLayout,
  useUpdateDashboardLayout,
} from '@/hooks/useEnhancedDashboard';

/**
 * ============================================================================
 * ROLES MANAGEMENT PAGE - INTEGRATION EXAMPLE
 * ============================================================================
 *
 * This page demonstrates how to integrate EnhancedRoleManagement component
 * with the existing roles system and new enhanced permissions system.
 */
export function RolesManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all roles
  const { data: roles = [], isLoading: rolesLoading } = api.roles.list.useQuery({});

  // Mutations for role management
  const createRoleMutation = api.roles.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Role created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create role',
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = api.roles.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Role updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
    },
  });

  const deleteRoleMutation = api.roles.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Role deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete role',
        variant: 'destructive',
      });
    },
  });

  // Transform API response to component format
  const transformedRoles = (roles || []).map((role: any) => ({
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions || [],
    isSystem: role.isSystem,
    userCount: role.userCount || 0,
  }));

  const handleRoleUpdate = (role: any) => {
    updateRoleMutation.mutate({
      id: role.id,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
    });
  };

  const handleRoleCreate = (role: any) => {
    createRoleMutation.mutate({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Role Management</h1>
        <p className="text-gray-600 mt-2">
          Manage roles and assign granular permissions to users
        </p>
      </div>

      {/* Enhanced Role Management Component */}
      <EnhancedRoleManagement
        roles={transformedRoles}
        onRoleUpdate={handleRoleUpdate}
        onRoleCreate={handleRoleCreate}
        isLoading={rolesLoading || createRoleMutation.isPending || updateRoleMutation.isPending}
      />
    </div>
  );
}

/**
 * ============================================================================
 * DASHBOARD SETTINGS PAGE - INTEGRATION EXAMPLE
 * ============================================================================
 *
 * This page demonstrates how to integrate CustomDashboardBuilder component
 * to allow users to customize their dashboard layout.
 */
export function DashboardSettingsPage() {
  const { toast } = useToast();

  // Fetch user's default dashboard layout
  const { data: layout, isLoading: layoutLoading } = useDefaultDashboardLayout();

  // Update dashboard layout mutation
  const updateLayoutMutation = useUpdateDashboardLayout();

  const handleSaveLayout = (updatedLayout: any) => {
    updateLayoutMutation.mutate(updatedLayout, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Dashboard layout saved successfully',
        });
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save dashboard layout',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Settings</h1>
        <p className="text-gray-600 mt-2">
          Customize your dashboard layout, add or remove widgets, and arrange them how you prefer
        </p>
      </div>

      {/* Custom Dashboard Builder Component */}
      <CustomDashboardBuilder
        layout={layout}
        onSave={handleSaveLayout}
        isLoading={layoutLoading || updateLayoutMutation.isPending}
      />
    </div>
  );
}

/**
 * ============================================================================
 * SETTINGS PAGE WITH TABS - INTEGRATION EXAMPLE
 * ============================================================================
 *
 * This shows how to create a unified settings page with multiple sections
 */
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <RolesManagementPage />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <DashboardSettingsPage />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <div className="p-6 bg-white rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">General Settings</h3>
            {/* Add general settings content here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * ============================================================================
 * NAVIGATION MENU CONFIGURATION
 * ============================================================================
 */

export const SETTINGS_MENU_ITEMS = [
  {
    id: 'roles',
    label: 'Role Management',
    href: '/settings/roles',
    icon: 'Lock',
    description: 'Manage roles and permissions',
    permission: 'role.view',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/settings/dashboard',
    icon: 'LayoutGrid',
    description: 'Customize your dashboard',
    permission: 'dashboard.customize',
  },
  {
    id: 'general',
    label: 'General Settings',
    href: '/settings/general',
    icon: 'Settings',
    description: 'General system settings',
    permission: 'setting.view',
  },
];

/**
 * ============================================================================
 * PERMISSION CHECKER COMPONENT - HELPER
 * ============================================================================
 *
 * Helper component to show if user has specific permissions
 */
export function PermissionChecker({ roleId }: { roleId: string }) {
  const { data: permissions, isLoading } = useRolePermissions(roleId);
  const assignPermission = useAssignPermissionToRole();
  const removePermission = useRemovePermissionFromRole();

  if (isLoading) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Assigned Permissions</h3>
      <div className="grid grid-cols-1 gap-2">
        {Array.isArray(permissions) && permissions.map((perm) => (
          <div
            key={perm.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div>
              <div className="font-medium">{perm.label}</div>
              <div className="text-sm text-gray-600">{perm.description}</div>
            </div>
            <button
              onClick={() =>
                removePermission.mutate({
                  roleId,
                  permissionId: perm.id,
                })
              }
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              disabled={removePermission.isPending}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * USAGE IN ROUTE CONFIGURATION
 * ============================================================================
 *
 * Example of how to add these pages to your router:
 *
 * <Route path="/settings">
 *   <Route path="" element={<SettingsPage />} />
 *   <Route path="roles" element={<RolesManagementPage />} />
 *   <Route path="dashboard" element={<DashboardSettingsPage />} />
 * </Route>
 */

/**
 * ============================================================================
 * EXAMPLE: MAIN MENU INTEGRATION
 * ============================================================================
 *
 * Add to your main navigation:
 *
 * import { useUserPermissions } from '@/hooks/useUserPermissions';
 *
 * export function MainMenu() {
 *   const { hasPermission } = useUserPermissions();
 *
 *   return (
 *     <nav>
 *       {hasPermission('role.view') && (
 *         <Link href="/settings/roles">
 *           <LockIcon /> Role Management
 *         </Link>
 *       )}
 *       {hasPermission('dashboard.customize') && (
 *         <Link href="/settings/dashboard">
 *           <LayoutGridIcon /> Dashboard
 *         </Link>
 *       )}
 *     </nav>
 *   );
 * }
 */

export default SettingsPage;

