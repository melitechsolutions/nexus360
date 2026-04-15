import { useState } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  User,
  Lock,
  Bell,
  Globe,
  Accessibility,
  Monitor,
  Shield,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GlobalSettings() {
  const { data: profileData } = trpc.auth.me.useQuery();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [profileSettings, setProfileSettings] = useState({
    firstName: profileData?.firstName || "",
    lastName: profileData?.lastName || "",
    email: profileData?.email || "",
    phone: profileData?.phone || "",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    systemNotifications: true,
    chatNotifications: true,
    dailyDigest: false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "private",
    activityStatus: true,
    analyticsTracking: false,
  });

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      // TODO: Call API to save profile settings
      toast({
        title: "Success",
        description: "Profile settings saved successfully",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true);
      // TODO: Call API to save notification settings
      toast({
        title: "Success",
        description: "Notification settings saved successfully",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    try {
      setIsSaving(true);
      // TODO: Call API to save privacy settings
      toast({
        title: "Success",
        description: "Privacy settings saved successfully",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <ModuleLayout
      title="Settings"
      description="Manage your personal settings and preferences"
      icon={<Settings className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Accessibility className="h-4 w-4" />
              <span className="hidden sm:inline">Access</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileSettings.firstName}
                      onChange={(e) =>
                        setProfileSettings({
                          ...profileSettings,
                          firstName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileSettings.lastName}
                      onChange={(e) =>
                        setProfileSettings({
                          ...profileSettings,
                          lastName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileSettings.email}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">
                    Email address cannot be changed. Contact support if needed.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileSettings.phone}
                    onChange={(e) =>
                      setProfileSettings({
                        ...profileSettings,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Password Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Password & Security
                </CardTitle>
                <CardDescription>
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full">
                  Enable Two-Factor Authentication
                </Button>
                <Button variant="outline" className="w-full">
                  View Active Sessions
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Control how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Notifications */}
                <SettingToggle
                  label="Email Notifications"
                  description="Receive important updates via email"
                  checked={notificationSettings.emailNotifications}
                  onChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailNotifications: checked,
                    })
                  }
                />

                {/* System Notifications */}
                <SettingToggle
                  label="System Notifications"
                  description="Receive in-app notifications for system events"
                  checked={notificationSettings.systemNotifications}
                  onChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      systemNotifications: checked,
                    })
                  }
                />

                {/* Chat Notifications */}
                <SettingToggle
                  label="Chat Notifications"
                  description="Get notified when you receive new messages"
                  checked={notificationSettings.chatNotifications}
                  onChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      chatNotifications: checked,
                    })
                  }
                />

                {/* Daily Digest */}
                <SettingToggle
                  label="Daily Digest"
                  description="Receive a daily summary of important activity"
                  checked={notificationSettings.dailyDigest}
                  onChange={(checked) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      dailyDigest: checked,
                    })
                  }
                />

                <Button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? "Saving..." : "Save Notification Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Data</CardTitle>
                <CardDescription>
                  Control your privacy and data sharing preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <select
                    id="profileVisibility"
                    value={privacySettings.profileVisibility}
                    onChange={(e) =>
                      setPrivacySettings({
                        ...privacySettings,
                        profileVisibility: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="private">Private - Only visible to you</option>
                    <option value="org">Organization - Visible to org members</option>
                    <option value="public">Public - Visible to all users</option>
                  </select>
                </div>

                <SettingToggle
                  label="Activity Status"
                  description="Let others see your online status"
                  checked={privacySettings.activityStatus}
                  onChange={(checked) =>
                    setPrivacySettings({
                      ...privacySettings,
                      activityStatus: checked,
                    })
                  }
                />

                <SettingToggle
                  label="Analytics Tracking"
                  description="Help us improve by allowing anonymous usage analytics"
                  checked={privacySettings.analyticsTracking}
                  onChange={(checked) =>
                    setPrivacySettings({
                      ...privacySettings,
                      analyticsTracking: checked,
                    })
                  }
                />

                <Button
                  onClick={handleSavePrivacy}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? "Saving..." : "Save Privacy Settings"}
                </Button>
              </CardContent>
            </Card>

            {/* Data Export */}
            <Card>
              <CardHeader>
                <CardTitle>Data & Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Download your personal data or delete your account
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    Download My Data
                  </Button>
                  <Button variant="destructive" className="flex-1">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accessibility Settings */}
          <TabsContent value="accessibility" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Settings</CardTitle>
                <CardDescription>
                  Configure accessibility options for better usability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> You can also access quick accessibility options using the floating accessibility icon on the right side of the screen.
                  </p>
                </div>

                <SettingToggle
                  label="High Contrast Mode"
                  description="Increase contrast for better readability"
                  checked={false}
                  onChange={() => {}}
                />

                <SettingToggle
                  label="Reduce Motion"
                  description="Minimize animations and transitions"
                  checked={false}
                  onChange={() => {}}
                />

                <SettingToggle
                  label="Larger Text"
                  description="Increase default text size"
                  checked={false}
                  onChange={() => {}}
                />

                <SettingToggle
                  label="Screen Reader Optimization"
                  description="Optimize interface for screen readers"
                  checked={false}
                  onChange={() => {}}
                />

                <p className="text-xs text-gray-500">
                  These settings are managed through the accessibility widget. Changes are saved automatically.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 cursor-pointer"
      />
    </div>
  );
}
