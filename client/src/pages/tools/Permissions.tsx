import { useState, useEffect } from "react";
import UnifiedModuleLayout from "@/components/UnifiedModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useRequireFeature } from "@/lib/permissions";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Lock,
  Users,
  Shield,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PermissionCategory {
  key: string;
  name: string;
  permissionCount: number;
}

interface UserPermission {
  id: string;
  userId: string;
  userName?: string;
  resource: string;
  granted: boolean;
  createdAt: Date;
}

export default function Permissions() {
  const { allowed, isLoading: permLoading, user } = useRequireFeature("permissions:manage");
  const [searchUser, setSearchUser] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Queries
  const categoriesQuery = trpc.permissions.getCategories.useQuery(undefined, {
    enabled: allowed,
  });
  
  const userPermissionsQuery = trpc.permissions.getUserPermissions.useQuery(
    { userId: selectedUser },
    { enabled: allowed && selectedUser.length > 0 }
  );

  // Get all categories
  const categories: PermissionCategory[] = categoriesQuery.data || [];

  if (permLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">
              You don't have permission to manage permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <UnifiedModuleLayout
      title="Permissions Management"
      description="Manage user roles, permissions, and access control"
      icon={<Lock className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Settings", href: "/settings" },
        { label: "Permissions" },
      ]}
    >
      <div className="space-y-8">
        {/* Overview Section */}
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl">System Permissions</CardTitle>
            <CardDescription className="text-base">
              Manage role-based access control and assign permissions to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">🔐 Role-Based Control</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Manage permissions by user role and individual user assignments
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">📋 Permission Categories</div>
                <p className="text-slate-600 dark:text-slate-400">
                  {categories.length} categories with granular permission controls
                </p>
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">👥 User Assignments</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Assign specific permissions to individual users or roles
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permission Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permission Categories
            </CardTitle>
            <CardDescription>
              Available permission categories in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400 py-8 text-center">
                No permission categories found
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat) => (
                  <div
                    key={cat.key}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="font-semibold text-sm mb-2">{cat.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {cat.permissionCount} permissions
                      </Badge>
                      <code className="text-xs text-slate-500 dark:text-slate-400">{cat.key}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Permissions Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Permissions
            </CardTitle>
            <CardDescription>
              View and manage permissions for specific users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Search */}
            <div className="space-y-2">
              <Label htmlFor="userId">Select User</Label>
              <div className="flex gap-2">
                <Input
                  id="userId"
                  placeholder="Search or enter user ID..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => setSelectedUser(searchUser)}
                  disabled={!searchUser}
                  className="px-4"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter a user ID to view their current permissions
              </p>
            </div>

            {/* User Permissions List */}
            {selectedUser && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Permissions for User: {selectedUser}</h3>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Permission
                  </Button>
                </div>

                {userPermissionsQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : !userPermissionsQuery.data || userPermissionsQuery.data.length === 0 ? (
                  <div className="p-8 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <Lock className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      No specific permissions assigned to this user
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      User permissions are inherited from their role
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900">
                          <TableHead>Permission</TableHead>
                          <TableHead className="w-24">Status</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userPermissionsQuery.data.map((perm) => (
                          <TableRow key={perm.id}>
                            <TableCell className="font-mono text-xs">
                              {perm.resource}
                            </TableCell>
                            <TableCell>
                              {perm.granted ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Granted
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Denied
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost">
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Permissions Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role-Based Permissions
            </CardTitle>
            <CardDescription>
              Default permissions for each role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-sm mb-2">Super Admin</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Full access to all system features and permissions
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-sm mb-2">Admin</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Access to most features with some restrictions
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-sm mb-2">HR Manager</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Access to HR and employee management features
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                  <h4 className="font-semibold text-sm mb-2">Staff</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Limited access to basic features
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </UnifiedModuleLayout>
  );
}
