import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
import { TicketCheck } from "lucide-react";

export default function EditTicket() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium" as "low" | "medium" | "high",
    status: "new",
    assignedTo: "",
    requestedDueDate: "",
  });

  const { data: ticket, isLoading: isLoadingTicket } = trpc.tickets.getById.useQuery(id || "", { enabled: !!id });
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title || "",
        description: ticket.description || "",
        category: ticket.category || "",
        priority: (ticket.priority as any) || "medium",
        status: ticket.status || "new",
        assignedTo: ticket.assignedTo || "",
        requestedDueDate: ticket.requestedDueDate ? new Date(ticket.requestedDueDate).toISOString().split("T")[0] : "",
      });
    }
  }, [ticket]);

  const updateMutation = trpc.tickets.update.useMutation({
    onSuccess: () => {
      toast.success("Ticket updated successfully!");
      utils.tickets.list.invalidate();
      utils.tickets.getById.invalidate(id || "");
      setLocation("/tickets");
    },
    onError: (error: any) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }
    updateMutation.mutate({
      id: id || "",
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category || undefined,
      priority: formData.priority,
      status: formData.status || undefined,
      assignedTo: formData.assignedTo || undefined,
      requestedDueDate: formData.requestedDueDate || undefined,
    });
  };

  const update = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  if (isLoadingTicket) {
    return (
      <ModuleLayout title="Edit Ticket" icon={<TicketCheck className="h-5 w-5" />}>
        <div className="flex items-center justify-center py-12"><Spinner className="h-8 w-8" /></div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Ticket"
      icon={<TicketCheck className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Tickets", href: "/tickets" },
        { label: "Edit Ticket" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/tickets")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Save Changes
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
              <Input id="title" value={formData.title} onChange={(e) => update("title", e.target.value)} required />
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
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="requestedDueDate">Requested Due Date</Label>
              <Input id="requestedDueDate" type="date" value={formData.requestedDueDate} onChange={(e) => update("requestedDueDate", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor value={formData.description} onChange={(html) => update("description", html)} minHeight="150px" />
            </div>
          </CardContent>
        </Card>
      </form>
    </ModuleLayout>
  );
}
