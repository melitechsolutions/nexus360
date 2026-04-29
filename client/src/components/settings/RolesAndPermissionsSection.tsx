import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import mutateAsync from '@/lib/mutationHelpers';
import { Plus, Trash2 } from 'lucide-react';

export function RolesAndPermissionsSection() {
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newPermissionName, setNewPermissionName] = useState('');
  const [newPermissionDescription, setNewPermissionDescription] = useState('');
  const [newPermissionCategory, setNewPermissionCategory] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const [isLoadingPermission, setIsLoadingPermission] = useState(false);

  const rolesQuery = trpc.settings.getRoles.useQuery({});
  const permissionsQuery = trpc.settings.getPermissions.useQuery({});
  const rolePermissionsQuery = trpc.settings.getRolePermissions.useQuery(
    { roleId: selectedRoleId },
    { enabled: !!selectedRoleId }
  );

  const createRoleMutation = trpc.settings.createRole.useMutation();
  const createPermissionMutation = trpc.settings.createPermission.useMutation();
  const assignPermissionMutation = trpc.settings.assignPermissionToRole.useMutation();
  const removePermissionMutation = trpc.settings.removePermissionFromRole.useMutation();

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    setIsLoadingRole(true);
    try {
      await mutateAsync(createRoleMutation, {
        roleName: newRoleName,
        description: newRoleDescription || undefined,
      });

      toast.success('Role created successfully');
      setNewRoleName('');
      setNewRoleDescription('');
      rolesQuery.refetch();
    } catch (error) {
      toast.error(`Failed to create role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingRole(false);
    }
  };

  const handleCreatePermission = async () => {
    if (!newPermissionName.trim()) {
      toast.error('Permission name is required');
      return;
    }

    setIsLoadingPermission(true);
    try {
      await mutateAsync(createPermissionMutation, {
        permissionName: newPermissionName,
        description: newPermissionDescription || undefined,
        category: newPermissionCategory || undefined,
      });

      toast.success('Permission created successfully');
      setNewPermissionName('');
      setNewPermissionDescription('');
      setNewPermissionCategory('');
      permissionsQuery.refetch();
    } catch (error) {
      toast.error(`Failed to create permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingPermission(false);
    }
  };

  const handleAssignPermission = async (permissionId: string) => {
    if (!selectedRoleId) return;

    try {
      await mutateAsync(assignPermissionMutation, {
        roleId: selectedRoleId,
        permissionId,
      });

      toast.success('Permission assigned to role');
      rolePermissionsQuery.refetch();
    } catch (error) {
      toast.error(`Failed to assign permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    if (!selectedRoleId) return;

    try {
      await mutateAsync(removePermissionMutation, {
        roleId: selectedRoleId,
        permissionId,
      });

      toast.success('Permission removed from role');
      rolePermissionsQuery.refetch();
    } catch (error) {
      toast.error(`Failed to remove permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const assignedPermissionIds = new Set(rolePermissionsQuery.data?.map(p => p.permissionId) || []);

  return (
    <div className="space-y-6">
      {/* Create Role */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Role</CardTitle>
          <CardDescription>Add a new role to your system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              placeholder="e.g., Manager, Supervisor"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              disabled={isLoadingRole}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description (Optional)</Label>
            <Textarea
              id="role-description"
              placeholder="Describe the purpose of this role"
              value={newRoleDescription}
              onChange={e => setNewRoleDescription(e.target.value)}
              disabled={isLoadingRole}
              rows={3}
            />
          </div>

          <Button onClick={handleCreateRole} disabled={isLoadingRole} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Role
          </Button>
        </CardContent>
      </Card>

      {/* Create Permission */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Permission</CardTitle>
          <CardDescription>Define permissions that can be assigned to roles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="permission-name">Permission Name</Label>
            <Input
              id="permission-name"
              placeholder="e.g., view_invoices, edit_clients"
              value={newPermissionName}
              onChange={e => setNewPermissionName(e.target.value)}
              disabled={isLoadingPermission}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permission-category">Category</Label>
              <Input
                id="permission-category"
                placeholder="e.g., invoices, clients"
                value={newPermissionCategory}
                onChange={e => setNewPermissionCategory(e.target.value)}
                disabled={isLoadingPermission}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permission-description">Description (Optional)</Label>
              <Input
                id="permission-description"
                placeholder="Brief description"
                value={newPermissionDescription}
                onChange={e => setNewPermissionDescription(e.target.value)}
                disabled={isLoadingPermission}
              />
            </div>
          </div>

          <Button onClick={handleCreatePermission} disabled={isLoadingPermission} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Permission
          </Button>
        </CardContent>
      </Card>

      {/* Assign Permissions to Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Permissions to Roles</CardTitle>
          <CardDescription>Select a role and manage its permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role Selector */}
          <div className="space-y-2">
            <Label>Select Role</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {rolesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading roles...</p>
              ) : rolesQuery.data && rolesQuery.data.length > 0 ? (
                rolesQuery.data.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedRoleId === role.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium">{role.roleName}</p>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No roles available</p>
              )}
            </div>
          </div>

          {/* Permissions List */}
          {selectedRoleId && (
            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {permissionsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading permissions...</p>
                ) : permissionsQuery.data && permissionsQuery.data.length > 0 ? (
                  permissionsQuery.data.map(permission => {
                    const isAssigned = assignedPermissionIds.has(permission.id);
                    return (
                      <div
                        key={permission.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <Checkbox
                          id={permission.id}
                          checked={isAssigned}
                          onCheckedChange={() => {
                            if (isAssigned) {
                              handleRemovePermission(permission.id);
                            } else {
                              handleAssignPermission(permission.id);
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {permission.permissionName}
                          </label>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                          {permission.category && (
                            <p className="text-xs text-muted-foreground">
                              Category: {permission.category}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No permissions available</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Roles</CardTitle>
          <CardDescription>View all roles in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rolesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading roles...</p>
            ) : rolesQuery.data && rolesQuery.data.length > 0 ? (
              rolesQuery.data.map(role => (
                <div key={role.id} className="p-3 rounded-lg border">
                  <p className="font-medium">{role.roleName}</p>
                  {role.description && (
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {role.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No roles available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


