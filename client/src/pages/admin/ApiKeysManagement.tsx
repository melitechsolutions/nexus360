import { useState } from "react";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ModuleLayout } from "@/components/ModuleLayout";
import { StatsCard } from "@/components/ui/stats-card";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ApiKeysManagement() {
  const { allowed, isLoading: roleLoading } = useRequireRole(["ict_manager", "super_admin"]);
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState(1000);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const keysQ = trpc.ictManagement.getApiKeys.useQuery(undefined, { refetchInterval: 30000 });
  const createMut = trpc.ictManagement.createApiKey.useMutation({
    onSuccess: (data) => {
      setNewKey(data.keyValue);
      toast({ title: "API Key Created", description: "Copy it now — it won't be shown again." });
      keysQ.refetch();
    },
    onError: (err) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });
  const revokeMut = trpc.ictManagement.revokeApiKey.useMutation({
    onSuccess: () => {
      toast({ title: "API Key Revoked" });
      keysQ.refetch();
    },
    onError: (err) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const keys: any[] = (keysQ.data as any)?.keys ?? [];
  const activeKeys = keys.filter((k: any) => k.isActive === 1);
  const revokedKeys = keys.filter((k: any) => k.isActive === 0);

  const handleCreate = () => {
    if (!keyName.trim()) return;
    createMut.mutate({ keyName: keyName.trim(), rateLimit });
  };

  const maskKey = (key: string) => key.slice(0, 8) + "•".repeat(24) + key.slice(-4);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (roleLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  return (
    <ModuleLayout
      title="API Keys Management"
      description="Create and manage API keys for external integrations"
      icon={<Key className="h-5 w-5" />}
      breadcrumbs={[{ label: "ICT", href: "/crm/ict" }, { label: "API Keys" }]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Total Keys" value={keys.length} icon={<Key className="h-5 w-5" />} color="border-l-blue-500" />
          <StatsCard label="Active" value={activeKeys.length} icon={<CheckCircle2 className="h-5 w-5" />} color="border-l-green-500" />
          <StatsCard label="Revoked" value={revokedKeys.length} icon={<XCircle className="h-5 w-5" />} color="border-l-red-500" />
          <StatsCard label="Rate Limit" value="1000/hr" icon={<Shield className="h-5 w-5" />} color="border-l-purple-500" />
        </div>

        {/* Create Key Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">API Keys</h3>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setNewKey(null); setKeyName(""); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Generate New Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{newKey ? "API Key Created" : "Create API Key"}</DialogTitle>
                <DialogDescription>
                  {newKey ? "Copy this key now. It won't be shown again." : "Give your key a name to identify its purpose."}
                </DialogDescription>
              </DialogHeader>
              {newKey ? (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">{newKey}</div>
                  <Button onClick={() => copyToClipboard(newKey)} className="w-full">
                    <Copy className="h-4 w-4 mr-2" />Copy Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Key Name</Label>
                    <Input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="e.g. Production API, Mobile App" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate Limit (requests/hour)</Label>
                    <Input type="number" value={rateLimit} onChange={e => setRateLimit(Number(e.target.value))} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreate} disabled={!keyName.trim() || createMut.isPending}>
                      {createMut.isPending ? <Spinner className="size-4 mr-2" /> : null}
                      Generate Key
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Keys List */}
        {keysQ.isLoading ? (
          <div className="flex justify-center p-8"><Spinner className="size-8" /></div>
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No API keys yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map((key: any) => (
              <Card key={key.id} className={key.isActive === 0 ? "opacity-60" : ""}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{key.keyName}</span>
                      <Badge variant={key.isActive === 1 ? "default" : "secondary"}>
                        {key.isActive === 1 ? "Active" : "Revoked"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                      {revealedKeys.has(key.id) ? key.keyValue : maskKey(key.keyValue || "")}
                      <button onClick={() => setRevealedKeys(prev => {
                        const s = new Set(prev);
                        s.has(key.id) ? s.delete(key.id) : s.add(key.id);
                        return s;
                      })}>
                        {revealedKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button onClick={() => copyToClipboard(key.keyValue || "")}>
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Created: {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "—"}</span>
                      {key.lastUsedAt && <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                      <span>Rate: {key.rateLimit || 1000}/hr</span>
                    </div>
                  </div>
                  {key.isActive === 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeMut.mutate({ keyId: key.id })}
                      disabled={revokeMut.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />Revoke
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Refresh */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => keysQ.refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>
      </div>
    </ModuleLayout>
  );
}
