/**
 * Example Integration: Role Management Page with Enhanced UI
 * 
 * This file demonstrates how to integrate the EnhancedRoleManagement component
 * into your existing Roles page
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { EnhancedRoleManagement } from "@/components/EnhancedRoleManagement";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shield } from "lucide-react";

interface EnhancedRole {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  userCount?: number;
}

export default function EnhancedRolesPage() {
  const [, navigate] = useLocation();

  // Fetch roles from backend
  const { data: rolesData = [], isLoading, refetch } = trpc.roles.list.useQuery({});

  // Mutations
  const updateRoleMutation = trpc.roles.update.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const createRoleMutation = trpc.roles.create.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });

  const deleteRoleMutation = trpc.roles.delete.useMutation({
    onSuccess: () => {
      toast.success("Role deleted successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });

  const handleRoleUpdate = (updateRole: EnhancedRole) => {
    updateRoleMutation.mutate({
      id: updateRole.id,
      displayName: updateRole.displayName,
      description: updateRole.description,
      permissions: updateRole.permissions,
    });
  };

  const handleRoleCreate = (newRoleData: Omit<EnhancedRole, "id" | "createdAt" | "updatedAt">) => {
    createRoleMutation.mutate({
      name: newRoleData.name,
      displayName: newRoleData.displayName,
      description: newRoleData.description,
      permissions: newRoleData.permissions,
    });
  };

  // Transform API response to component format
  const enhancedRoles: EnhancedRole[] = (rolesData as any[])?.map((role) => ({
    id: role.id,
    name: role.name,
    displayName: role.displayName || role.name,
    description: role.description,
    permissions: role.permissions || [],
    isSystem: ["super_admin", "admin"].includes(role.name),
    createdAt: new Date(role.createdAt),
    updatedAt: new Date(role.updatedAt),
    userCount: role.userCount,
  })) || [];

  return (
    <ModuleLayout title="Role Management" description="Create and manage user roles with permissions">
      <div className="space-y-6">
        {/* Alert for important info */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            System roles (Super Admin, Admin) cannot be deleted but can have their permissions reviewed.
            Custom roles can be fully managed.
          </AlertDescription>
        </Alert>

        {/* Main component */}
        <EnhancedRoleManagement
          roles={enhancedRoles}
          onRoleUpdate={handleRoleUpdate}
          onRoleCreate={handleRoleCreate}
          isLoading={
            isLoading ||
            updateRoleMutation.isPending ||
            createRoleMutation.isPending ||
            deleteRoleMutation.isPending
          }
        />

        {/* Additional Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission Guidelines</CardTitle>
            <CardDescription>
              Best practices for role and permission management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Start with a minimal set of permissions and expand as needed</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Group related permissions together when creating custom roles</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Review permissions quarterly to ensure they match actual responsibilities</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Test each role thoroughly before assigning to users</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Keep role descriptions clear and up-to-date</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

/**
 * Example Dashboard Settings Page Integration
 * This shows how to integrate the CustomDashboardBuilder
 */

import { CustomDashboardBuilder } from "@/components/CustomDashboardBuilder";
import { type DashboardLayout } from "@/lib/dashboardWidgets";

export function DashboardSettingsPage() {
  // Fetch user's dashboard layout
  const { data: dashboardLayout, isLoading: isLoadingLayout } = trpc.dashboard.getLayout.useQuery({});

  // Save layout mutation
  const saveDashboardMutation = trpc.dashboard.saveLayout.useMutation({
    onSuccess: () => {
      toast.success("Dashboard layout saved successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to save dashboard: ${error.message}`);
    },
  });

  const handleSaveDashboard = (layout: DashboardLayout) => {
    saveDashboardMutation.mutate(layout);
  };

  return (
    <ModuleLayout
      title="Dashboard Settings"
      description="Customize your personal dashboard with widgets"
    >
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You can save multiple dashboard layouts and switch between them. Each layout can be
            customized with different widgets.
          </AlertDescription>
        </Alert>

        <CustomDashboardBuilder
          layout={dashboardLayout}
          onSave={handleSaveDashboard}
          isLoading={saveDashboardMutation.isPending}
        />
      </div>
    </ModuleLayout>
  );
}

/**
 * Example Usage in Settings Menu
 * Add these menu items to your settings navigation
 */

export const SETTINGS_MENU_ITEMS = [
  {
    title: "Role Management",
    description: "Create and manage user roles with permissions",
    href: "/settings/roles",
    icon: "Shield",
  },
  {
    title: "Dashboard",
    description: "Customize your dashboard layout",
    href: "/settings/dashboard",
    icon: "Layout",
  },
  {
    title: "Users",
    description: "Manage user accounts and assignments",
    href: "/settings/users",
    icon: "Users",
  },
  {
    title: "General",
    description: "System settings and preferences",
    href: "/settings/general",
    icon: "Settings",
  },
];

/**
 * Example Backend API Routes (tRPC)
 * These should be implemented in your server/routers/
 */

export const BACKEND_ROUTES_EXAMPLE = {
  // Role management routes
  "roles.list": "GET /api/trpc/roles.list",
  "roles.create": "POST /api/trpc/roles.create",
  "roles.update": "POST /api/trpc/roles.update",
  "roles.delete": "POST /api/trpc/roles.delete",

  // Dashboard routes
  "dashboard.getLayout": "GET /api/trpc/dashboard.getLayout",
  "dashboard.saveLayout": "POST /api/trpc/dashboard.saveLayout",
  "dashboard.deleteLayout": "POST /api/trpc/dashboard.deleteLayout",
  "dashboard.getWidgetData": "POST /api/trpc/dashboard.getWidgetData",

  // Permission routes
  "permissions.list": "GET /api/trpc/permissions.list",
  "permissions.getByCategory": "GET /api/trpc/permissions.getByCategory",
};

