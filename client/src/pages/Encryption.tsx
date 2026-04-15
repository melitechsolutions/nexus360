import { Lock, Key, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Encryption() {
  const eventsQuery = trpc.advancedSecurity.listSecurityEvents.useQuery({});
  const encryptMutation = trpc.advancedSecurity.encryptData.useMutation({
    onSuccess: () => toast.success("Encryption operation completed"),
    onError: (err: any) => toast.error(err.message ?? "Encryption failed"),
  });
  const keysMutation = trpc.advancedSecurity.manageEncryptionKeys.useMutation({
    onSuccess: () => {
      toast.success("Key operation completed");
      eventsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message ?? "Key operation failed"),
  });

  const events = (eventsQuery.data as any[]) ?? ((eventsQuery.data as any)?.events ?? []);

  return (
    <ModuleLayout
      title="Encryption"
      icon={<Lock className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Security" },
        { label: "Encryption" },
      ]}
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Data Encryption Management</h2>
        <Button onClick={() => encryptMutation.mutate({} as any)} disabled={encryptMutation.isPending}>
          {encryptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
          Encrypt New Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => keysMutation.mutate({ action: "generate" } as any)} disabled={keysMutation.isPending}>
              <Key className="h-4 w-4 mr-2" /> Generate New Key
            </Button>
            <Button className="w-full" variant="secondary" onClick={() => keysMutation.mutate({ action: "rotate" } as any)} disabled={keysMutation.isPending}>
              <Shield className="h-4 w-4 mr-2" /> Rotate All Keys
            </Button>
            <Button className="w-full" variant="outline" onClick={() => keysMutation.mutate({ action: "revoke" } as any)} disabled={keysMutation.isPending}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Revoke Keys
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Events</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {eventsQuery.error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {eventsQuery.error.message}</div>
            )}
            {!eventsQuery.isLoading && !eventsQuery.error && events.length === 0 && (
              <p className="text-center text-gray-500 py-8">No data found.</p>
            )}
            <div className="space-y-2">
              {events.map((evt: any, idx: number) => (
                <div key={evt.id ?? idx} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{evt.eventType ?? evt.type ?? evt.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{evt.createdAt ?? evt.timestamp ?? "—"}</p>
                  </div>
                  <Badge variant={evt.severity === "critical" ? "destructive" : "secondary"}>
                    {evt.severity ?? evt.status ?? "info"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
