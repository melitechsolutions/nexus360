import React, { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { OrgLayout } from "@/components/OrgLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FormToggle } from "@/components/FormToggle";
import { toast } from "sonner";
import {
  Building2, Mail, Phone, MapPin, Globe, Image, Save, X,
  ShieldOff, Pencil, CheckCircle2, Upload, Palette, CreditCard, Briefcase, FileText, Zap, Check,
} from "lucide-react";

export default function OrgSettings() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const [editing, setEditing] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = trpc.multiTenancy.getMyOrg.useQuery(undefined, {
    enabled: !!user?.organizationId,
  });
  const org = data?.organization;
  const featureMap = data?.featureMap ?? {};

  const [testingSmtp, setTestingSmtp] = useState(false);

  const updateMutation = trpc.multiTenancy.updateMyOrg.useMutation({
    onSuccess: () => {
      toast.success("Settings saved", { description: "Organization profile updated successfully." });
      setEditing(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const brandingMutation = trpc.multiTenancy.updateOrgBranding.useMutation({
    onSuccess: () => { refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const testSmtpMutation = trpc.multiTenancy.testSmtpConnection.useMutation({
    onSuccess: (result) => {
      setTestingSmtp(false);
      if (result.success) {
        toast.success("Connection successful", { description: "SMTP credentials are valid." });
      } else {
        toast.error("Connection failed", { description: result.error || "Unable to connect with these settings." });
      }
    },
    onError: (err) => {
      setTestingSmtp(false);
      toast.error("Test failed", { description: err.message });
    },
  });

  const [form, setForm] = useState({
    name: "", contactEmail: "", contactPhone: "", address: "", country: "", domain: "", logoUrl: "",
    primaryColor: "", secondaryColor: "",
    // Extended fields
    industry: "", website: "", taxId: "", billingEmail: "", timezone: "Africa/Nairobi",
    currency: "KES", description: "", employeeCount: "", registrationNumber: "", paymentMethod: "",
    // Email settings
    useGlobalSmtp: true,
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpFromEmail: "",
    smtpFromName: "",
  });

  useEffect(() => {
    if (org) {
      const branding = (org as any).settings?.branding ?? {};
      const emailSettings = (org as any).settings?.emailSettings ?? {};
      setForm({
        name: org.name ?? "",
        contactEmail: (org as any).contactEmail ?? "",
        contactPhone: (org as any).contactPhone ?? "",
        address: (org as any).address ?? "",
        country: (org as any).country ?? "",
        domain: (org as any).domain ?? "",
        logoUrl: (org as any).logoUrl ?? "",
        primaryColor: branding.primaryColor ?? "#2563eb",
        secondaryColor: branding.secondaryColor ?? "#7c3aed",
        industry: (org as any).industry ?? "",
        website: (org as any).website ?? "",
        taxId: (org as any).taxId ?? "",
        billingEmail: (org as any).billingEmail ?? "",
        timezone: (org as any).timezone ?? "Africa/Nairobi",
        currency: (org as any).currency ?? "KES",
        description: (org as any).description ?? "",
        employeeCount: (org as any).employeeCount ? String((org as any).employeeCount) : "",
        registrationNumber: (org as any).registrationNumber ?? "",
        paymentMethod: (org as any).paymentMethod ?? "",
        useGlobalSmtp: emailSettings.useGlobalSmtp ?? true,
        smtpHost: emailSettings.smtpHost ?? "",
        smtpPort: emailSettings.smtpPort ?? "587",
        smtpUser: emailSettings.smtpUser ?? "",
        smtpPassword: emailSettings.smtpPassword ?? "",
        smtpFromEmail: emailSettings.smtpFromEmail ?? "",
        smtpFromName: emailSettings.smtpFromName ?? "",
      });
    }
  }, [org]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo too large. Please use an image under 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm((f) => ({ ...f, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const payload: Record<string, any> = {};
    if (form.name) payload.name = form.name;
    if (form.contactEmail) payload.contactEmail = form.contactEmail;
    if (form.contactPhone) payload.contactPhone = form.contactPhone;
    if (form.address) payload.address = form.address;
    if (form.country) payload.country = form.country;
    if (form.domain) payload.domain = form.domain;
    if (form.logoUrl !== undefined) payload.logoUrl = form.logoUrl;
    if (form.industry) payload.industry = form.industry;
    if (form.website) payload.website = form.website;
    if (form.taxId) payload.taxId = form.taxId;
    if (form.billingEmail) payload.billingEmail = form.billingEmail;
    if (form.timezone) payload.timezone = form.timezone;
    if (form.currency) payload.currency = form.currency;
    if (form.description) payload.description = form.description;
    if (form.employeeCount) payload.employeeCount = parseInt(form.employeeCount, 10);
    if (form.registrationNumber) payload.registrationNumber = form.registrationNumber;
    if (form.paymentMethod) payload.paymentMethod = form.paymentMethod;
    // Include email settings
    payload.useGlobalSmtp = form.useGlobalSmtp;
    if (!form.useGlobalSmtp) {
      if (form.smtpHost) payload.smtpHost = form.smtpHost;
      if (form.smtpPort) payload.smtpPort = form.smtpPort;
      if (form.smtpUser) payload.smtpUser = form.smtpUser;
      if (form.smtpPassword) payload.smtpPassword = form.smtpPassword;
      if (form.smtpFromEmail) payload.smtpFromEmail = form.smtpFromEmail;
      if (form.smtpFromName) payload.smtpFromName = form.smtpFromName;
    }
    updateMutation.mutate(payload);
    brandingMutation.mutate({
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      logoUrl: form.logoUrl,
    });
  };

  const handleCancel = () => {
    if (org) {
      const branding = (org as any).settings?.branding ?? {};
      const emailSettings = (org as any).settings?.emailSettings ?? {};
      setForm({
        name: org.name ?? "",
        contactEmail: (org as any).contactEmail ?? "",
        contactPhone: (org as any).contactPhone ?? "",
        address: (org as any).address ?? "",
        country: (org as any).country ?? "",
        domain: (org as any).domain ?? "",
        logoUrl: (org as any).logoUrl ?? "",
        primaryColor: branding.primaryColor ?? "#2563eb",
        secondaryColor: branding.secondaryColor ?? "#7c3aed",
        industry: (org as any).industry ?? "",
        website: (org as any).website ?? "",
        taxId: (org as any).taxId ?? "",
        billingEmail: (org as any).billingEmail ?? "",
        timezone: (org as any).timezone ?? "Africa/Nairobi",
        currency: (org as any).currency ?? "KES",
        description: (org as any).description ?? "",
        employeeCount: (org as any).employeeCount ? String((org as any).employeeCount) : "",
        registrationNumber: (org as any).registrationNumber ?? "",
        paymentMethod: (org as any).paymentMethod ?? "",
        useGlobalSmtp: emailSettings.useGlobalSmtp ?? true,
        smtpHost: emailSettings.smtpHost ?? "",
        smtpPort: emailSettings.smtpPort ?? "587",
        smtpUser: emailSettings.smtpUser ?? "",
        smtpPassword: emailSettings.smtpPassword ?? "",
        smtpFromEmail: emailSettings.smtpFromEmail ?? "",
        smtpFromName: emailSettings.smtpFromName ?? "",
      });
    }
    setEditing(false);
  };

  // Access guard — allow org admins and super_admins
  if (user?.role !== "super_admin" && user?.role !== "admin") {
    return (
      <OrgLayout title="Organization Settings">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldOff className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-sm">
            Only organization administrators can access organization settings.
          </p>
        </div>
      </OrgLayout>
    );
  }

  if (isLoading) {
    return (
      <OrgLayout title="Organization Settings">
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      </OrgLayout>
    );
  }

  const enabledFeatureCount = Object.values(featureMap).filter(Boolean).length;

  return (
    <OrgLayout
      title="Organization Settings"
      description="Manage your organization profile and configuration"
    >
      <div className="space-y-6 max-w-3xl">

        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div />
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending || brandingMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Summary card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/10 border border-blue-500/20">
                {(org as any)?.logoUrl ? (
                  <img
                    src={(org as any).logoUrl}
                    alt={org?.name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <Building2 className="h-7 w-7 text-blue-500" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{org?.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">{(org as any)?.plan || "starter"}</Badge>
                  {(org as any)?.isActive ? (
                    <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-500">Inactive</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{enabledFeatureCount} modules enabled</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Profile form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization Profile</CardTitle>
            <CardDescription>Basic information about your organization</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Organization Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={!editing}
                  className="pl-9"
                  placeholder="Acme Corp"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  disabled={!editing}
                  className="pl-9"
                  placeholder="info@acme.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contactPhone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  disabled={!editing}
                  className="pl-9"
                  placeholder="+1 555 0100"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  disabled={!editing}
                  className="pl-9"
                  placeholder="United States"
                />
              </div>
            </div>
            <div className="col-span-full space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  disabled={!editing}
                  className="pl-9"
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="domain">Website / Domain</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="domain"
                  value={form.domain}
                  onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                  disabled={!editing}
                  className="pl-9"
                  placeholder="acme.com"
                />
              </div>
            </div>
            {/* Logo upload */}
            <div className="col-span-full space-y-1.5">
              <Label>Organization Logo</Label>
              <div className="flex items-center gap-4">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="h-14 w-14 rounded-xl object-cover border border-white/10"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    aria-label="Upload organization logo"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={!editing}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!editing}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {form.logoUrl ? "Replace Logo" : "Upload Logo"}
                  </Button>
                  {form.logoUrl && editing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                    >
                      Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 2 MB</p>
                </div>
              </div>
            </div>

            {/* Brand colors */}
            <div className="space-y-1.5">
              <Label htmlFor="primaryColor" className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />Primary Color
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="primaryColor"
                  type="color"
                  title="Primary brand color"
                  value={form.primaryColor || "#2563eb"}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  disabled={!editing}
                  className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0.5 disabled:opacity-50"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  disabled={!editing}
                  placeholder="#2563eb"
                  className="font-mono text-sm flex-1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondaryColor" className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />Secondary Color
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="secondaryColor"
                  type="color"
                  title="Secondary brand color"
                  value={form.secondaryColor || "#7c3aed"}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  disabled={!editing}
                  className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0.5 disabled:opacity-50"
                />
                <Input
                  value={form.secondaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  disabled={!editing}
                  placeholder="#7c3aed"
                  className="font-mono text-sm flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> Business Details</CardTitle>
            <CardDescription>Industry classification and business registration information</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))} disabled={!editing}>
                <SelectTrigger><SelectValue placeholder="Select industry…" /></SelectTrigger>
                <SelectContent>
                  {["Agriculture","Automotive","Construction","Education","Energy","Finance & Banking",
                    "Government","Healthcare","Hospitality","Insurance","Legal","Logistics & Transport",
                    "Manufacturing","Media & Entertainment","NGO / Non-profit","Real Estate",
                    "Retail & E-commerce","Telecommunications","Technology","Other"].map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employee Count</Label>
              <Input value={form.employeeCount} onChange={(e) => setForm((f) => ({ ...f, employeeCount: e.target.value }))} disabled={!editing} type="number" min="1" placeholder="50" />
            </div>
            <div className="space-y-1.5">
              <Label>Registration Number</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.registrationNumber} onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))} disabled={!editing} className="pl-9" placeholder="CPR/2023/12345" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tax ID / KRA PIN</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} disabled={!editing} className="pl-9" placeholder="A000000000X" />
              </div>
            </div>
            <div className="space-y--1.5">
              <Label>Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} disabled={!editing} className="pl-9" placeholder="https://yourcompany.com" />
              </div>
            </div>
            <div className="col-span-full space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={!editing} rows={3} placeholder="Brief description of your organization…" />
            </div>
          </CardContent>
        </Card>

        {/* Billing & Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Billing & Payment</CardTitle>
            <CardDescription>Billing contact, currency preferences, and payment method</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Billing Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={form.billingEmail} onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))} disabled={!editing} className="pl-9" placeholder="billing@yourcompany.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v }))} disabled={!editing}>
                <SelectTrigger><SelectValue placeholder="Select method…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit / Debit Card</SelectItem>
                  <SelectItem value="invoice">Invoice (Net 30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))} disabled={!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["KES","KES — Kenyan Shilling"],["USD","USD — US Dollar"],["EUR","EUR — Euro"],
                    ["GBP","GBP — British Pound"],["UGX","UGX — Ugandan Shilling"],["TZS","TZS — Tanzanian Shilling"],
                    ["RWF","RWF — Rwandan Franc"],["ZAR","ZAR — South African Rand"],["NGN","NGN — Nigerian Naira"],["GHS","GHS — Ghanaian Cedi"]].map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))} disabled={!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["Africa/Nairobi","Africa/Nairobi (EAT +3)"],["Africa/Lagos","Africa/Lagos (WAT +1)"],
                    ["Africa/Johannesburg","Africa/Johannesburg (SAST +2)"],["Africa/Cairo","Africa/Cairo (EET +2)"],
                    ["Africa/Accra","Africa/Accra (GMT +0)"],["Europe/London","Europe/London (GMT/BST)"],
                    ["Europe/Paris","Europe/Paris (CET +1)"],["America/New_York","America/New_York (EST/EDT)"]].map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email & SMTP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Email & SMTP Configuration</CardTitle>
            <CardDescription>Configure email delivery settings for your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SMTP Toggle */}
            <div className="space-y-4 pb-4 border-b border-white/5">
              <FormToggle
                id="useGlobalSmtp"
                label="Use Global SMTP"
                description="Use the platform's default email service instead of custom SMTP"
                checked={form.useGlobalSmtp}
                onChange={(checked) => setForm((f) => ({ ...f, useGlobalSmtp: checked }))}
                disabled={!editing}
              />
            </div>

            {/* Custom SMTP Configuration (conditional) */}
            {!form.useGlobalSmtp && (
              <div className="space-y-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>Custom SMTP is enabled. Configure your email provider settings below.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={form.smtpHost}
                      onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
                      disabled={!editing || form.useGlobalSmtp}
                      placeholder="e.g., smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={form.smtpPort}
                      onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))}
                      disabled={!editing || form.useGlobalSmtp}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpFromEmail">From Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="smtpFromEmail"
                        type="email"
                        value={form.smtpFromEmail}
                        onChange={(e) => setForm((f) => ({ ...f, smtpFromEmail: e.target.value }))}
                        disabled={!editing || form.useGlobalSmtp}
                        className="pl-9"
                        placeholder="noreply@yourcompany.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpFromName">From Display Name</Label>
                    <Input
                      id="smtpFromName"
                      value={form.smtpFromName}
                      onChange={(e) => setForm((f) => ({ ...f, smtpFromName: e.target.value }))}
                      disabled={!editing || form.useGlobalSmtp}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={form.smtpUser}
                      onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
                      disabled={!editing || form.useGlobalSmtp}
                      placeholder="username@provider.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={form.smtpPassword}
                      onChange={(e) => setForm((f) => ({ ...f, smtpPassword: e.target.value }))}
                      disabled={!editing || form.useGlobalSmtp}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Test Connection Button */}
                {editing && !form.useGlobalSmtp && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={!form.smtpHost || !form.smtpPort || !form.smtpUser || !form.smtpPassword || testingSmtp}
                    onClick={() => {
                      setTestingSmtp(true);
                      testSmtpMutation.mutate({
                        smtpHost: form.smtpHost,
                        smtpPort: form.smtpPort,
                        smtpUser: form.smtpUser,
                        smtpPassword: form.smtpPassword,
                        smtpFromEmail: form.smtpFromEmail,
                      });
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {testingSmtp ? "Testing..." : "Test Connection"}
                  </Button>
                )}
              </div>
            )}

            {/* Global SMTP Info (when enabled) */}
            {form.useGlobalSmtp && (
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>Using platform default email service. Email configuration will be handled by the platform.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enabled modules (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enabled Modules</CardTitle>
            <CardDescription>Modules enabled on your plan by your platform administrator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(featureMap).length === 0 ? (
                <p className="text-sm text-muted-foreground">No modules configured yet.</p>
              ) : (
                Object.entries(featureMap).map(([key, enabled]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className={enabled
                      ? "border-green-500/30 bg-green-500/10 text-green-600"
                      : "border-muted text-muted-foreground opacity-50"}
                  >
                    {key.replace(/_/g, " ")}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Read-only fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
            <CardDescription>Read-only fields managed by the platform</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Subdomain / Slug</p>
              <p className="font-mono font-medium">{(org as any)?.slug || slug}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Plan</p>
              <p className="capitalize font-medium">{(org as any)?.plan || "starter"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Max Users</p>
              <p className="font-medium">{(org as any)?.maxUsers ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Organization ID</p>
              <p className="font-mono text-xs text-muted-foreground">{user?.organizationId}</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </OrgLayout>
  );
}
