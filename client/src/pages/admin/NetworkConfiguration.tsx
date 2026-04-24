import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  Network,
  Globe,
  Shield,
  Wifi,
  Server,
  RefreshCw,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/ui/stats-card";

export default function NetworkConfiguration() {
  const { allowed, isLoading: roleLoading } = useRequireRole(["super_admin"]);

  const netQ = trpc.ictManagement.getNetworkConfig.useQuery(undefined, { refetchInterval: 60000 });
  const data = netQ.data;

  if (roleLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  const externalInterfaces = (data?.interfaces || []).filter((i: any) => !i.internal);
  const internalInterfaces = (data?.interfaces || []).filter((i: any) => i.internal);

  return (
    <ModuleLayout
      title="Network Configuration"
      description="View network interfaces, DNS, SSL and connection settings"
      icon={<Network className="h-5 w-5" />}
      breadcrumbs={[{ label: "ICT", href: "/crm/ict" }, { label: "Network" }]}
    >
      <div className="space-y-6">
        {netQ.isLoading ? (
          <div className="flex justify-center p-12"><Spinner className="size-8" /></div>
        ) : !data ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Failed to load network info</CardContent></Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <StatsCard label="Hostname" value={data.hostname} icon={<Server className="h-5 w-5" />} color="border-l-blue-500" />
              <StatsCard label="Interfaces" value={data.interfaces.length} icon={<Wifi className="h-5 w-5" />} color="border-l-green-500" />
              <StatsCard label="SSL" value={data.ssl.enabled ? "Enabled" : "Disabled"} icon={<Lock className="h-5 w-5" />} color="border-l-purple-500" />
              <StatsCard label="CORS" value={data.cors.enabled ? "Enabled" : "Disabled"} icon={<Shield className="h-5 w-5" />} color="border-l-orange-500" />
            </div>

            {/* External Network Interfaces */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />External Network Interfaces</CardTitle>
                <CardDescription>Public-facing network addresses</CardDescription>
              </CardHeader>
              <CardContent>
                {externalInterfaces.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No external interfaces found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 pr-4 font-medium">Interface</th>
                          <th className="py-2 pr-4 font-medium">Address</th>
                          <th className="py-2 pr-4 font-medium">Family</th>
                          <th className="py-2 pr-4 font-medium">Netmask</th>
                          <th className="py-2 font-medium">MAC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {externalInterfaces.map((iface: any, idx: number) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="py-2 pr-4 font-mono text-xs">{iface.interface}</td>
                            <td className="py-2 pr-4 font-mono text-xs">{iface.address}</td>
                            <td className="py-2 pr-4"><Badge variant="outline">{iface.family}</Badge></td>
                            <td className="py-2 pr-4 font-mono text-xs">{iface.netmask}</td>
                            <td className="py-2 font-mono text-xs">{iface.mac}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Internal Interfaces */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Network className="h-5 w-5" />Internal Interfaces (Loopback)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4 font-medium">Interface</th>
                        <th className="py-2 pr-4 font-medium">Address</th>
                        <th className="py-2 pr-4 font-medium">Family</th>
                        <th className="py-2 font-medium">Netmask</th>
                      </tr>
                    </thead>
                    <tbody>
                      {internalInterfaces.map((iface: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-2 pr-4 font-mono text-xs">{iface.interface}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{iface.address}</td>
                          <td className="py-2 pr-4"><Badge variant="outline">{iface.family}</Badge></td>
                          <td className="py-2 font-mono text-xs">{iface.netmask}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* SSL & CORS */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />SSL Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Status</span>
                    <Badge variant={data.ssl.enabled ? "default" : "destructive"}>
                      {data.ssl.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Provider</span>
                    <span className="text-muted-foreground">{data.ssl.provider}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />CORS Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Status</span>
                    <Badge variant={data.cors.enabled ? "default" : "secondary"}>
                      {data.cors.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Allowed Origins</span>
                    <span className="text-muted-foreground font-mono text-xs">{data.cors.origins.join(", ")}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* DNS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />DNS Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.dns.servers.map((s: string, i: number) => (
                    <Badge key={i} variant="outline" className="font-mono">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Refresh */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last updated: {new Date(data.timestamp).toLocaleTimeString()}</span>
              <Button variant="outline" size="sm" onClick={() => netQ.refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />Refresh
              </Button>
            </div>
          </>
        )}
      </div>
    </ModuleLayout>
  );
}
