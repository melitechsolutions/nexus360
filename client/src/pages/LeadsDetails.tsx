import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  User,
  Tag,
  Edit,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PRIORITY_STYLES: Record<string, { badge: string; text: string }> = {
  low: { badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", text: "Low" },
  medium: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", text: "Medium" },
  high: { badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", text: "High" },
  urgent: { badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", text: "Urgent" },
};

const STAGE_STYLES: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  qualified: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  proposal: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  negotiation: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  closed_won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  closed_lost: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const STAGE_LABELS: Record<string, string> = {
  lead: "New Lead",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  negotiation: "Negotiation",
  closed_won: "Converted",
  closed_lost: "Lost",
};

export default function LeadsDetails() {
  const [match, params] = useRoute("/leads/:id");
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const leadId = params?.id;

  // Fetch lead details
  const { data: lead, isLoading, refetch } = trpc.leads.getById.useQuery(
    { id: leadId as string },
    { enabled: !!leadId, refetchOnWindowFocus: false }
  );

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead updated successfully");
      setIsEditing(false);
      refetch();
    },
    onError: () => {
      toast.error("Failed to update lead");
    },
  });

  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => {
      toast.success("Lead deleted successfully");
      navigate("/leads");
    },
    onError: () => {
      toast.error("Failed to delete lead");
    },
  });

  const handleEdit = () => {
    if (lead) {
      setEditData({
        id: lead.id,
        title: lead.title || "",
        clientName: lead.clientName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        stage: lead.stage || "lead",
        priority: lead.priority || "medium",
        value: lead.value || 0,
        source: lead.source || "",
        notes: lead.notes || "",
        assignedTo: lead.assignedTo || "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editData) return;
    updateMutation.mutate(editData);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteMutation.mutate({ id: leadId as string });
    }
  };

  if (!match || !leadId) return null;

  if (isLoading) {
    return (
      <ModuleLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner className="size-8" />
        </div>
      </ModuleLayout>
    );
  }

  if (!lead) {
    return (
      <ModuleLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-muted-foreground">Lead not found</p>
          <Button onClick={() => navigate("/leads")}>Back to Leads</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title={lead.title || "Lead Details"}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/leads")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold truncate">{lead.title}</h1>
              <p className="text-muted-foreground">{lead.clientName}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Badge className={cn("text-sm", STAGE_STYLES[lead.stage || "lead"])}>
            {STAGE_LABELS[lead.stage || "lead"]}
          </Badge>
          {lead.priority && (
            <Badge className={cn("text-sm", PRIORITY_STYLES[lead.priority]?.badge)}>
              {PRIORITY_STYLES[lead.priority]?.text}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href={`mailto:${lead.email}`} className="font-medium hover:text-blue-600">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a href={`tel:${lead.phone}`} className="font-medium hover:text-blue-600">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
                {lead.source && (
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p className="font-medium">{lead.source}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {lead.notes && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Lead Value */}
            {lead.value && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Potential Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    ${Number(lead.value).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Assigned To */}
            {lead.assignedTo && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned To
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{lead.assignedTo}</p>
                </CardContent>
              </Card>
            )}

            {/* Created Date */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {new Date(lead.createdAt || new Date()).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="Lead title"
                />
              </div>
              <div>
                <Label>Client Name</Label>
                <Input
                  value={editData.clientName}
                  onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stage</Label>
                  <Select value={editData.stage} onValueChange={(val) => setEditData({ ...editData, stage: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">New Lead</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal Sent</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="closed_won">Converted</SelectItem>
                      <SelectItem value="closed_lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={editData.priority} onValueChange={(val) => setEditData({ ...editData, priority: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={editData.value}
                    onChange={(e) => setEditData({ ...editData, value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <Input
                    value={editData.source}
                    onChange={(e) => setEditData({ ...editData, source: e.target.value })}
                    placeholder="How did you find this lead?"
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
