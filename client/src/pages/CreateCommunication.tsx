import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Phone, MessageSquare, Plus, FileText, ChevronDown, Check, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { APP_TITLE } from "@/const";

// ─── Built-in Quick Templates by Category ────────────────────────────────────

interface QuickTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  type: "email" | "sms" | "both";
}

const TEMPLATE_GROUPS: Record<string, { label: string; templates: QuickTemplate[] }> = {
  general: {
    label: "General",
    templates: [
      { id: "thank-you", name: "Thank You", subject: "Thank You for Your Business", body: `Dear Client,\n\nThank you for your business. We appreciate your continued support.\n\nBest regards,\n${APP_TITLE}`, category: "general", type: "both" },
      { id: "update", name: "Client Update", subject: "Important Update", body: `Dear Client,\n\nWe hope you are doing well. Please find the latest updates below.\n\nBest regards,\n${APP_TITLE}`, category: "general", type: "both" },
      { id: "follow-up", name: "Follow Up", subject: "Following Up", body: `Dear Client,\n\nI wanted to follow up on our recent conversation. Please let me know if you have any questions.\n\nBest regards,\n${APP_TITLE}`, category: "general", type: "both" },
      { id: "welcome", name: "Welcome", subject: "Welcome to " + APP_TITLE, body: `Dear Client,\n\nWelcome to ${APP_TITLE}! We are excited to have you on board.\n\nPlease don't hesitate to reach out if you need anything.\n\nBest regards,\n${APP_TITLE}`, category: "general", type: "email" },
    ],
  },
  financial: {
    label: "Financial / Invoicing",
    templates: [
      { id: "invoice-reminder", name: "Invoice Reminder", subject: "Invoice Reminder - Payment Due", body: `Dear Client,\n\nThis is a friendly reminder that your invoice is due. Please arrange payment at your earliest convenience.\n\nIf you have already made the payment, please disregard this message.\n\nBest regards,\n${APP_TITLE}`, category: "financial", type: "both" },
      { id: "payment-received", name: "Payment Received", subject: "Payment Received - Thank You", body: `Dear Client,\n\nThank you for your payment. We have received and processed it successfully.\n\nBest regards,\n${APP_TITLE}`, category: "financial", type: "both" },
      { id: "overdue-notice", name: "Overdue Notice", subject: "Overdue Payment Notice", body: `Dear Client,\n\nWe would like to bring to your attention that your payment is now overdue. Please arrange payment as soon as possible to avoid any disruptions.\n\nBest regards,\n${APP_TITLE}`, category: "financial", type: "email" },
      { id: "receipt-sent", name: "Receipt Sent", subject: "Your Receipt", body: `Dear Client,\n\nPlease find your receipt attached. Thank you for your payment.\n\nBest regards,\n${APP_TITLE}`, category: "financial", type: "email" },
    ],
  },
  estimates: {
    label: "Estimates & Proposals",
    templates: [
      { id: "new-estimate", name: "New Estimate", subject: "Your Estimate is Ready", body: `Dear Client,\n\nWe have prepared an estimate for you. Please review the details and let us know if you'd like to proceed.\n\nBest regards,\n${APP_TITLE}`, category: "estimates", type: "email" },
      { id: "proposal-sent", name: "Proposal Sent", subject: "Proposal for Your Review", body: `Dear Client,\n\nPlease find our proposal attached for your review. We look forward to the opportunity to work with you.\n\nBest regards,\n${APP_TITLE}`, category: "estimates", type: "email" },
      { id: "quote-follow-up", name: "Quote Follow Up", subject: "Following Up on Your Quote", body: `Dear Client,\n\nI wanted to follow up on the quote we sent recently. Please let us know if you have any questions or would like to proceed.\n\nBest regards,\n${APP_TITLE}`, category: "estimates", type: "both" },
    ],
  },
  projects: {
    label: "Projects",
    templates: [
      { id: "project-kickoff", name: "Project Kickoff", subject: "Project Kickoff", body: `Dear Client,\n\nWe are excited to kick off your project. Below are the key details and next steps.\n\nBest regards,\n${APP_TITLE}`, category: "projects", type: "email" },
      { id: "project-update", name: "Project Status Update", subject: "Project Status Update", body: `Dear Client,\n\nHere is an update on the current status of your project.\n\nBest regards,\n${APP_TITLE}`, category: "projects", type: "both" },
      { id: "project-complete", name: "Project Completed", subject: "Project Completed Successfully", body: `Dear Client,\n\nWe are pleased to inform you that your project has been completed successfully. Please review the deliverables and let us know your feedback.\n\nBest regards,\n${APP_TITLE}`, category: "projects", type: "email" },
    ],
  },
  contracts: {
    label: "Contracts",
    templates: [
      { id: "contract-new", name: "New Contract", subject: "New Contract for Your Review", body: `Dear Client,\n\nA new contract has been prepared for you. Please review the terms and sign at your convenience.\n\nBest regards,\n${APP_TITLE}`, category: "contracts", type: "email" },
      { id: "contract-renewal", name: "Contract Renewal", subject: "Contract Renewal Notice", body: `Dear Client,\n\nYour contract is due for renewal. Please review and confirm if you'd like to continue.\n\nBest regards,\n${APP_TITLE}`, category: "contracts", type: "both" },
    ],
  },
  meetings: {
    label: "Meetings & Appointments",
    templates: [
      { id: "meeting-invite", name: "Meeting Invitation", subject: "Meeting Invitation", body: `Dear Client,\n\nYou are invited to a meeting. Please see the details below and confirm your attendance.\n\nBest regards,\n${APP_TITLE}`, category: "meetings", type: "email" },
      { id: "meeting-reminder", name: "Meeting Reminder", subject: "Meeting Reminder", body: `Dear Client,\n\nThis is a reminder about your upcoming meeting. Please ensure you are available.\n\nBest regards,\n${APP_TITLE}`, category: "meetings", type: "both" },
      { id: "meeting-follow-up", name: "Meeting Follow Up", subject: "Follow Up from Our Meeting", body: `Dear Client,\n\nThank you for your time during our meeting. Here is a summary of the key points discussed.\n\nBest regards,\n${APP_TITLE}`, category: "meetings", type: "email" },
    ],
  },
  sms: {
    label: "SMS Templates",
    templates: [
      { id: "sms-reminder", name: "Payment Reminder (SMS)", subject: "", body: `Hi, this is a reminder that your payment is due. Please arrange payment. - ${APP_TITLE}`, category: "sms", type: "sms" },
      { id: "sms-confirmation", name: "Appointment Confirmation (SMS)", subject: "", body: `Hi, your appointment has been confirmed. We look forward to seeing you. - ${APP_TITLE}`, category: "sms", type: "sms" },
      { id: "sms-thank-you", name: "Thank You (SMS)", subject: "", body: `Thank you for your business! We appreciate your support. - ${APP_TITLE}`, category: "sms", type: "sms" },
      { id: "sms-update", name: "Status Update (SMS)", subject: "", body: `Hi, your request has been updated. Log in for details. - ${APP_TITLE}`, category: "sms", type: "sms" },
    ],
  },
};

