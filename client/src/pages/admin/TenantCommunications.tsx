import React, { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Edit2, Trash2, Send, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";

interface TenantCommunication {
  id: string;
  subject: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  recipientType: string;
  recipientFilter?: any;
  sentAt?: string;
  scheduledAt?: string;
  createdBy?: string;
  createdAt?: string;
}

const COMM_TYPES = [
  { value: "announcement", label: "Announcement" },
  { value: "alert", label: "Alert" },
  { value: "notice", label: "Notice" },
  { value: "update", label: "Update" },
  { value: "maintenance", label: "Maintenance" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const RECIPIENT_TYPES = [
  { value: "all_tenants", label: "All Tenants" },
  { value: "specific_tenant", label: "Specific Tenant" },
  { value: "tier_based", label: "Tier Based" },
];

const TYPE_COLORS: Record<string, string> = {
  announcement: "bg-blue-50 text-blue-700",
  alert: "bg-red-50 text-red-700",
  notice: "bg-amber-50 text-amber-700",
  update: "bg-green-50 text-green-700",
  maintenance: "bg-purple-50 text-purple-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-50 text-gray-600",
  normal: "bg-blue-50 text-blue-600",
  high: "bg-orange-50 text-orange-600",
  urgent: "bg-red-50 text-red-600",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  scheduled: "outline",
};

export default function TenantCommunications() {
  const utils = trpc.useUtils();
  const { data: communications = [], isLoading } = trpc.tenantCommunications.list.useQuery();
  const createMutation = trpc.tenantCommunications.create.useMutation({
    onSuccess: () => { utils.tenantCommunications.list.invalidate(); toast.success("Communication created"); setIsOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.tenantCommunications.update.useMutation({
    onSuccess: () => { utils.tenantCommunications.list.invalidate(); toast.success("Communication updated"); setIsOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.tenantCommunications.delete.useMutation({
    onSuccess: () => { utils.tenantCommunications.list.invalidate(); toast.success("Communication deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const sendMutation = trpc.tenantCommunications.send.useMutation({
    onSuccess: () => { utils.tenantCommunications.list.invalidate(); toast.success("Communication sent"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewComm, setPreviewComm] = useState<TenantCommunication | null>(null);
  const [editing, setEditing] = useState<TenantCommunication | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [form, setForm] = useState({
    subject: "",
    message: "",
    type: "announcement",
    priority: "normal",
    status: "draft",
    recipientType: "all_tenants",
  });

  const filtered = communications.filter((c: TenantCommunication) => {
    const matchSearch = c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const handleOpenCreate = () => {
    setEditing(null);
    setForm({ subject: "", message: "", type: "announcement", priority: "normal", status: "draft", recipientType: "all_tenants" });
    setIsOpen(true);
  };

  const handleOpenEdit = (comm: TenantCommunication) => {
    setEditing(comm);
    setForm({
      subject: comm.subject,
      message: comm.message,
      type: comm.type,
      priority: comm.priority,
      status: comm.status,
      recipientType: comm.recipientType,
    });
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this communication?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSend = (id: string) => {
    if (confirm("Send this communication to all recipients?")) {
      sendMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <ModuleLayout
      title="Tenant Communications"
      description="Send announcements, alerts, and notices to tenants"
      icon={<Megaphone className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm/super-admin" },
        { label: "Administration", href: "/admin/management" },
        { label: "Tenant Communications" },
      ]}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{communications.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Sent</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{communications.filter((c: TenantCommunication) => c.status === "sent").length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Drafts</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-amber-600">{communications.filter((c: TenantCommunication) => c.status === "draft").length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Scheduled</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-blue-600">{communications.filter((c: TenantCommunication) => c.status === "scheduled").length}</p></CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search communications..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {COMM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />New Communication
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Communications</CardTitle>
            <CardDescription>{filtered.length} communication{filtered.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No communications found</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((comm: TenantCommunication) => (
                      <TableRow key={comm.id}>
                        <TableCell>
                          <div className="font-medium">{comm.subject}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{comm.message.replace(/<[^>]+>/g, "").slice(0, 80)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={TYPE_COLORS[comm.type] || ""}>{comm.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={PRIORITY_COLORS[comm.priority] || ""}>{comm.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{comm.recipientType.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_COLORS[comm.status] || "secondary"}>{comm.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {comm.sentAt ? format(new Date(comm.sentAt), "MMM dd, HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setPreviewComm(comm); setPreviewOpen(true); }} title="Preview">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {comm.status === "draft" && (
                              <Button variant="ghost" size="sm" onClick={() => handleSend(comm.id)} title="Send">
                                <Send className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(comm)} title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(comm.id)} className="text-destructive" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Communication" : "New Communication"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the communication details" : "Create a new communication to send to tenants"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Communication subject" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={val => setForm(p => ({ ...p, type: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={val => setForm(p => ({ ...p, priority: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select value={form.recipientType} onValueChange={val => setForm(p => ({ ...p, recipientType: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message *</Label>
              <RichTextEditor
                value={form.message}
                onChange={val => setForm(p => ({ ...p, message: val }))}
                placeholder="Write your communication message..."
                minHeight="250px"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => { setForm(p => ({ ...p, status: "draft" })); handleSave(); }}>
              Save as Draft
            </Button>
            <Button onClick={() => { setForm(p => ({ ...p, status: "sent" })); handleSave(); }}>
              <Send className="h-4 w-4 mr-2" />Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Communication Preview</DialogTitle>
          </DialogHeader>
          {previewComm && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={TYPE_COLORS[previewComm.type]}>{previewComm.type}</Badge>
                <Badge variant="secondary" className={PRIORITY_COLORS[previewComm.priority]}>{previewComm.priority}</Badge>
                <Badge variant={STATUS_COLORS[previewComm.status]}>{previewComm.status}</Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Subject</div>
                <div className="font-medium text-lg">{previewComm.subject}</div>
              </div>
              <div className="border rounded-md p-4">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewComm.message }} />
              </div>
              <div className="text-xs text-muted-foreground">
                Recipients: {previewComm.recipientType.replace(/_/g, " ")}
                {previewComm.sentAt && ` | Sent: ${format(new Date(previewComm.sentAt), "PPpp")}`}
                {previewComm.createdAt && ` | Created: ${format(new Date(previewComm.createdAt), "PPpp")}`}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
