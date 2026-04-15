/**
 * Email & SMS Service Component
 * Unified interface for sending emails and SMS with templating support
 * Includes delivery tracking and history
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { getGradientCard, animations, getBadgeColor } from "@/lib/designSystem";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
}

interface Message {
  id: string;
  type: "email" | "sms";
  recipient: string;
  subject?: string;
  message: string;
  status: "pending" | "sent" | "failed" | "delivered";
  sentAt: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: "tmpl-1",
    name: "Invoice Notification",
    subject: "Your Invoice #{invoiceNumber} is Ready",
    html: "<p>Dear {clientName},</p><p>Your invoice #{invoiceNumber} totaling {amount} is ready.</p>",
    variables: ["invoiceNumber", "clientName", "amount"],
  },
  {
    id: "tmpl-2",
    name: "Payment Reminder",
    subject: "Payment Due: {invoiceNumber}",
    html: "<p>Dear {clientName},</p><p>Payment of {amount} for invoice {invoiceNumber} is due on {dueDate}.</p>",
    variables: ["invoiceNumber", "clientName", "amount", "dueDate"],
  },
  {
    id: "tmpl-3",
    name: "Receipt Confirmation",
    subject: "Receipt #{receiptNumber} - {amount}",
    html: "<p>Thank you for your payment of {amount}.</p><p>Receipt #{receiptNumber} has been issued.</p>",
    variables: ["receiptNumber", "amount"],
  },
];

const smsTemplates: SMSTemplate[] = [
  {
    id: "sms-1",
    name: "Payment Reminder",
    message: "Hi {name}, reminder: Invoice {inv} amount {amount} is due on {date}. Pay now.",
    variables: ["name", "inv", "amount", "date"],
  },
  {
    id: "sms-2",
    name: "Invoice Notification",
    message: "Hi {name}, your invoice {inv} for {amount} is ready. View it here.",
    variables: ["name", "inv", "amount"],
  },
  {
    id: "sms-3",
    name: "Payment Confirmation",
    message: "Thank you {name}! We received your payment of {amount}. Ref: {ref}",
    variables: ["name", "amount", "ref"],
  },
];

interface MessageServiceProps {
  type?: "email" | "sms" | "both";
  onSuccess?: (messageId: string) => void;
  onError?: (error: string) => void;
}

export function MessageService({
  type = "both",
  onSuccess,
  onError,
}: MessageServiceProps) {
  const [messageType, setMessageType] = useState<"email" | "sms">(
    type === "both" ? "email" : type
  );
  const [templateId, setTemplateId] = useState("__none__");
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "history">("send");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      type: "email",
      recipient: "client@example.com",
      subject: "Your Invoice #INV-001 is Ready",
      message: "Invoice notification sent",
      status: "delivered",
      sentAt: new Date(Date.now() - 3600000),
      deliveredAt: new Date(Date.now() - 3595000),
    },
    {
      id: "msg-2",
      type: "sms",
      recipient: "+254712345678",
      message: "Payment reminder",
      status: "sent",
      sentAt: new Date(Date.now() - 7200000),
    },
    {
      id: "msg-3",
      type: "email",
      recipient: "another@example.com",
      subject: "Payment Reminder",
      message: "Invoice reminder sent",
      status: "failed",
      sentAt: new Date(Date.now() - 86400000),
      errorMessage: "Invalid email address",
    },
  ]);

  // Get templates for current message type
  const templates =
    messageType === "email" ? emailTemplates : smsTemplates;
  const selectedTemplate = templates.find((t) => t.id === templateId);

  // Send email mutation
  const sendEmailMutation = trpc.email.queueEmail.useMutation({
    onSuccess: (data: any) => {
      toast.success("Email sent successfully");
      const newMessage: Message = {
        id: data.id,
        type: "email",
        recipient: recipients,
        subject,
        message,
        status: "sent",
        sentAt: new Date(),
      };
      setMessages([newMessage, ...messages]);
      onSuccess?.(data.id);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send email");
      onError?.(error.message || "Failed to send email");
    },
  });

  // Send SMS mutation
  const sendSMSMutation = trpc.sms.sendSMS.useMutation({
    onSuccess: (data: any) => {
      toast.success("SMS sent successfully");
      const newMessage: Message = {
        id: data.id,
        type: "sms",
        recipient: recipients,
        message,
        status: "sent",
        sentAt: new Date(),
      };
      setMessages([newMessage, ...messages]);
      onSuccess?.(data.id);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send SMS");
      onError?.(error.message || "Failed to send SMS");
    },
  });

  const resetForm = () => {
    setTemplateId("__none__");
    setRecipients("");
    setSubject("");
    setMessage("");
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (template) {
      if (messageType === "email") {
        setSubject((template as EmailTemplate).subject);
        setMessage((template as EmailTemplate).html);
      } else {
        setMessage((template as SMSTemplate).message);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipients.trim()) {
      toast.error("Please enter at least one recipient");
      return;
    }

    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setLoading(true);

    try {
      if (messageType === "email") {
        if (!subject.trim()) {
          toast.error("Email subject is required");
          setLoading(false);
          return;
        }
        sendEmailMutation.mutate({
          to: recipients,
          subject,
          html: message,
          template: templateId && templateId !== "__none__" ? templateId : undefined,
        });
      } else {
        sendSMSMutation.mutate({
          phoneNumber: recipients,
          message,
          template: templateId && templateId !== "__none__" ? templateId : undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };

  const statusIcons: Record<string, any> = {
    pending: AlertCircle,
    sent: Send,
    delivered: CheckCircle2,
    failed: AlertCircle,
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("send")}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === "send"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="w-4 h-4 inline mr-2" />
          Send Message
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2 px-4 font-medium transition-colors ${
            activeTab === "history"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Archive className="w-4 h-4 inline mr-2" />
          History
        </button>
      </div>

      {/* Send Message Tab */}
      {activeTab === "send" && (
        <Card className={getGradientCard("blue")}>
          <CardHeader>
            <CardTitle className={animations.fadeIn}>Send Message</CardTitle>
            <CardDescription>
              Send {messageType === "email" ? "emails" : "SMS"} to your contacts
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSendMessage} className="space-y-4">
              {/* Message Type Selection */}
              {type === "both" && (
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      messageType === "email"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <input
                      type="radio"
                      value="email"
                      checked={messageType === "email"}
                      onChange={(e) => setMessageType(e.target.value as "email" | "sms")}
                      className="mr-2"
                    />
                    <Mail className="h-5 w-5 inline mr-2" />
                    <span className="font-medium">Email</span>
                  </label>

                  <label
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      messageType === "sms"
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <input
                      type="radio"
                      value="sms"
                      checked={messageType === "sms"}
                      onChange={(e) => setMessageType(e.target.value as "email" | "sms")}
                      className="mr-2"
                    />
                    <MessageSquare className="h-5 w-5 inline mr-2" />
                    <span className="font-medium">SMS</span>
                  </label>
                </div>
              )}

              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template">Template (Optional)</Label>
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Template</SelectItem>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recipients */}
              <div className="space-y-2">
                <Label htmlFor="recipients">
                  {messageType === "email" ? "Email Address(es)" : "Phone Number(s)"} *
                </Label>
                <Textarea
                  id="recipients"
                  placeholder={
                    messageType === "email"
                      ? "client@example.com, another@example.com"
                      : "+254712345678, +254723456789"
                  }
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  disabled={loading}
                  className="h-20"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple recipients with commas
                </p>
              </div>

              {/* Email Subject */}
              {messageType === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Email subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              {/* Message Body */}
              <div className="space-y-2">
                <Label htmlFor="message">
                  {messageType === "email" ? "Email Body" : "Message"} *
                </Label>
                <Textarea
                  id="message"
                  placeholder={
                    messageType === "email"
                      ? "Email HTML content"
                      : "SMS message (160 characters)"
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  className="h-32"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {messageType === "sms" && `${message.length}/160 characters`}
                  </span>
                  {selectedTemplate && (
                    <span className="text-blue-600">
                      Template variables: {selectedTemplate.variables.join(", ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Send Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send {messageType === "email" ? "Email" : "SMS"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <Card className={getGradientCard("slate")}>
          <CardHeader>
            <CardTitle className={animations.fadeIn}>Message History</CardTitle>
            <CardDescription>
              Recent messages sent ({messages.length} total)
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject/Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((msg) => {
                    const StatusIcon = statusIcons[msg.status];
                    return (
                      <TableRow key={msg.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {msg.type === "email" ? (
                              <>
                                <Mail className="w-3 h-3 mr-1" />
                                Email
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3 h-3 mr-1" />
                                SMS
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {msg.recipient}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {msg.subject || msg.message}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[msg.status]}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {msg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(msg.sentAt, "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MessageService;
