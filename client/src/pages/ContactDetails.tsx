import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  User,
} from "lucide-react";

export default function ContactDetails() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: contact, isLoading } = trpc.contacts.getById.useQuery(params.id!, {
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Contact not found</p>
        <Button variant="outline" onClick={() => setLocation("/contacts")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contacts
        </Button>
      </div>
    );
  }

  const fullName = [contact.salutation, contact.firstName, contact.lastName].filter(Boolean).join(" ");

  return (
    <ModuleLayout
      title={fullName}
      description="Contact Details"
      icon={<User className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Contacts", href: "/contacts" },
        { label: fullName },
      ]}
      actions={
        <Button variant="outline" onClick={() => setLocation("/contacts")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="max-w-4xl space-y-6">
        {/* Primary Badge + Created date */}
        <div className="flex items-center justify-between">
          {contact.isPrimary ? (
            <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">Primary Contact</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800 text-sm px-3 py-1">Contact</Badge>
          )}
          {contact.createdAt && (
            <span className="text-sm text-muted-foreground">
              Added {new Date(contact.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Job Title</p>
                <p className="font-medium">{contact.jobTitle || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Department
                </p>
                <p className="font-medium">{contact.department || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communication */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              Communication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </p>
                <p className="font-medium">
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                      {contact.email}
                    </a>
                  ) : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{contact.phone || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mobile</p>
                <p className="font-medium">{contact.mobile || "—"}</p>
              </div>
              {contact.linkedIn && (
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                    {contact.linkedIn}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        {(contact.address || contact.city || contact.country) && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contact.address && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{contact.address}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{contact.city || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{contact.country || "—"}</p>
                </div>
                {contact.postalCode && (
                  <div>
                    <p className="text-sm text-muted-foreground">Postal Code</p>
                    <p className="font-medium">{contact.postalCode}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {contact.notes && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-purple-600" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
