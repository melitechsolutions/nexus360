import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TicketPlus } from "lucide-react";

export default function CreateTicket() {
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    category: "",
    priority: "medium" as "low" | "medium" | "high",
    requestedDueDate: "",
  });

  const { data: clients = [] } = trpc.clients.list.useQuery();

  const createMutation = trpc.tickets.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Ticket created successfully!");
      setLocation("/tickets");
    },
    onError: (error: any) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.title) {
      toast.error("Client and title are required");
      return;
    }
    createMutation.mutate({
      ...formData,
      description: formData.description || undefined,
      category: formData.category || undefined,
      requestedDueDate: formData.requestedDueDate || undefined,
    });
  };

  const update = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <ModuleLayout
      title="Create Ticket"
      icon={<TicketPlus className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Tickets", href: "/tickets" },
        { label: "Create Ticket" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/tickets")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Create Ticket
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Ticket Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={formData.title} onChange={(e) => update("title", e.target.value)} required placeholder="Brief description of the issue" />
            </div>
            <div>
              <Label htmlFor="clientId">Client *</Label>
              <select
                id="clientId"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={formData.clientId}
                onChange={(e) => update("clientId", e.target.value)}
                required
              >
                <option value="">Select client...</option>
                {(clients as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.lastName}`}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="feature-request">Feature Request</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(v: any) => update("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="requestedDueDate">Requested Due Date</Label>
              <Input id="requestedDueDate" type="date" value={formData.requestedDueDate} onChange={(e) => update("requestedDueDate", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor value={formData.description} onChange={(html) => update("description", html)} minHeight="150px" placeholder="Detailed description of the issue..." />
            </div>
          </CardContent>
        </Card>
      </form>
    </ModuleLayout>
  );
}
