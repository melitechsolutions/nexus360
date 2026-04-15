/**
 * Organization Users Management
 * Complete user management for organization admins
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
  Crown,
  Gem,
} from "lucide-react";

interface OrganizationUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "manager" | "staff" | "viewer" | "ict_manager" | "project_manager" | "hr" | "accountant" | "procurement_manager" | "sales_manager";
  position?: string;
  department?: string;
  phone?: string;
  photoUrl?: string;
  isActive: number;
  invitationSent: number;
  invitationSentAt?: string;
  lastSignedIn?: string;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
}

type SortField = "name" | "email" | "role" | "createdAt" | "lastSignedIn";
type SortOrder = "asc" | "desc";

export default function OrganizationUsersManagement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if not org admin
  useEffect(() => {
    if (!user?.organizationId) {
      navigate("/");
    }
  }, [user, navigate]);

  // State management
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>();
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "staff" as const,
    position: "",
    department: "",
    phone: "",
  });

  // Queries
  const { data: usersData, isLoading, refetch } = trpc.organizationUsers.list.useQuery(
    {
      organizationId: user?.organizationId || "",
      search: search || undefined,
      role: roleFilter,
      isActive: isActiveFilter,
      sortBy,
      sortOrder,
      limit: 100,
      offset: 0,
    },
    { enabled: !!user?.organizationId }
  );

  const { data: userLimitInfo } = trpc.organizationUsers.getUserLimitInfo.useQuery(
    { organizationId: user?.organizationId || "" },
    { enabled: !!user?.organizationId }
  );

  // Mutations
  const createMutation = trpc.organizationUsers.create.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      setShowCreateDialog(false);
      setFormData({ name: "", email: "", role: "staff", position: "", department: "", phone: "" });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.organizationUsers.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setShowEditDialog(false);
      setEditingUser(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.organizationUsers.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkDeleteMutation = trpc.organizationUsers.bulkDelete.useMutation({
    onSuccess: () => {
      toast.success("Users deleted successfully");
      setSelectedUsers([]);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkUpdateMutation = trpc.organizationUsers.bulkUpdate.useMutation({
    onSuccess: () => {
      toast.success("Users updated successfully");
      setSelectedUsers([]);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers
  const handleCreateUser = async () => {
    if (!user?.organizationId) return;

    createMutation.mutate({
      organizationId: user.organizationId,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      position: formData.position || undefined,
      department: formData.department || undefined,
      phone: formData.phone || undefined,
    });
  };

  const handleEditUser = () => {
    if (!user?.organizationId || !editingUser) return;

    updateMutation.mutate({
      organizationId: user.organizationId,
      userId: editingUser.id,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      position: formData.position || undefined,
      department: formData.department || undefined,
      phone: formData.phone || undefined,
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (!user?.organizationId || userId === user.id) {
      toast.error("Cannot delete your own account");
      return;
    }

    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate({
        organizationId: user.organizationId,
        userId,
      });
    }
  };

  const handleBulkDelete = () => {
    if (!user?.organizationId || selectedUsers.length === 0) return;

    if (confirm(`Delete ${selectedUsers.length} users?`)) {
      bulkDeleteMutation.mutate({
        organizationId: user.organizationId,
        userIds: selectedUsers,
      });
    }
  };

  const handleBulkToggleActive = (isActive: boolean) => {
    if (!user?.organizationId || selectedUsers.length === 0) return;

    bulkUpdateMutation.mutate({
      organizationId: user.organizationId,
      userIds: selectedUsers,
      isActive,
    });
  };

  const toggleUserSelect = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (!usersData?.users) return;
    if (selectedUsers.length === usersData.users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usersData.users.map((u) => u.id));
    }
  };

  const openEditDialog = (userData: OrganizationUser) => {
    setEditingUser(userData);
    setFormData({
      name: userData.name,
      email: userData.email,
      role: userData.role,
      position: userData.position || "",
      department: userData.department || "",
      phone: userData.phone || "",
    });
    setShowEditDialog(true);
  };

  const isAtUserLimit = userLimitInfo?.isAtLimit ?? false;

  return (
    <ModuleLayout
      title="Organization Users"
      description="Manage users and access within your organization"
      icon={<Users className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings" },
        { label: "Users" },
      ]}
    >
      <div className="space-y-6">
        {/* User Limit Info */}
        {userLimitInfo && (
          <Card className={isAtUserLimit ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <CardTitle>User Allocation</CardTitle>
                </div>
                <Badge variant={isAtUserLimit ? "destructive" : "default"}>
                  {userLimitInfo.current} / {userLimitInfo.limit} users
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isAtUserLimit ? "bg-red-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min((userLimitInfo.current / userLimitInfo.limit) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {userLimitInfo.remaining} remaining
                </span>
              </div>
              {isAtUserLimit && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-amber-100 dark:bg-amber-950 rounded">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    You've reached your user limit. Upgrade your plan to add more users.
                  </span>
                </div>
              )}
            </CardHeader>
          </Card>
        )}

        {/* Toolbar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter || ""} onValueChange={(v) => setRoleFilter(v || undefined)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="ict_manager">ICT Manager</SelectItem>
                    <SelectItem value="project_manager">Project Manager</SelectItem>
                    <SelectItem value="hr">HR Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="procurement_manager">Procurement Manager</SelectItem>
                    <SelectItem value="sales_manager">Sales Manager</SelectItem>
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
              <Button
                onClick={() => {
                  setFormData({ name: "", email: "", role: "staff", position: "", department: "", phone: "" });
                  setShowCreateDialog(true);
                }}
                disabled={isAtUserLimit}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{selectedUsers.length} user(s) selected</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleBulkToggleActive(true)}>
                    Activate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkToggleActive(false)}>
                    Deactivate
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Spinner className="mr-2" />
                Loading users...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedUsers.length === usersData?.users?.length && usersData?.users?.length > 0}
                          onCheckedChange={toggleAllUsers}
                        />
                      </TableHead>
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
                      <TableHead className="cursor-pointer" onClick={() => {
                        if (sortBy === "email") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("email");
                          setSortOrder("asc");
                        }
                      }}>
                        <div className="flex items-center gap-2">
                          Email
                          {sortBy === "email" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => {
                        if (sortBy === "role") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("role");
                          setSortOrder("asc");
                        }
                      }}>
                        <div className="flex items-center gap-2">
                          Role
                          {sortBy === "role" && (
                            sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Signin</TableHead>
                      <TableHead className="w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.users?.map((userData) => (
                      <TableRow key={userData.id} className={selectedUsers.includes(userData.id) ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(userData.id)}
                            onCheckedChange={() => toggleUserSelect(userData.id)}
                            disabled={userData.id === user?.id}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{userData.name}</TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">{userData.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{userData.role.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{userData.department || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={userData.isActive ? "default" : "secondary"}>
                            {userData.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {userData.lastSignedIn ? new Date(userData.lastSignedIn).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(userData)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {userData.id !== user?.id && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteUser(userData.id)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
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

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setShowEditDialog(false);
            setEditingUser(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? `Edit ${editingUser.name}` : "Add New User"}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? "Update user information" : "Invite a new user to your organization"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="ict_manager">ICT Manager</SelectItem>
                    <SelectItem value="project_manager">Project Manager</SelectItem>
                    <SelectItem value="hr">HR Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="procurement_manager">Procurement Manager</SelectItem>
                    <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Sales, HR"
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., Manager"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setShowEditDialog(false);
                  setEditingUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingUser ? handleEditUser : handleCreateUser}
                disabled={createMutation.isPending || updateMutation.isPending || !formData.name || !formData.email}
              >
                {editingUser ? "Update" : "Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
