import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Save,
  RotateCcw,
  Bell,
  Lock,
  Database,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";

interface SystemSettings {
  applicationName: string;
  applicationDescription: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  autoBackupEnabled: boolean;
  backupFrequency: "daily" | "weekly" | "monthly";
  backupRetentionDays: number;
  emailNotificationsEnabled: boolean;
  systemLogsEnabled: boolean;
  apiRateLimitPerMinute: number;
  sessionTimeoutMinutes: number;
  twoFactorAuthenticationRequired: boolean;
  fileUploadLimitMB: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  applicationName: "CRM Platform",
  applicationDescription: "Enterprise CRM and Business Management System",
  maintenanceMode: false,
  maintenanceMessage: "The system is under maintenance. Please try again later.",
  autoBackupEnabled: true,
  backupFrequency: "daily",
  backupRetentionDays: 30,
  emailNotificationsEnabled: true,
  systemLogsEnabled: true,
  apiRateLimitPerMinute: 60,
  sessionTimeoutMinutes: 30,
  twoFactorAuthenticationRequired: false,
  fileUploadLimitMB: 100,
};

export default function SystemSettings() {
  const [, navigate] = useLocation();
  const { allowed, isLoading: permissionLoading } = useRequireFeature("admin:system:settings");
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch system settings
  const { data: fetchedSettings, isLoading: isFetchingSettings } = trpc.settings.getAll.useQuery();

  const saveMutation = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("System settings saved successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  useEffect(() => {
    if (fetchedSettings && Array.isArray(fetchedSettings)) {
      // Map backend settings to form structure
      const mappedSettings: Partial<SystemSettings> = {};
      for (const setting of fetchedSettings) {
        if (setting.key === "app_name") mappedSettings.applicationName = setting.value;
        if (setting.key === "app_description") mappedSettings.applicationDescription = setting.value;
        if (setting.key === "maintenance_mode") mappedSettings.maintenanceMode = setting.value === "true";
        if (setting.key === "maintenance_message") mappedSettings.maintenanceMessage = setting.value;
        if (setting.key === "backup_enabled") mappedSettings.autoBackupEnabled = setting.value === "true";
        if (setting.key === "backup_frequency") mappedSettings.backupFrequency = setting.value as any;
        if (setting.key === "backup_retention_days") mappedSettings.backupRetentionDays = parseInt(setting.value);
        if (setting.key === "email_notifications") mappedSettings.emailNotificationsEnabled = setting.value === "true";
        if (setting.key === "system_logs") mappedSettings.systemLogsEnabled = setting.value === "true";
        if (setting.key === "api_rate_limit") mappedSettings.apiRateLimitPerMinute = parseInt(setting.value);
        if (setting.key === "session_timeout") mappedSettings.sessionTimeoutMinutes = parseInt(setting.value);
        if (setting.key === "2fa_required") mappedSettings.twoFactorAuthenticationRequired = setting.value === "true";
        if (setting.key === "file_upload_limit_mb") mappedSettings.fileUploadLimitMB = parseInt(setting.value);
      }
      setSettings((prev) => ({ ...prev, ...mappedSettings }));
    }
    setIsLoading(false);
  }, [fetchedSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsToSave = [
        { key: "app_name", value: settings.applicationName, category: "general", description: "Application name" },
        { key: "app_description", value: settings.applicationDescription, category: "general", description: "Application description" },
        { key: "maintenance_mode", value: String(settings.maintenanceMode), category: "maintenance", description: "Maintenance mode toggle" },
        { key: "maintenance_message", value: settings.maintenanceMessage, category: "maintenance", description: "Maintenance message" },
        { key: "backup_enabled", value: String(settings.autoBackupEnabled), category: "backup", description: "Auto backup enabled" },
        { key: "backup_frequency", value: settings.backupFrequency, category: "backup", description: "Backup frequency" },
        { key: "backup_retention_days", value: String(settings.backupRetentionDays), category: "backup", description: "Backup retention days" },
        { key: "email_notifications", value: String(settings.emailNotificationsEnabled), category: "notifications", description: "Email notifications enabled" },
        { key: "system_logs", value: String(settings.systemLogsEnabled), category: "general", description: "System logs enabled" },
        { key: "api_rate_limit", value: String(settings.apiRateLimitPerMinute), category: "security", description: "API rate limit per minute" },
        { key: "session_timeout", value: String(settings.sessionTimeoutMinutes), category: "security", description: "Session timeout in minutes" },
        { key: "2fa_required", value: String(settings.twoFactorAuthenticationRequired), category: "security", description: "Two-factor authentication required" },
        { key: "file_upload_limit_mb", value: String(settings.fileUploadLimitMB), category: "general", description: "File upload limit in MB" },
      ];
      await Promise.all(settingsToSave.map((s) => saveMutation.mutateAsync(s)));
      setIsSaving(false);
    } catch (error) {
      toast.error("Failed to save system settings");
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      setSettings(DEFAULT_SETTINGS);
      toast.success("Settings reset to defaults");
    }
  };

  if (permissionLoading || isLoading) {
    return (
      <ModuleLayout
        title="System Settings"
        description="Configure application-wide system settings and preferences"
        icon={<Settings className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Settings", href: "/settings" },
          { label: "System Settings" },
        ]}
      >
        <div className="flex items-center justify-center h-screen">
          <Spinner className="size-8" />
        </div>
      </ModuleLayout>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <ModuleLayout
      title="System Settings"
      description="Configure application-wide settings, security, and backup preferences"
      icon={<Settings className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Settings", href: "/settings" },
        { label: "System Settings" },
      ]}
    >
      <div className="space-y-8 max-w-4xl">
        {/* Alert */}
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              System Administration
            </CardTitle>
            <CardDescription className="text-blue-800 dark:text-blue-200">
              These settings affect the entire application. Changes apply immediately. Edit with caution.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Information</CardTitle>
                <CardDescription>
                  Configure basic application information displayed to users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="appName">Application Name</Label>
                  <Input
                    id="appName"
                    value={settings.applicationName}
                    onChange={(e) =>
                      setSettings({ ...settings, applicationName: e.target.value })
                    }
                    placeholder="Enter application name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appDesc">Application Description</Label>
                  <Textarea
                    id="appDesc"
                    value={settings.applicationDescription}
                    onChange={(e) =>
                      setSettings({ ...settings, applicationDescription: e.target.value })
                    }
                    placeholder="Enter application description"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="fileLimit">File Upload Limit (MB)</Label>
                  <Input
                    id="fileLimit"
                    type="number"
                    value={settings.fileUploadLimitMB}
                    onChange={(e) =>
                      setSettings({ ...settings, fileUploadLimitMB: parseInt(e.target.value) })
                    }
                    min="1"
                    max="1000"
                  />
                  <p className="text-xs text-gray-500">
                    Maximum file size allowed for uploads (1-1000 MB)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Settings */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Mode</CardTitle>
                <CardDescription>
                  Put the application in maintenance mode to prevent user access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Maintenance Mode</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Users will see a maintenance message instead of the application
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, maintenanceMode: checked })
                    }
                  />
                </div>

                {settings.maintenanceMode && (
                  <div className="space-y-2">
                    <Label htmlFor="mainMsg">Maintenance Message</Label>
                    <Textarea
                      id="mainMsg"
                      value={settings.maintenanceMessage}
                      onChange={(e) =>
                        setSettings({ ...settings, maintenanceMessage: e.target.value })
                      }
                      placeholder="Enter message to display to users during maintenance"
                      rows={4}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Settings */}
          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Automatic Backups</CardTitle>
                <CardDescription>
                  Configure automatic database backup settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Automatic Backups</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Automatically backup the database on a schedule
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoBackupEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoBackupEnabled: checked })
                    }
                  />
                </div>

                {settings.autoBackupEnabled && (
                  <>
                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="frequency">Backup Frequency</Label>
                      <Select
                        value={settings.backupFrequency}
                        onValueChange={(value: any) =>
                          setSettings({ ...settings, backupFrequency: value })
                        }
                      >
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retention">Backup Retention (Days)</Label>
                      <Input
                        id="retention"
                        type="number"
                        value={settings.backupRetentionDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            backupRetentionDays: parseInt(e.target.value),
                          })
                        }
                        min="1"
                        max="365"
                      />
                      <p className="text-xs text-gray-500">
                        Delete backups older than this many days (1-365 days)
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Configuration</CardTitle>
                <CardDescription>
                  Configure security settings and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (Minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) })
                    }
                    min="5"
                    max="480"
                  />
                  <p className="text-xs text-gray-500">
                    Log out inactive users after this many minutes (5-480 minutes)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rateLimit">API Rate Limit (Requests per Minute)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    value={settings.apiRateLimitPerMinute}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        apiRateLimitPerMinute: parseInt(e.target.value),
                      })
                    }
                    min="10"
                    max="1000"
                  />
                  <p className="text-xs text-gray-500">
                    Maximum API requests allowed per minute (10-1000)
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Two-Factor Authentication Required</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Require all users to enable 2FA for account access
                    </p>
                  </div>
                  <Switch
                    checked={settings.twoFactorAuthenticationRequired}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, twoFactorAuthenticationRequired: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable System Logs</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Log all system activities and user actions for audit purposes
                    </p>
                  </div>
                  <Switch
                    checked={settings.systemLogsEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, systemLogsEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
