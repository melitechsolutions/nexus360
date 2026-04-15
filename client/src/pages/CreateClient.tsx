import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, UserPlus, Building2, MapPin, CreditCard, Users, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";

const INDUSTRIES = [
  "Agriculture", "Automotive", "Banking & Finance", "Construction", "Consulting",
  "Education", "Energy & Utilities", "Food & Beverage", "Government", "Healthcare",
  "Hospitality & Tourism", "ICT / Technology", "Insurance", "Legal", "Logistics & Transport",
  "Manufacturing", "Media & Entertainment", "NGO / Non-Profit", "Real Estate", "Retail",
  "Telecommunications", "Other",
];

const PAYMENT_TERMS = ["Due on Receipt", "Net 7", "Net 14", "Net 30", "Net 45", "Net 60", "Net 90"];

export default function CreateClient() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic info
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    secondaryPhone: "",
    // Address
    address: "",
    city: "",
    country: "Kenya",
    postalCode: "",
    // Business details
    taxId: "",
    website: "",
    industry: "",
    businessType: "",
    registrationNumber: "",
    yearEstablished: "",
    numberOfEmployees: "",
    businessLicense: "",
    // Financial
    paymentTerms: "",
    creditLimit: "",
    bankName: "",
    bankCode: "",
    branch: "",
    bankAccountNumber: "",
    currency: "KES",
    // Acquisition
    leadSource: "",
    // Classification
    status: "active" as "active" | "inactive" | "prospect" | "archived",
    assignedTo: "",
    notes: "",
    // Portal login
    createClientLogin: false,
    clientPassword: "",
  });

  const utils = trpc.useUtils();
  const { data: usersData = [] } = trpc.users.list.useQuery();
  const teamMembers = Array.isArray(usersData) ? usersData : (usersData as any)?.users || [];

  // Create mutation
  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      toast.success("Client created successfully!");
      utils.clients.list.invalidate();
      setLocation(`/clients/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create client: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.contactPerson) {
      toast.error("Please fill in required fields (Company Name and Contact Person)");
      return;
    }

    setIsLoading(true);
    try {
      await mutateAsync(createClientMutation, {
        ...formData,
        yearEstablished: formData.yearEstablished ? parseInt(formData.yearEstablished) : undefined,
        numberOfEmployees: formData.numberOfEmployees ? parseInt(formData.numberOfEmployees) : undefined,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModuleLayout
      title="Create Client"
      description="Add a new client to your CRM"
      icon={<UserPlus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Clients", href: "/clients" },
        { label: "Create" },
      ]}
      backLink={{ label: "Clients", href: "/clients" }}
    >
      <div className="space-y-6 max-w-5xl">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section 1: Basic Contact Information ─────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name <span className="text-destructive">*</span></Label>
                  <Input id="companyName" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} placeholder="Acme Corporation" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Primary Contact Person <span className="text-destructive">*</span></Label>
                  <Input id="contactPerson" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} placeholder="John Doe" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="info@company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+254 700 000 000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                  <Input id="secondaryPhone" value={formData.secondaryPhone} onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })} placeholder="+254 711 000 000" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.company.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / KRA PIN</Label>
                  <Input id="taxId" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} placeholder="A123456789X" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Address ───────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Address Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Business Ave, Suite 100" rows={2} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City / Town</Label>
                  <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Nairobi" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="Kenya" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal / ZIP Code</Label>
                  <Input id="postalCode" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} placeholder="00100" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 3: Business Details ──────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {INDUSTRIES.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select value={formData.businessType} onValueChange={(v) => setFormData({ ...formData, businessType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="limited_company">Limited Company</SelectItem>
                      <SelectItem value="public_company">Public Company</SelectItem>
                      <SelectItem value="ngo">NGO / Non-Profit</SelectItem>
                      <SelectItem value="government">Government / Parastatal</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input id="registrationNumber" value={formData.registrationNumber} onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} placeholder="PVT-12345678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearEstablished">Year Established</Label>
                  <Input id="yearEstablished" type="number" value={formData.yearEstablished} onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value })} placeholder="2010" min="1900" max={new Date().getFullYear()} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                  <Select value={formData.numberOfEmployees} onValueChange={(v) => setFormData({ ...formData, numberOfEmployees: v })}>
                    <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 (Solo)</SelectItem>
                      <SelectItem value="5">2–10</SelectItem>
                      <SelectItem value="25">11–50</SelectItem>
                      <SelectItem value="75">51–100</SelectItem>
                      <SelectItem value="250">101–500</SelectItem>
                      <SelectItem value="750">501–1000</SelectItem>
                      <SelectItem value="1001">1000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessLicense">Business License / Permit Number</Label>
                <Input id="businessLicense" value={formData.businessLicense} onChange={(e) => setFormData({ ...formData, businessLicense: e.target.value })} placeholder="BL-2024-XXXX" />
              </div>
            </CardContent>
          </Card>

          {/* ── Section 4: Financial & Banking ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" /> Financial & Banking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Default Payment Terms</Label>
                  <Select value={formData.paymentTerms} onValueChange={(v) => setFormData({ ...formData, paymentTerms: v })}>
                    <SelectTrigger><SelectValue placeholder="Select terms" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Credit Limit (KES)</Label>
                  <Input id="creditLimit" type="number" value={formData.creditLimit} onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })} placeholder="100,000.00" min="0" step="0.01" />
                </div>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground font-medium">Bank Details</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input id="bankName" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} placeholder="Equity Bank" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankCode">Bank Code</Label>
                  <Input id="bankCode" value={formData.bankCode} onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })} placeholder="068" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input id="branch" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} placeholder="Westlands Branch" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                  <Input id="bankAccountNumber" value={formData.bankAccountNumber} onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })} placeholder="0123456789" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES - Kenya Shilling</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="TZS">TZS - Tanzania Shilling</SelectItem>
                      <SelectItem value="UGX">UGX - Uganda Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 5: CRM Classification ────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> CRM Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Client Status</Label>
                  <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadSource">Lead Source</Label>
                  <Select value={formData.leadSource} onValueChange={(v) => setFormData({ ...formData, leadSource: v })}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="cold_call">Cold Call</SelectItem>
                      <SelectItem value="trade_show">Trade Show</SelectItem>
                      <SelectItem value="advertisement">Advertisement</SelectItem>
                      <SelectItem value="tender">Tender</SelectItem>
                      <SelectItem value="existing_client">Existing Client</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assigned To (Account Manager)</Label>
                  <Select value={formData.assignedTo} onValueChange={(v) => setFormData({ ...formData, assignedTo: v })}>
                    <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      <SelectItem value="unassigned">— Unassigned —</SelectItem>
                      {teamMembers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes & Additional Information</Label>
                <RichTextEditor id="notes" value={formData.notes} onChange={(v) => setFormData({ ...formData, notes: v })} placeholder="Any additional notes, special requirements, or relevant context about this client..." minHeight="120px" />
              </div>
            </CardContent>
          </Card>

          {/* ── Section 6: Client Portal Login ───────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" /> Client Portal Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="createClientLogin"
                  checked={formData.createClientLogin}
                  onCheckedChange={(checked) => setFormData({ ...formData, createClientLogin: !!checked })}
                />
                <Label htmlFor="createClientLogin" className="cursor-pointer">
                  Create client portal login for this client
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">
                    Allows the client to log in and view their invoices, projects, and documents. Requires an email address.
                  </p>
                </Label>
              </div>
              {formData.createClientLogin && (
                <div className="space-y-2 pl-7">
                  <Label htmlFor="clientPassword">Portal Password <span className="text-muted-foreground text-xs">(leave blank to auto-generate)</span></Label>
                  <Input id="clientPassword" type="password" value={formData.clientPassword} onChange={(e) => setFormData({ ...formData, clientPassword: e.target.value })} placeholder="Leave blank to auto-generate" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Form Actions ──────────────────────────────────────── */}
          <div className="flex gap-3 justify-between pb-8">
            <Button type="button" variant="outline" onClick={() => setLocation("/clients")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button type="submit" disabled={isLoading || createClientMutation.isPending} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {isLoading || createClientMutation.isPending ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}


