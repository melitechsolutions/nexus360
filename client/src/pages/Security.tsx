import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, AlertTriangle, Activity, Clock } from "lucide-react";

export default function Security() {
  const [auditScope, setAuditScope] = useState<"full" | "permissions" | "encryption" | "access_logs">("full");

  const dashboardQuery = trpc.securityCompliance.getSecurityDashboard.useQuery({});
  const eventsQuery = trpc.advancedSecurity.listSecurityEvents.useQuery({});
  const auditQuery = trpc.securityCompliance.performSecurityAudit.useQuery(
    { scope: auditScope },
    { enabled: false }
  );

  const handleRunAudit = () => {
    auditQuery.refetch().then(() => {
      toast.success("Security audit completed");
    }).catch((e: any) => toast.error(e.message));
  };

  if (dashboardQuery.isLoading || eventsQuery.isLoading) {
    return (
      <ModuleLayout
        title="Security"
        description="Security dashboard, events, and audit"
        icon={<Shield className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "Security" },
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
        title="Security"
        description="Security dashboard, events, and audit"
        icon={<Shield className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "Security" },
        ]}
      >
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {dashboardQuery.error.message}</div>
      </ModuleLayout>
    );
  }

  const dashboard: any = dashboardQuery.data ?? {};
  const summary: any = dashboard.summary ?? {};
  const recentActivity: any[] = dashboard.recentActivity ?? [];
  const events: any[] = (eventsQuery.data as any)?.events ?? [];
  const auditData: any = auditQuery.data ?? null;

  return (
    <ModuleLayout
      title="Security"
      description="Security dashboard, events, and audit"
      icon={<Shield className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings" },
        { label: "Security" },
      ]}
    >
      <div className="space-y-6">

        {/* Score & Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Security Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dashboard.overallSecureScore ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vulnerabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.vulnerabilities ?? 0}</p>
              <p className="text-xs text-red-600">{summary.criticalVulnerabilities ?? 0} critical</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={summary.complianceStatus === "compliant" ? "default" : "secondary"}>
                {summary.complianceStatus ?? "—"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">2FA Adoption</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.twoFactorAdoption ?? 0}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Audit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Security Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={auditScope}
                onChange={(e) => setAuditScope(e.target.value as any)}
              >
                <option value="full">Full Audit</option>
                <option value="permissions">Permissions</option>
                <option value="encryption">Encryption</option>
                <option value="access_logs">Access Logs</option>
              </select>
              <Button onClick={handleRunAudit} disabled={auditQuery.isFetching}>
                {auditQuery.isFetching ? "Running..." : "Run Audit"}
              </Button>
            </div>
            {auditData && (
              <div className="space-y-2">
                <div className="flex gap-4 text-sm">
                  <span>ID: <strong>{auditData.auditId ?? "—"}</strong></span>
                  <span>Findings: <strong>{auditData.findingsCount ?? 0}</strong></span>
                  <span>Critical: <strong className="text-red-600">{auditData.criticalCount ?? 0}</strong></span>
                  <Badge>{auditData.status ?? "—"}</Badge>
                </div>
                {(auditData.findings ?? []).length > 0 && (
                  <div className="border rounded-lg divide-y max-h-60 overflow-auto">
                    {(auditData.findings ?? []).map((f: any) => (
                      <div key={f.id} className="p-3 text-sm flex items-start gap-2">
                        <Badge variant={f.severity === "critical" ? "destructive" : "secondary"} className="text-xs">
                          {f.severity ?? "—"}
                        </Badge>
                        <div>
                          <p className="font-medium">{f.title ?? "—"}</p>
                          <p className="text-muted-foreground text-xs">{f.description ?? ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(auditData.findings ?? []).length === 0 && (
                  <p className="text-center text-gray-500 py-8">No findings.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data found.</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-64 overflow-auto">
                {recentActivity.map((a: any) => (
                  <div key={a.id} className="p-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{a.type ?? "—"}</Badge>
                      <span>{a.details ?? "—"}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{a.severity ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No data found.</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-72 overflow-auto">
                {events.map((ev: any) => (
                  <div key={ev.id} className="p-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{ev.eventType ?? "—"}</Badge>
                      <span>{ev.action ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant={ev.severity === "CRITICAL" ? "destructive" : "secondary"} className="text-xs">
                        {ev.severity ?? "—"}
                      </Badge>
                      <span>{ev.createdAt ? new Date(ev.createdAt).toLocaleString() : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

