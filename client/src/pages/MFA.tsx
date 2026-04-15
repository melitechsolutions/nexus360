import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { KeyRound, Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";

export default function MFA() {
  const [method, setMethod] = useState<"authenticator_app" | "sms" | "email">("authenticator_app");
  const [disablePassword, setDisablePassword] = useState("");

  const dashboardQuery = trpc.securityCompliance.getSecurityDashboard.useQuery({});

  const enableMutation = trpc.securityCompliance.enableTwoFactorAuth.useMutation({
    onSuccess: () => {
      toast.success("Done");
      dashboardQuery.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const disableMutation = trpc.auth.disable2FA.useMutation({
    onSuccess: () => {
      toast.success("Done");
      dashboardQuery.refetch();
      setDisablePassword("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (dashboardQuery.isLoading) {
    return (
      <ModuleLayout
        title="Multi-Factor Authentication"
        description="Manage two-factor authentication for your account"
        icon={<KeyRound className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "MFA" },
        ]}
      >
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  if (dashboardQuery.error) {
    return (
      <ModuleLayout
        title="Multi-Factor Authentication"
        description="Manage two-factor authentication for your account"
        icon={<KeyRound className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "MFA" },
        ]}
      >
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {dashboardQuery.error.message}</div>
      </ModuleLayout>
    );
  }

  const dashboard: any = dashboardQuery.data ?? {};
  const summary: any = dashboard.summary ?? {};
  const twoFactorAdoption = summary.twoFactorAdoption ?? 0;
  const mfaEnabled = twoFactorAdoption > 0;

  const handleEnable = () => {
    enableMutation.mutate({ userId: 0, method });
  };

  const handleDisable = () => {
    if (!disablePassword) {
      toast.error("Password is required to disable 2FA");
      return;
    }
    disableMutation.mutate({ password: disablePassword });
  };

  const backupCodes: string[] = (enableMutation.data as any)?.backupCodes ?? [];

  return (
    <ModuleLayout
      title="Multi-Factor Authentication"
      description="Manage two-factor authentication for your account"
      icon={<KeyRound className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings" },
        { label: "MFA" },
      ]}
    >
      <div className="space-y-6">

        {/* Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                MFA Status
              </CardTitle>
              <Badge variant={mfaEnabled ? "default" : "secondary"}>
                {mfaEnabled ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Enabled</span>
                ) : (
                  <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Disabled</span>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              2FA adoption rate: <strong>{twoFactorAdoption}%</strong>
            </p>
            {mfaEnabled ? (
              <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                Two-factor authentication is active. Your account has an extra layer of security.
              </p>
            ) : (
              <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                Two-factor authentication is not enabled. Enable it to secure your account.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Enable 2FA */}
        {!mfaEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>Enable Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Method</label>
                <select
                  className="border rounded px-3 py-2 text-sm w-full"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                >
                  <option value="authenticator_app">Authenticator App</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <Button onClick={handleEnable} disabled={enableMutation.isPending}>
                {enableMutation.isPending ? "Enabling..." : "Enable 2FA"}
              </Button>
              {backupCodes.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Backup Codes (save these):</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                    {backupCodes.map((code: string, i: number) => (
                      <span key={i}>{code}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Disable 2FA */}
        {mfaEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>Disable Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter your password to confirm</label>
                <Input
                  type="password"
                  placeholder="Current password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
              </div>
              <Button variant="destructive" onClick={handleDisable} disabled={disableMutation.isPending}>
                {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                <p className="font-medium">Sign in</p>
                <p className="text-sm text-muted-foreground">Enter your username and password</p>
              </div>
              <div className="space-y-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                <p className="font-medium">Get code</p>
                <p className="text-sm text-muted-foreground">Open your authenticator app for a 6-digit code</p>
              </div>
              <div className="space-y-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                <p className="font-medium">Verify</p>
                <p className="text-sm text-muted-foreground">Enter the code to complete sign-in</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

