import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { Send, Mail, Eye } from "lucide-react";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  htmlBody?: string;
  variables?: string[]; // e.g., ["{{clientName}}", "{{amount}}"]
}

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: EmailData) => Promise<void> | void;
  recipientEmail?: string;
  defaultSubject?: string;
  defaultBody?: string;
  templates?: EmailTemplate[];
  previewMode?: boolean;
}

export interface EmailData {
  to: string[];
  subject: string;
  body: string;
  htmlBody: string;
  cc?: string[];
  bcc?: string[];
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  open,
  onOpenChange,
  onSend,
  recipientEmail,
  defaultSubject = "",
  defaultBody = "",
  templates = [],
  previewMode = false,
}) => {
  const [emailData, setEmailData] = useState<EmailData>({
    to: recipientEmail ? [recipientEmail] : [],
    subject: defaultSubject,
    body: defaultBody,
    htmlBody: defaultBody,
    cc: [],
    bcc: [],
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setEmailData((prev) => ({
        ...prev,
        subject: template.subject,
        body: template.body,
        htmlBody: template.htmlBody || template.body,
      }));
      setSelectedTemplate(templateId);
    }
  };

  const handleAddRecipient = (email: string) => {
    if (email && !emailData.to.includes(email)) {
      setEmailData((prev) => ({
        ...prev,
        to: [...prev.to, email],
      }));
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setEmailData((prev) => ({
      ...prev,
      to: prev.to.filter((e) => e !== email),
    }));
  };

  const handleSend = async () => {
    if (!emailData.to.length) {
      toast.error("Please add at least one recipient");
      return;
    }
    if (!emailData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!emailData.body.trim()) {
      toast.error("Email body is required");
      return;
    }

    setIsSending(true);
    try {
      await onSend(emailData);
      toast.success("Email sent successfully");
      onOpenChange(false);
      setEmailData({
        to: recipientEmail ? [recipientEmail] : [],
        subject: defaultSubject,
        body: defaultBody,
        htmlBody: defaultBody,
        cc: [],
        bcc: [],
      });
    } catch (error) {
      toast.error(`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            HTML Email Composer
          </DialogTitle>
          <DialogDescription>Compose and send professional HTML emails with templates</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            {/* Templates */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Email Templates</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Load a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Recipients */}
            <div className="space-y-2">
              <Label>Recipients</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Add email address"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddRecipient((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement);
                    if (input?.value) {
                      handleAddRecipient(input.value);
                      input.value = "";
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {emailData.to.map((email) => (
                  <div
                    key={email}
                    className="bg-primary/10 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {email}
                    <button
                      onClick={() => handleRemoveRecipient(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) =>
                  setEmailData((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder="Enter email subject"
              />
            </div>

            {/* HTML Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Email Body (HTML)</Label>
              <RichTextEditor
                value={emailData.htmlBody}
                onChange={(value) =>
                  setEmailData((prev) => ({
                    ...prev,
                    body: value,
                    htmlBody: value,
                  }))
                }
                placeholder="Enter email content (supports HTML)"
                minHeight="250px"
              />
            </div>

            {/* CC/BCC */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cc">CC</Label>
                <Input
                  id="cc"
                  placeholder="cc@example.com (comma-separated)"
                  onChange={(e) =>
                    setEmailData((prev) => ({
                      ...prev,
                      cc: e.target.value
                        .split(",")
                        .map((email) => email.trim())
                        .filter((email) => email),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bcc">BCC</Label>
                <Input
                  id="bcc"
                  placeholder="bcc@example.com (comma-separated)"
                  onChange={(e) =>
                    setEmailData((prev) => ({
                      ...prev,
                      bcc: e.target.value
                        .split(",")
                        .map((email) => email.trim())
                        .filter((email) => email),
                    }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">TO</Label>
                    <p className="font-medium">{emailData.to.join(", ")}</p>
                  </div>
                  {emailData.cc?.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">CC</Label>
                      <p className="font-medium">{emailData.cc.join(", ")}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">SUBJECT</Label>
                    <p className="font-medium text-lg">{emailData.subject}</p>
                  </div>
                  <div className="border rounded p-4 bg-white text-black min-h-[300px]">
                    <div dangerouslySetInnerHTML={{ __html: emailData.htmlBody }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
