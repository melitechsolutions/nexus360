import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { UserCog } from "lucide-react";

export default function EditContact() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
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
    notes: "",
    isPrimary: false,
    clientId: "",
    salutation: "",
    postalCode: "",
    linkedIn: "",
  });

  const { data: contact, isLoading: isLoadingContact } = trpc.contacts.getById.useQuery(id || "", { enabled: !!id });
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (contact) {
      setFormData({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: contact.mobile || "",
        jobTitle: contact.jobTitle || "",
        department: contact.department || "",
        address: contact.address || "",
        city: contact.city || "",
        country: contact.country || "",
        notes: contact.notes || "",
        isPrimary: !!(contact as any).isPrimary,
        clientId: contact.clientId || "",
        salutation: (contact as any).salutation || "",
        postalCode: (contact as any).postalCode || "",
        linkedIn: (contact as any).linkedIn || "",
      });
    }
  }, [contact]);

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated successfully!");
      utils.contacts.list.invalidate();
      utils.contacts.getById.invalidate(id || "");
      setLocation("/contacts");
    },
    onError: (error: any) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast.error("First name and last name are required");
      return;
    }
    updateMutation.mutate({
      id: id || "",
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      mobile: formData.mobile || undefined,
      jobTitle: formData.jobTitle || undefined,
      department: formData.department || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      notes: formData.notes || undefined,
      isPrimary: formData.isPrimary,
      clientId: formData.clientId || undefined,
      salutation: formData.salutation || undefined,
      postalCode: formData.postalCode || undefined,
      linkedIn: formData.linkedIn || undefined,
    });
  };

  const update = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  if (isLoadingContact) {
    return (
      <ModuleLayout title="Edit Contact" icon={<UserCog className="h-5 w-5" />}>
        <div className="flex items-center justify-center py-12"><Spinner className="h-8 w-8" /></div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Contact"
      icon={<UserCog className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        { label: "Edit Contact" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/contacts")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="salutation">Salutation</Label>
              <Select value={formData.salutation} onValueChange={(v) => update("salutation", v)}>
                <SelectTrigger id="salutation">
                  <SelectValue placeholder="Select salutation" />
                </SelectTrigger>
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
              <Input id="postalCode" value={formData.postalCode} onChange={(e) => update("postalCode", e.target.value)} placeholder="00100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Additional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="linkedIn">LinkedIn URL</Label>
              <Input id="linkedIn" value={formData.linkedIn} onChange={(e) => update("linkedIn", e.target.value)} placeholder="https://linkedin.com/in/username" />
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