// ─── Template Selector Component ──────────────────────────────────────────────

function TemplateSelector({
  commType,
  onSelect,
}: {
  commType: "email" | "sms";
  onSelect: (template: QuickTemplate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter templates based on communication type
  const filteredGroups = useMemo(() => {
    const result: Record<string, { label: string; templates: QuickTemplate[] }> = {};
    for (const [key, group] of Object.entries(TEMPLATE_GROUPS)) {
      const filtered = group.templates.filter(
        (t) => t.type === "both" || t.type === commType
      );
      if (filtered.length > 0) {
        // Further filter by search
        const searched = search
          ? filtered.filter(
              (t) =>
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.category.toLowerCase().includes(search.toLowerCase())
            )
          : filtered;
        if (searched.length > 0) {
          result[key] = { label: group.label, templates: searched };
        }
      }
    }
    return result;
  }, [commType, search]);

  const totalTemplates = Object.values(filteredGroups).reduce(
    (acc, g) => acc + g.templates.length,
    0
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <FileText size={16} />
            <span>Select a template...</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {totalTemplates} templates
            </Badge>
            <ChevronDown size={14} className="opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search templates..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>No templates found.</CommandEmpty>
            {Object.entries(filteredGroups).map(([key, group], index) => (
              <React.Fragment key={key}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={group.label}>
                  {group.templates.map((template) => (
                    <CommandItem
                      key={template.id}
                      value={`${template.name} ${template.category}`}
                      onSelect={() => {
                        onSelect(template);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{template.name}</span>
                          {template.type === "sms" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              SMS
                            </Badge>
                          )}
                          {template.type === "email" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Email
                            </Badge>
                          )}
                        </div>
                        {template.subject && (
                          <span className="text-xs text-muted-foreground truncate max-w-[400px]">
                            {template.subject}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CreateCommunication() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "email" as "email" | "sms",
    recipient: "",
    recipients: "" as string, // comma-separated list
    subject: "",
    body: "",
    sendAt: new Date().toISOString().split("T")[0],
  });

  // tRPC mutations for email and SMS
  const sendEmailMutation = trpc.communications.sendEmail.useMutation();
  const sendSmsMutation = trpc.communications.sendSms.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get("to") || "";
    const subject = params.get("subject") || "";

    if (!to && !subject) return;

    setFormData((prev) => ({
      ...prev,
      recipient: to || prev.recipient,
      subject: subject || prev.subject,
      type: to && to.includes("@") ? "email" : prev.type,
    }));
  }, []);

  // Get clients for autocomplete
  const { data: clients = [] } = trpc.clients?.list?.useQuery?.({
    limit: 1000,
    offset: 0,
  }) || { data: [] };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (formData.type === "email" && !formData.subject.trim()) {
      toast.error("Subject is required for emails");
      return false;
    }
    if (!formData.body.trim()) {
      toast.error("Message body is required");
      return false;
    }
    if (!formData.recipient.trim() && !formData.recipients.trim()) {
      toast.error("At least one recipient is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Parse recipients
      const recipientsList = formData.recipients
        .split(",")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      if (formData.recipient) {
        recipientsList.push(formData.recipient.trim());
      }

      // Send communications via tRPC
      for (const recipient of recipientsList) {
        if (formData.type === "email") {
          await sendEmailMutation.mutateAsync({
            to: recipient,
            subject: formData.subject || "Email Communication",
            body: formData.body,
          });
        } else {
          await sendSmsMutation.mutateAsync({
            phoneNumber: recipient,
            message: formData.body,
            recipientId: recipient,
          });
        }
      }

      toast.success(`Communication${recipientsList.length > 1 ? "s" : ""} queued successfully`);
      navigate("/communications");
    } catch (error) {
      console.error("Failed to create communication:", error);
      toast.error("Failed to create communication");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail size={16} />;
      case "sms":
        return <Phone size={16} />;
      default:
        return <MessageSquare size={16} />;
    }
  };

  const filteredClients = clients.filter((client: any) =>
    client.name?.toLowerCase().includes(formData.recipient.toLowerCase()) ||
    client.email?.toLowerCase().includes(formData.recipient.toLowerCase())
  );

  return (
    <ModuleLayout
      title="Create Communication"
      description="Send emails, SMS, or other communications to your clients"
      icon={<Plus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Communications", href: "/communications" },
        { label: "Create" },
      ]}
      backLink={{ label: "Communications", href: "/communications" }}
    >
      <div className="space-y-6 p-6">

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle>Communication Details</CardTitle>
            <CardDescription>
              Fill in the details below to send a new communication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Communication Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Communication Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      handleInputChange("type", value as "email" | "sms")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail size={14} /> Email
                        </div>
                      </SelectItem>
                      <SelectItem value="sms">
                        <div className="flex items-center gap-2">
                          <Phone size={14} /> SMS
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Send At</Label>
                  <Input
                    type="date"
                    value={formData.sendAt}
                    onChange={(e) => handleInputChange("sendAt", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Schedule Later?</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="schedule"
                      defaultChecked={false}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="schedule" className="cursor-pointer text-sm">
                      Schedule for later
                    </Label>
                  </div>
                </div>
              </div>

              {/* Recipients Section */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Recipients *</h3>

                {/* Single Recipient with Autocomplete */}
                <div className="space-y-2">
                  <Label>Recipient Email or Phone</Label>
                  <div className="relative">
                    <Input
                      placeholder={
                        formData.type === "email"
                          ? "Enter email address..."
                          : "Enter phone number..."
                      }
                      value={formData.recipient}
                      onChange={(e) => handleInputChange("recipient", e.target.value)}
                      autoComplete="off"
                    />
                    {formData.recipient && filteredClients.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-white border rounded-md shadow-lg z-10">
                        {filteredClients.slice(0, 5).map((client: any) => (
                          <div
                            key={client.id}
                            className="px-4 py-2 hover:bg-accent cursor-pointer"
                            onClick={() => {
                              const email =
                                formData.type === "email"
                                  ? client.email
                                  : client.phone || "";
                              handleInputChange("recipient", email);
                            }}
                          >
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formData.type === "email"
                                ? client.email
                                : client.phone}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Multiple Recipients */}
                <div className="space-y-2">
                  <Label>Additional Recipients (comma-separated)</Label>
                  <Textarea
                    placeholder={
                      formData.type === "email"
                        ? "email1@example.com, email2@example.com, ..."
                        : "+254712345678, +254987654321, ..."
                    }
                    value={formData.recipients}
                    onChange={(e) => handleInputChange("recipients", e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter multiple recipients separated by commas
                  </p>
                </div>
              </div>

              {/* Message Content */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Message Content</h3>

                {formData.type === "email" && (
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Input
                      placeholder="Enter email subject..."
                      value={formData.subject}
                      onChange={(e) => handleInputChange("subject", e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>
                    {formData.type === "email" ? "Email Body" : "Message"} *
                  </Label>
                  {formData.type === "email" ? (
                    <RichTextEditor
                      value={formData.body}
                      onChange={(html) => handleInputChange("body", html)}
                      placeholder="Enter your email message here..."
                      minHeight="200px"
                    />
                  ) : (
                    <Textarea
                      placeholder="Enter your SMS message here (160 characters)..."
                      value={formData.body}
                      onChange={(e) => handleInputChange("body", e.target.value)}
                      rows={8}
                      maxLength={160}
                    />
                  )}
                  {formData.type === "sms" && (
                    <p className="text-xs text-muted-foreground">
                      {formData.body.length}/160 characters
                    </p>
                  )}
                </div>
              </div>

              {/* Template Selection */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Quick Templates</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a template to auto-fill the message. Templates are filtered by communication type.
                </p>
                <TemplateSelector
                  commType={formData.type}
                  onSelect={(template) => {
                    handleInputChange("body", template.body);
                    if (formData.type === "email" && template.subject) {
                      handleInputChange("subject", template.subject);
                    }
                    toast.success(`Template "${template.name}" applied`);
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 justify-end border-t pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/communications")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {getTypeIcon(formData.type)}
                  {loading ? "Sending..." : "Send Communication"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
