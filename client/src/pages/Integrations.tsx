import { useState } from "react";
import { Plug, Plus, TestTube, Trash2, Power, PowerOff, Mail, Webhook, Key, Globe, RefreshCw } from "lucide-react";
import ModuleLayout from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatsCard } from "@/components/ui/stats-card";

const INTEGRATION_TYPES = [
  { value: "api", label: "API Key", icon: Key, description: "Connect via API key authentication" },
  { value: "webhook", label: "Webhook", icon: Webhook, description: "Set up webhook endpoints" },
  { value: "oauth", label: "OAuth", icon: Globe, description: "OAuth 2.0 authentication flow" },
  { value: "custom", label: "Custom", icon: Plug, description: "Custom integration configuration" },
] as const;

const POPULAR_PROVIDERS = [
  { name: "SMTP Email", provider: "smtp", type: "custom" as const, icon: Mail, color: "bg-blue-500" },
  { name: "Slack", provider: "slack", type: "webhook" as const, icon: Webhook, color: "bg-purple-500" },
  { name: "Stripe", provider: "stripe", type: "api" as const, icon: Key, color: "bg-indigo-500" },
  { name: "M-Pesa", provider: "mpesa", type: "api" as const, icon: Key, color: "bg-green-500" },
  { name: "SendGrid", provider: "sendgrid", type: "api" as const, icon: Mail, color: "bg-blue-600" },
  { name: "Twilio SMS", provider: "twilio", type: "api" as const, icon: Globe, color: "bg-red-500" },
];

