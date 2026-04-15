import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleLayout } from "@/components/ModuleLayout";
import { ArrowLeft, Loader2, Trash2, Edit } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import { toast } from "sonner";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";

export default function EditUser() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "staff",
    isActive: true,
    newPassword: "",
    confirmPassword: "",
  });

  // Fetch user data
  const { data: userData, isLoading } = trpc.users.getById.useQuery(id || "");

  // Update user mutation
  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setLocation("/crm/super-admin");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user");
      setIsSubmitting(false);
    },
  });

  // Delete user mutation
  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      setLocation("/crm/super-admin");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
      setIsDeleting(false);
    },
  });

  // Populate form when user data loads
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        role: userData.role || "staff",
        isActive: userData.isActive !== false,
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [userData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    // Password validation if changing password
    if (formData.newPassword || formData.confirmPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      if (formData.newPassword.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await mutateAsync(updateUserMutation, {
        id: id || "",
        name: formData.name,
        email: formData.email,
        role: formData.role as "super_admin" | "admin" | "hr" | "accountant" | "project_manager" | "ict_manager" | "procurement_manager" | "staff" | "client",
        isActive: formData.isActive,
        password: formData.newPassword || undefined,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteUserMutation, id || "");
    } catch (error) {
      // Error handled by mutation
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit User"
        icon={<Edit className="w-5 h-5" />}
        backLink={{ label: "Users", href: "/admin/management" }}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/management" },
          { label: "Edit" },
        ]}
      >
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading user...</p>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  if (!userData) {
    return (
      <ModuleLayout
        title="Edit User"
        icon={<Edit className="w-5 h-5" />}
        backLink={{ label: "Users", href: "/admin/management" }}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/management" },
          { label: "Edit" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>User not found</p>
          <Button onClick={() => setLocation("/crm/super-admin")}>
            Back to Dashboard
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit User"
      description="Update user details"
      icon={<Edit className="w-5 h-5" />}
      backLink={{ label: "Users", href: "/admin/management" }}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Admin", href: "/admin" },
        { label: "Users", href: "/admin/management" },
        { label: "Edit" },
      ]}
    >
      <div className="space-y-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Update the user details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="project_manager">Project Manager</SelectItem>
                    <SelectItem value="ict_manager">ICT Manager</SelectItem>
                    <SelectItem value="procurement_manager">Procurement Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password (optional)</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="font-normal cursor-pointer">
                  User is active
                </Label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/crm/super-admin")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2 ml-auto"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isSubmitting || isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          title="Delete User"
          description="Are you sure you want to delete this user? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={isDeleting}
        />
      </div>
    </ModuleLayout>
  );
}
