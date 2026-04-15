import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, Save, Shield, Clock, FileText, ToggleRight, CalendarClock, Timer, X, Wrench, Database } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";

export default function MaintenanceAdmin() {
  const [, navigate] = useLocation();

  // Fetch current maintenance settings
  const { data: maintenanceData, refetch } = trpc.settings.getByCategory.useQuery(
    { category: "maintenance" },
    { retry: false }
  );

  const updateByCategory = trpc.settings.updateByCategory.useMutation({
    onSuccess: () => {
      toast.success("Maintenance settings saved");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  // Local form state
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("Under Maintenance");
  const [message, setMessage] = useState(
    "The system is currently undergoing scheduled maintenance. Please check back shortly."
  );
  const [estimatedReturn, setEstimatedReturn] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Scheduling state
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledDuration, setScheduledDuration] = useState("60"); // minutes
  const [countdown, setCountdown] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate form from DB
  useEffect(() => {
    if (maintenanceData) {
      setEnabled(maintenanceData.maintenance_mode === "true" || maintenanceData.maintenance_mode === "1");
      if (maintenanceData.maintenance_title) setTitle(maintenanceData.maintenance_title);
      if (maintenanceData.maintenance_message) setMessage(maintenanceData.maintenance_message);
      if (maintenanceData.maintenance_estimated_return) setEstimatedReturn(maintenanceData.maintenance_estimated_return);
      if (maintenanceData.maintenance_contact_email) setContactEmail(maintenanceData.maintenance_contact_email);
      if (maintenanceData.maintenance_scheduled_at) {
        setScheduledAt(maintenanceData.maintenance_scheduled_at);
        setIsScheduled(true);
      }
      if (maintenanceData.maintenance_scheduled_duration) {
        setScheduledDuration(maintenanceData.maintenance_scheduled_duration);
      }
    }
  }, [maintenanceData]);

  // Countdown timer logic
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!isScheduled || !scheduledAt) { setCountdown(""); return; }

    const tick = () => {
      const target = new Date(scheduledAt).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown("Starting now...");
        // Auto-enable maintenance
        if (!enabled) {
          handleToggle(true);
          setIsScheduled(false);
          toast.info("Scheduled maintenance has started automatically.");
        }
        if (countdownRef.current) clearInterval(countdownRef.current);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [isScheduled, scheduledAt, enabled]);

  const handleSave = async () => {
    await updateByCategory.mutateAsync({
      category: "maintenance",
      values: {
        maintenance_mode: String(enabled),
        maintenance_title: title,
        maintenance_message: message,
        maintenance_estimated_return: estimatedReturn,
        maintenance_contact_email: contactEmail,
        maintenance_scheduled_at: isScheduled ? scheduledAt : "",
        maintenance_scheduled_duration: scheduledDuration,
      },
    });
  };

  const handleSchedule = async () => {
    if (!scheduledAt) { toast.error("Please select a date and time for scheduled maintenance."); return; }
    const target = new Date(scheduledAt);
    if (target.getTime() <= Date.now()) { toast.error("Scheduled time must be in the future."); return; }
    // Compute estimated return from scheduled start + duration
    const durationMs = (parseInt(scheduledDuration) || 60) * 60000;
    const returnTime = new Date(target.getTime() + durationMs).toISOString().slice(0, 16);
    setEstimatedReturn(returnTime);
    setIsScheduled(true);
    await updateByCategory.mutateAsync({
      category: "maintenance",
      values: {
        maintenance_mode: String(enabled),
        maintenance_title: title,
        maintenance_message: message,
        maintenance_estimated_return: returnTime,
        maintenance_contact_email: contactEmail,
        maintenance_scheduled_at: scheduledAt,
        maintenance_scheduled_duration: scheduledDuration,
      },
    });
    toast.success(`Maintenance scheduled for ${target.toLocaleString()}`);
  };

  const handleCancelSchedule = async () => {
    setIsScheduled(false);
    setScheduledAt("");
    await updateByCategory.mutateAsync({
      category: "maintenance",
      values: {
        maintenance_mode: String(enabled),
        maintenance_title: title,
        maintenance_message: message,
        maintenance_estimated_return: estimatedReturn,
        maintenance_contact_email: contactEmail,
        maintenance_scheduled_at: "",
        maintenance_scheduled_duration: scheduledDuration,
      },
    });
    toast.success("Scheduled maintenance cancelled.");
  };

  const handleToggle = async (newVal: boolean) => {
    setEnabled(newVal);
    // Immediately persist the toggle
    await updateByCategory.mutateAsync({
      category: "maintenance",
      values: {
        maintenance_mode: String(newVal),
        maintenance_title: title,
        maintenance_message: message,
        maintenance_estimated_return: estimatedReturn,
        maintenance_contact_email: contactEmail,
      },
    });
    toast.success(newVal ? "Maintenance mode enabled" : "Maintenance mode disabled");
  };

  return (
    <ModuleLayout
      title="Maintenance Mode"
      description="Enable maintenance mode to show a custom overlay to all users except Global Super Admin and Global ICT Manager."
      icon={<Wrench className="h-6 w-6 text-amber-500" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm/super-admin" },
        { label: "Admin", href: "/admin/management" },
        { label: "Maintenance Mode" },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Maintenance Status
                </CardTitle>
                <CardDescription>
                  Toggle maintenance mode on or off. Only Global Super Admin and Global ICT Manager can access the system during maintenance.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={enabled ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                  {enabled ? "ACTIVE" : "INACTIVE"}
                </Badge>
                <Switch
                  checked={enabled}
                  onCheckedChange={handleToggle}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Overlay Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Overlay Content
            </CardTitle>
            <CardDescription>
              Customize the message displayed to users during maintenance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maint-title">Page Title</Label>
              <Input
                id="maint-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Under Maintenance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maint-message">Message</Label>
              <textarea
                id="maint-message"
                className="w-full min-h-[120px] p-3 text-sm border rounded-md bg-background resize-y"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain what is happening and when service will resume..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maint-eta" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Estimated Return Time
                </Label>
                <Input
                  id="maint-eta"
                  type="datetime-local"
                  value={estimatedReturn}
                  onChange={(e) => setEstimatedReturn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maint-email">Contact Email (optional)</Label>
                <Input
                  id="maint-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="support@example.com"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={updateByCategory.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateByCategory.isPending ? "Saving..." : "Save Overlay Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Maintenance */}
        <Card className={isScheduled ? "border-amber-300 dark:border-amber-700" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Schedule Maintenance
            </CardTitle>
            <CardDescription>
              Set a date and time to automatically enable maintenance mode. A countdown will display until the scheduled time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isScheduled && countdown && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Timer className="h-6 w-6 text-amber-600 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Maintenance Scheduled</p>
                  <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">{countdown}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Starts at {new Date(scheduledAt).toLocaleString()}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto text-amber-600 hover:text-red-600" onClick={handleCancelSchedule}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sched-time" className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Start Date & Time
                </Label>
                <Input
                  id="sched-time"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={isScheduled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sched-duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Expected Duration (minutes)
                </Label>
                <Input
                  id="sched-duration"
                  type="number"
                  min="5"
                  max="1440"
                  value={scheduledDuration}
                  onChange={(e) => setScheduledDuration(e.target.value)}
                  disabled={isScheduled}
                  placeholder="60"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {isScheduled ? (
                <Button variant="outline" onClick={handleCancelSchedule} className="text-red-600 border-red-200">
                  <X className="h-4 w-4 mr-2" /> Cancel Schedule
                </Button>
              ) : (
                <Button onClick={handleSchedule} disabled={!scheduledAt || updateByCategory.isPending} className="bg-amber-500 hover:bg-amber-600">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              This is how the maintenance page will appear to users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-center min-h-[320px] bg-gradient-to-br from-slate-50 via-amber-50/40 to-orange-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900">
                <div className="text-center space-y-4 p-8 max-w-md">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg shadow-amber-500/30 mx-auto">
                    <Wrench className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {title || "Under Maintenance"}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {message || "The system is currently undergoing scheduled maintenance."}
                  </p>
                  {estimatedReturn && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
                      <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase">
                        <Clock className="h-3.5 w-3.5" />
                        Estimated Return
                      </div>
                      <p className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {new Date(estimatedReturn).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {contactEmail && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Need help? Contact{" "}
                      <span className="text-primary font-medium">{contactEmail}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Rules Info */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Access Rules During Maintenance</p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li><strong>Global Super Admin</strong> — Full access to all dashboards and API</li>
                  <li><strong>Global ICT Manager</strong> — Full access to all dashboards and API</li>
                  <li><strong>All other users</strong> — Redirected to maintenance page (both UI and API)</li>
                  <li>When maintenance is disabled, all logged-in users are redirected to their respective dashboards</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
