import { useState } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Gauge, Shield, Save, RotateCcw, Layers, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const TIER_ORDER = ["free", "trial", "starter", "professional", "enterprise", "custom"] as const;
type Tier = typeof TIER_ORDER[number];

const TIER_COLORS: Record<Tier, string> = {
  free: "secondary",
  trial: "outline",
  starter: "default",
  professional: "default",
  enterprise: "default",
  custom: "outline",
} as const;

export default function ApiRateLimiting() {
  const { allowed, isLoading: authLoading } = useRequireRole(["ict_manager", "super_admin"]);
  const utils = trpc.useUtils();

  const { data: config, isLoading: configLoading } = trpc.ictManagement.getRateLimitConfig.useQuery(undefined, {
    enabled: allowed,
  });

  const { data: stats } = trpc.ictManagement.getRateLimitStats.useQuery(undefined, {
    enabled: allowed,
    refetchInterval: 15000,
  });

  const { data: tierData } = trpc.ictManagement.getTierRateLimits.useQuery(undefined, {
    enabled: allowed,
  });

  const [formData, setFormData] = useState<{
    globalRateLimit: number;
    perUserRateLimit: number;
    burstLimit: number;
    windowMs: number;
    enabled: boolean;
    whitelistedIPs: string;
  } | null>(null);

  // Per-tier override edit state: tier -> input string
  const [tierEdits, setTierEdits] = useState<Partial<Record<Tier, string>>>({});

  const form = formData ?? {
    globalRateLimit: config?.globalRateLimit ?? 5000,
    perUserRateLimit: config?.perUserRateLimit ?? 60,
    burstLimit: config?.burstLimit ?? 100,
    windowMs: config?.windowMs ?? 900000,
    enabled: config?.enabled ?? true,
    whitelistedIPs: (config?.whitelistedIPs ?? []).join(", "),
  };

  const updateMutation = trpc.ictManagement.updateRateLimitConfig.useMutation({
    onSuccess: () => {
      toast.success("Rate limit configuration updated and live");
      utils.ictManagement.getRateLimitConfig.invalidate();
      setFormData(null);
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const updateTierMutation = trpc.ictManagement.updateTierRateLimit.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.tier} tier limit updated to ${data.effectiveLimit.toLocaleString()} req/window`);
      utils.ictManagement.getTierRateLimits.invalidate();
      setTierEdits((prev) => { const n = { ...prev }; delete n[data.tier as Tier]; return n; });
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const handleSave = () => {
    const ips = form.whitelistedIPs
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);

    updateMutation.mutate({
      globalRateLimit: form.globalRateLimit,
      perUserRateLimit: form.perUserRateLimit,
      burstLimit: form.burstLimit,
      windowMs: form.windowMs,
      enabled: form.enabled,
      whitelistedIPs: ips,
    });
  };

  const handleReset = () => {
    setFormData(null);
    toast.info("Form reset to current settings");
  };

  const handleTierSave = (tier: Tier) => {
    const val = tierEdits[tier];
    const num = val === "" || val === undefined ? null : Number(val);
    updateTierMutation.mutate({ tier, requestsPerWindow: num });
  };

  const handleTierReset = (tier: Tier) => {
    updateTierMutation.mutate({ tier, requestsPerWindow: null });
  };

  const setField = (key: string, value: any) => {
    setFormData({ ...form, [key]: value });
  };

  if (authLoading || configLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <ModuleLayout
      title="API Rate Limiting"
      description="Configure API rate limits to control how users call the API"
      icon={<Gauge className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "ICT", href: "/ict" },
        { label: "API Rate Limiting" },
      ]}
      actions={
        <>
          <Button variant="outline" onClick={handleReset} disabled={!formData}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Global Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Global Configuration
            </CardTitle>
            <CardDescription>
              Configure system-wide API rate limiting rules. Changes take effect immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Rate Limiting Enabled</Label>
                <p className="text-xs text-muted-foreground">Toggle global rate limiting on/off</p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setField("enabled", v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Global Requests per Window</Label>
              <Input
                type="number"
                value={form.globalRateLimit}
                onChange={(e) => setField("globalRateLimit", Number(e.target.value))}
                min={10}
                max={100000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">
                IP-level ceiling — protects against brute-force from a single address
              </p>
            </div>

            <div className="space-y-2">
              <Label>Per-User Requests per Minute</Label>
              <Input
                type="number"
                value={form.perUserRateLimit}
                onChange={(e) => setField("perUserRateLimit", Number(e.target.value))}
                min={5}
                max={10000}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Informational — tier limits below govern actual per-org enforcement
              </p>
            </div>

            <div className="space-y-2">
              <Label>Burst Limit</Label>
              <Input
                type="number"
                value={form.burstLimit}
                onChange={(e) => setField("burstLimit", Number(e.target.value))}
                min={5}
                max={1000}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Rate Limit Window</Label>
              <Select
                value={String(form.windowMs)}
                onValueChange={(v) => setField("windowMs", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30000">30 seconds</SelectItem>
                  <SelectItem value="60000">1 minute</SelectItem>
                  <SelectItem value="300000">5 minutes</SelectItem>
                  <SelectItem value="900000">15 minutes</SelectItem>
                  <SelectItem value="3600000">1 hour</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Time window for counting requests (applies to both limiters)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* IP Whitelist & Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>IP Whitelist</CardTitle>
              <CardDescription>
                IPs exempt from rate limiting (comma-separated)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={form.whitelistedIPs}
                onChange={(e) => setField("whitelistedIPs", e.target.value)}
                placeholder="e.g. 127.0.0.1, 192.168.1.0"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Requests from these IPs bypass both the global and tier limiters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Statistics</CardTitle>
              <CardDescription>
                Real-time API usage (refreshes every 15 s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{stats?.totalRequestsLastMinute ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Req / window</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold">{stats?.totalTrackedUsers ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Tracked orgs</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-2xl font-bold text-destructive">{stats?.blockedRequests ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Blocked</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className={`text-2xl font-bold ${form.enabled ? "text-green-500" : "text-muted-foreground"}`}>
                    {form.enabled ? "ON" : "OFF"}
                  </div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Limits Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Global IP limit</span>
                  <span className="font-medium">{form.globalRateLimit.toLocaleString()} req / window</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Window</span>
                  <span className="font-medium">{form.windowMs / 1000}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Whitelisted IPs</span>
                  <span className="font-medium">
                    {form.whitelistedIPs.split(",").filter((s) => s.trim()).length || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscription Tier Rate Limits */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Subscription Tier Limits
          </CardTitle>
          <CardDescription>
            Per-organisation quotas enforced by the tier-aware middleware. Override individual tiers
            or leave blank to use the platform default. Changes apply immediately (cached entries
            are flushed on save).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(tierData?.tiers ?? []).map((t) => {
              const tier = t.tier as Tier;
              const isEditing = tier in tierEdits;
              const editVal = tierEdits[tier] ?? "";

              return (
                <div key={tier} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold capitalize">{t.label}</span>
                    <div className="flex items-center gap-1">
                      {t.overridden && (
                        <Badge variant="outline" className="text-xs">overridden</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Default</div>
                    <div className="font-mono text-sm">{t.defaultLimit.toLocaleString()} req / {t.windowMs / 60000} min</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Effective</div>
                    <div className={`font-mono font-semibold text-sm ${t.overridden ? "text-primary" : ""}`}>
                      {t.effectiveLimit.toLocaleString()} req / window
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Override (leave blank to use default)</Label>
                    <Input
                      type="number"
                      placeholder={String(t.defaultLimit)}
                      value={isEditing ? editVal : (t.overridden ? String(t.effectiveLimit) : "")}
                      onChange={(e) => setTierEdits((prev) => ({ ...prev, [tier]: e.target.value }))}
                      min={50}
                      max={100000}
                      step={100}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 h-7 text-xs"
                      disabled={!isEditing || updateTierMutation.isPending}
                      onClick={() => handleTierSave(tier)}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
                    {t.overridden && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={updateTierMutation.isPending}
                        onClick={() => handleTierReset(tier)}
                        title="Reset to platform default"
                      >
                        <RotateCw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
