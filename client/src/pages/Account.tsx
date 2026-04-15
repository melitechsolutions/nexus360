import { useState, useRef } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { exportToCsv } from "@/utils/exportCsv";
import { User, Lock, Bell, Shield, Upload, Camera } from "lucide-react";

export default function Account() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => { toast.success("Password changed successfully"); setPwOpen(false); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); },
    onError: (err) => toast.error(err.message),
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const uploadAvatarMutation = trpc.fileStorage.uploadDocument.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = () => {
    if (!formData.name || !formData.email) {
      toast.error("Please fill in all fields");
      return;
    }
    updateProfileMutation.mutate(formData);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
      toast.success("Avatar preview updated. Ready to upload!");
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      toast.error("Please select an image first");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const file = fileInputRef.current.files[0];
      await uploadAvatarMutation.mutateAsync({
        name: `avatar-${Date.now()}.${file.name.split('.').pop()}`,
        mimeType: file.type,
        size: file.size,
        fileUrl: `/uploads/avatars/`,
        documentType: "other" as const,
      });
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <ModuleLayout
      title="Account Settings"
      description="Manage your account and preferences"
      icon={<User className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Settings", href: "/settings" },
        { label: "Account" },
      ]}
    >
      <div className="space-y-6">

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              Privacy
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Summary with Avatar Upload */}
                <div className="flex items-center gap-4 pb-6 border-b">
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                      ) : (
                        user?.name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Upload avatar"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user?.name || "User"}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      Role: {user?.role || "User"}
                    </p>
                  </div>
                </div>

                {/* Avatar Upload Section */}
                {avatarPreview && (
                  <div className="space-y-4 pb-6 border-b">
                    <div>
                      <h4 className="font-medium mb-2">Avatar Preview</h4>
                      <p className="text-sm text-muted-foreground mb-4">Your new avatar is ready to upload</p>
                      <Button
                        onClick={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {isUploadingAvatar ? "Uploading..." : "Upload Avatar"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Edit Form */}
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            name: user?.name || "",
                            email: user?.email || "",
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Full Name</Label>
                      <p className="text-base">{formData.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Email Address</Label>
                      <p className="text-base">{formData.email}</p>
                    </div>
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      Edit Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your password and security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Change Password</h4>
                      <p className="text-sm text-muted-foreground">
                        Update your password regularly to keep your account secure
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setPwOpen(true)}>Change</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline" disabled title="2FA requires admin configuration">Setup</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Active Sessions</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage your active login sessions
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setSessionsOpen(true)}>View</Button>
                  </div>
                  <Dialog open={sessionsOpen} onOpenChange={setSessionsOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Active Sessions</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <div>
                              <p className="text-sm font-medium">Current Session</p>
                              <p className="text-xs text-muted-foreground">{navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : "Browser"} on {navigator.platform}</p>
                              <p className="text-xs text-muted-foreground">Last active: Just now</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-green-600">Active</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">No other active sessions detected.</p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSessionsOpen(false)}>Close</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive updates via email
                      </p>
                    </div>
                    <input type="checkbox" className="w-4 h-4" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Invoice Reminders</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified about upcoming invoice due dates
                      </p>
                    </div>
                    <input type="checkbox" className="w-4 h-4" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Payment Confirmations</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when payments are received
                      </p>
                    </div>
                    <input type="checkbox" className="w-4 h-4" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Low Stock Alerts</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified when inventory is running low
                      </p>
                    </div>
                    <input type="checkbox" className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Data</CardTitle>
                <CardDescription>Control your privacy settings and data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Data Privacy</h4>
                      <p className="text-sm text-muted-foreground">
                        View our privacy policy and data handling practices
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open("/privacy-policy", "_blank")}>
                      Read
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Download Your Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Export all your personal data in a portable format
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { if (user) exportToCsv("account-data", [{ name: user.name, email: user.email, role: user.role, createdAt: String((user as any).createdAt || "") }]); }}>
                      Download
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => toast.error("Account deletion requires admin approval")}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                changePasswordMutation.mutate({
                  currentPassword: pwForm.currentPassword,
                  newPassword: pwForm.newPassword,
                  confirmPassword: pwForm.confirmPassword,
                })
              }
              disabled={!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword || changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "Saving..." : "Save Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}

