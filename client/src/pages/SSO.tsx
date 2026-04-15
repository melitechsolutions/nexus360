import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LogIn, Loader2, Save, Shield } from "lucide-react";

export default function SSO() {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const ssoQuery = trpc.settings.getByCategory.useQuery({ category: "sso" });

  const updateMutation = trpc.settings.updateByCategory.useMutation({
    onSuccess: () => {
      toast.success("Done");
      ssoQuery.refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const data: Record<string, string> = (ssoQuery.data as any) ?? {};

  useEffect(() => {
    if (ssoQuery.data) {
      setFormValues({ ...data });
    }
  }, [ssoQuery.data]);

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate({ category: "sso", values: formValues });
  };

  if (ssoQuery.isLoading) {
    return (
      <ModuleLayout
        title="Single Sign-On"
        description="Configure SSO providers and settings"
        icon={<LogIn className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "SSO" },
        ]}
      >
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  if (ssoQuery.error) {
    return (
      <ModuleLayout
        title="Single Sign-On"
        description="Configure SSO providers and settings"
        icon={<LogIn className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Settings", href: "/settings" },
          { label: "SSO" },
        ]}
      >
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">Error: {ssoQuery.error.message}</div>
      </ModuleLayout>
    );
  }

  const knownKeys = Object.keys(data);
  const hasSettings = knownKeys.length > 0;

  const defaultFields = [
    { key: "provider", label: "SSO Provider" },
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret" },
    { key: "tenant_id", label: "Tenant ID" },
    { key: "domain", label: "Domain" },
    { key: "callback_url", label: "Callback URL" },
    { key: "enabled", label: "Enabled (true/false)" },
  ];

  const fieldsToShow = hasSettings
    ? knownKeys.map((k) => ({ key: k, label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }))
    : defaultFields;

  return (
    <ModuleLayout
      title="Single Sign-On"
      description="Configure SSO providers and settings"
      icon={<LogIn className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Settings", href: "/settings" },
        { label: "SSO" },
      ]}
    >
      <div className="space-y-6">

        {/* SSO Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                SSO Status
              </CardTitle>
              <Badge variant={data["enabled"] === "true" ? "default" : "secondary"}>
                {data["enabled"] === "true" ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {hasSettings ? (
              <p className="text-sm text-muted-foreground">
                Provider: <strong>{data["provider"] ?? "—"}</strong> &middot; Domain: <strong>{data["domain"] ?? "—"}</strong>
              </p>
            ) : (
              <p className="text-center text-gray-500 py-8">No data found.</p>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>SSO Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fieldsToShow.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-sm font-medium">{field.label}</label>
                <Input
                  value={formValues[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.label}
                  type={field.key.includes("secret") ? "password" : "text"}
                />
              </div>
            ))}
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Guide</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Register your application with the SSO provider (Azure AD, Okta, Auth0, etc.)</p>
            <p>2. Obtain the Client ID, Client Secret, and Tenant ID from the provider dashboard.</p>
            <p>3. Set the Callback URL to your application's authentication callback endpoint.</p>
            <p>4. Enter the values above and set Enabled to "true" to activate SSO.</p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
