import React, { useState, useEffect } from 'react';
import { Building2, Users, Globe, CreditCard, Pencil, Save, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function EnterpriseSettings() {
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});

  const { data: companyInfo, isLoading: infoLoading, refetch: refetchInfo } = trpc.settings.getCompanyInfo.useQuery();
  const { data: userCounts, isLoading: countsLoading } = trpc.settings.getUserCounts.useQuery();

  const updateCompanyInfo = trpc.settings.updateCompanyInfo.useMutation({
    onSuccess: () => { toast.success("Company info saved"); refetchInfo(); setEditingProfile(false); },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    if (companyInfo) setProfileForm(companyInfo as Record<string, string>);
  }, [companyInfo]);

  const totalUsers = userCounts ? Object.values(userCounts as Record<string, number>).reduce((a, b) => a + b, 0) : 0;
  const adminUsers = userCounts ? ((userCounts as any).super_admin ?? 0) + ((userCounts as any).admin ?? 0) : 0;

  const PROFILE_FIELDS = [
    { key: 'companyName', label: 'Company Name', placeholder: 'Your Company Name' },
    { key: 'industry', label: 'Industry', placeholder: 'SaaS / Technology' },
    { key: 'email', label: 'Contact Email', placeholder: 'info@yourcompany.com' },
    { key: 'phone', label: 'Phone', placeholder: '+254 700 000 000' },
    { key: 'website', label: 'Website', placeholder: 'https://yourcompany.com' },
    { key: 'address', label: 'Address', placeholder: 'City, Country' },
    { key: 'country', label: 'Country', placeholder: 'Kenya' },
    { key: 'taxPin', label: 'Tax PIN / VAT Number', placeholder: 'P000000000X' },
  ];

  return (
    <ModuleLayout
      title="Enterprise Settings"
      icon={<Building2 className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/enterprise/tenants" }, { label: "Enterprise Settings" }]}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Company Profile ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Company Profile</CardTitle>
              <CardDescription>Core platform identity information</CardDescription>
            </div>
            {!editingProfile ? (
              <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditingProfile(false); setProfileForm(companyInfo as any ?? {}); }}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                </Button>
                <Button size="sm" disabled={updateCompanyInfo.isPending} onClick={() => updateCompanyInfo.mutate(profileForm)}>
                  {updateCompanyInfo.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {infoLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
                    {editingProfile ? (
                      <Input
                        value={profileForm[key] ?? ''}
                        placeholder={placeholder}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium">{(companyInfo as any)?.[key] || <span className="text-muted-foreground italic">Not set</span>}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── User Statistics ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Platform Users</CardTitle>
              <CardDescription>Across all organizations</CardDescription>
            </CardHeader>
            <CardContent>
              {countsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm font-medium">Total Users</span>
                    <Badge variant="secondary">{totalUsers}</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm font-medium">Admins</span>
                    <Badge variant="secondary">{adminUsers}</Badge>
                  </div>
                  {userCounts && Object.entries(userCounts as Record<string, number>).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between px-3 py-1.5 border rounded-lg">
                      <span className="text-sm capitalize">{role.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Integration Status ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Integration Status</CardTitle>
              <CardDescription>Configured via environment variables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { name: 'Stripe Payments', key: 'stripe' },
                  { name: "M-Pesa (Africa's Talking)", key: 'mpesa' },
                  { name: 'Google OAuth', key: 'oauth' },
                  { name: 'SMTP Email', key: 'smtp' },
                  { name: 'AWS S3 Storage', key: 's3' },
                  { name: 'Anthropic AI', key: 'ai' },
                ].map(({ name }) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm">{name}</span>
                    <span className="text-xs text-muted-foreground">Env vars</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Security & Compliance ── */}
      <Card>
        <CardHeader>
          <CardTitle>Security & Compliance</CardTitle>
          <CardDescription>Platform security configuration — managed via system settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'JWT Authentication', status: 'Active', ok: true },
              { name: 'Password Hashing', status: 'bcrypt (10 rounds)', ok: true },
              { name: 'Rate Limiting', status: 'Active', ok: true },
              { name: 'RBAC Permissions', status: 'Active', ok: true },
              { name: 'Org Scope Isolation', status: 'Active', ok: true },
              { name: 'CSRF Protection', status: 'JWT mode', ok: true },
            ].map(item => (
              <div key={item.name} className="flex items-center gap-3 rounded-lg border p-3">
                {item.ok
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  : <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />
                }
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