export default function Integrations() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [integrationType, setIntegrationType] = useState<string>("api");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  // SMTP-specific fields
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpSecure, setSmtpSecure] = useState<string>("tls");

  const isSMTP = provider === "smtp";

  const { data, refetch, isLoading } = trpc.thirdPartyIntegrations.listIntegrations.useQuery({ limit: 50 });

  const configureMutation = trpc.thirdPartyIntegrations.configureIntegration.useMutation({
    onSuccess: () => {
      toast.success("Integration configured successfully");
      refetch();
      resetForm();
      setIsAddOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const testMutation = trpc.thirdPartyIntegrations.testIntegration.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(`Integration test passed (${data.responseTime}ms)`);
      else toast.error(data.error || "Test failed");
    },
    onError: (err) => toast.error(err.message),
  });

  const disableMutation = trpc.thirdPartyIntegrations.disableIntegration.useMutation({
    onSuccess: () => { toast.success("Integration disabled"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.thirdPartyIntegrations.deleteIntegration.useMutation({
    onSuccess: () => { toast.success("Integration deleted"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setProvider(""); setIntegrationType("api"); setApiKey(""); setWebhookUrl(""); setClientId(""); setClientSecret("");
    setSmtpHost(""); setSmtpPort("587"); setSmtpUsername(""); setSmtpPassword(""); setSmtpFromEmail(""); setSmtpFromName(""); setSmtpSecure("tls");
  };

  const handleConfigure = () => {
    if (!provider.trim()) { toast.error("Provider name is required"); return; }

    if (isSMTP) {
      if (!smtpHost.trim()) { toast.error("SMTP host is required"); return; }
      if (!smtpUsername.trim()) { toast.error("SMTP username is required"); return; }
      if (!smtpPassword.trim()) { toast.error("SMTP password is required"); return; }
      if (!smtpFromEmail.trim()) { toast.error("From email is required"); return; }
      configureMutation.mutate({
        provider: "smtp",
        integrationType: "custom",
        config: {
          host: smtpHost,
          port: parseInt(smtpPort) || 587,
          username: smtpUsername,
          password: smtpPassword,
          fromEmail: smtpFromEmail,
          fromName: smtpFromName,
          secure: smtpSecure,
        },
      });
      return;
    }

    configureMutation.mutate({
      provider: provider.trim(),
      integrationType: integrationType as "api" | "webhook" | "oauth" | "custom",
      config: {
        ...(apiKey && { apiKey }),
        ...(webhookUrl && { webhookUrl }),
        ...(clientId && { clientId }),
        ...(clientSecret && { clientSecret }),
      },
    });
  };

  const integrations = data?.integrations || [];
  const activeCount = integrations.filter(i => i.status === "active").length;

  return (
    <ModuleLayout
      title="Integrations"
      description="Connect third-party services, SMTP, webhooks, and API integrations"
      icon={<Plug className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: "Integrations" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard label="Total Integrations" value={integrations.length} icon={<Plug className="h-5 w-5" />} color="border-l-blue-500" />
          <StatsCard label="Active" value={activeCount} icon={<Power className="h-5 w-5" />} color="border-l-green-500" />
          <StatsCard label="Inactive" value={integrations.length - activeCount} icon={<PowerOff className="h-5 w-5" />} color="border-l-amber-500" />
        </div>

        <Tabs defaultValue="configured">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="configured">Configured</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
            </TabsList>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Integration</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{isSMTP ? "Configure SMTP Email" : "Configure New Integration"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Provider Name</Label>
                    <Input placeholder="e.g., smtp, slack, stripe..." value={provider} onChange={(e) => setProvider(e.target.value)} />
                  </div>
                  {!isSMTP && (
                    <div className="space-y-2">
                      <Label>Integration Type</Label>
                      <Select value={integrationType} onValueChange={setIntegrationType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INTEGRATION_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* SMTP-specific fields */}
                  {isSMTP && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>SMTP Host *</Label>
                          <Input placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input type="number" placeholder="587" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Encryption</Label>
                        <Select value={smtpSecure} onValueChange={setSmtpSecure}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tls">STARTTLS (port 587)</SelectItem>
                            <SelectItem value="ssl">SSL/TLS (port 465)</SelectItem>
                            <SelectItem value="none">None (port 25)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Username / Email *</Label>
                        <Input placeholder="your@email.com" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input type="password" placeholder="App password or SMTP password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>From Email *</Label>
                          <Input placeholder="noreply@yourdomain.com" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>From Name</Label>
                          <Input placeholder="Your Company Name" value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Generic integration fields */}
                  {!isSMTP && (integrationType === "api" || integrationType === "custom") && (
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input type="password" placeholder="Enter API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                    </div>
                  )}
                  {!isSMTP && (integrationType === "webhook" || integrationType === "custom") && (
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input placeholder="https://..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                    </div>
                  )}
                  {!isSMTP && integrationType === "oauth" && (
                    <>
                      <div className="space-y-2">
                        <Label>Client ID</Label>
                        <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Secret</Label>
                        <Input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleConfigure} disabled={configureMutation.isPending}>
                    {configureMutation.isPending ? "Configuring..." : "Configure"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Configured Integrations */}
          <TabsContent value="configured" className="mt-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading integrations...</div>
            ) : integrations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Plug className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No integrations configured yet</p>
                  <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Your First Integration
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((integration) => (
                  <Card key={integration.id} className={cn(integration.status !== "active" && "opacity-60")}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Plug className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base capitalize">{integration.provider}</CardTitle>
                            <CardDescription className="capitalize">{integration.integrationType}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={integration.status === "active" ? "default" : "secondary"}>
                          {integration.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testMutation.mutate({ integrationId: integration.id })}
                          disabled={testMutation.isPending}
                        >
                          <TestTube className="h-3 w-3 mr-1" /> Test
                        </Button>
                        {integration.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => disableMutation.mutate({ integrationId: integration.id })}
                          >
                            <PowerOff className="h-3 w-3 mr-1" /> Disable
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate({ integrationId: integration.id })}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                      {integration.lastSyncAt && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Last tested: {new Date(integration.lastSyncAt).toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Available Integrations */}
          <TabsContent value="available" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {POPULAR_PROVIDERS.map((p) => {
                const Icon = p.icon;
                const isConfigured = integrations.some(i => i.provider === p.provider);
                return (
                  <Card key={p.provider} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("p-2 rounded-lg text-white", p.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.type}</p>
                        </div>
                      </div>
                      {isConfigured ? (
                        <Badge variant="secondary">Already configured</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setProvider(p.provider);
                            setIntegrationType(p.type);
                            if (p.provider === "smtp") {
                              setSmtpSecure("tls");
                              setSmtpPort("587");
                            }
                            setIsAddOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Configure
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
