import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";

export default function CreateContact() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const presetClientId = params.get("clientId") || "";

  const [formData, setFormData] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    mobile: "",
    jobTitle: "",
    department: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    linkedIn: "",
    notes: "",
    isPrimary: false,
    clientId: presetClientId,
  });

  const { data: clients = [] } = trpc.clients.list.useQuery();

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact created successfully!");
      setLocation("/contacts");
    },
    onError: (error: any) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast.error("First name and last name are required");
      return;
    }
    createMutation.mutate({
      ...formData,
      clientId: formData.clientId || undefined,
      salutation: formData.salutation || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      mobile: formData.mobile || undefined,
      jobTitle: formData.jobTitle || undefined,
      department: formData.department || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      postalCode: formData.postalCode || undefined,
      linkedIn: formData.linkedIn || undefined,
      notes: formData.notes || undefined,
    });
  };

  const update = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <ModuleLayout
      title="Create Contact"
      icon={<UserPlus className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        { label: "Create Contact" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/contacts")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Create Contact
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salutation">Salutation</Label>
              <Select value={formData.salutation} onValueChange={(v) => update("salutation", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Dr">Dr</SelectItem>
                  <SelectItem value="Eng">Eng</SelectItem>
                  <SelectItem value="Prof">Prof</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile</Label>
              <Input id="mobile" value={formData.mobile} onChange={(e) => update("mobile", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" value={formData.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={formData.department} onChange={(e) => update("department", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="clientId">Associated Client</Label>
              <select
                id="clientId"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={formData.clientId}
                onChange={(e) => update("clientId", e.target.value)}
              >
                <option value="">-- No client --</option>
                {(clients as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.lastName}`}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={formData.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={formData.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={formData.country} onChange={(e) => update("country", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" value={formData.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Additional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="linkedIn">LinkedIn URL</Label>
              <Input id="linkedIn" value={formData.linkedIn} onChange={(e) => update("linkedIn", e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isPrimary} onCheckedChange={(v) => update("isPrimary", v)} />
              <Label>Primary Contact</Label>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <RichTextEditor value={formData.notes} onChange={(html) => update("notes", html)} minHeight="100px" />
            </div>
          </CardContent>
        </Card>
      </form>
    </ModuleLayout>
  );
}
