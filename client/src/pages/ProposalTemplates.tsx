import React, { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileText, Plus, Edit2, Trash2, Search, Eye, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

interface ProposalTemplate {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: "pt-1",
    title: "Standard Proposal",
    content: "<h2>Project Proposal</h2><p>We are pleased to submit our proposal for your consideration.</p><h3>Scope of Work</h3><p>Describe the project scope here...</p><h3>Timeline</h3><p>Project delivery timeline...</p><h3>Investment</h3><p>Pricing details...</p><h3>Terms & Conditions</h3><p>Standard terms apply.</p>",
    createdBy: "Admin",
    createdAt: "2025-01-15",
  },
  {
    id: "pt-2",
    title: "IT Services Proposal",
    content: "<h2>IT Services Proposal</h2><p>Thank you for the opportunity to present our IT solution.</p><h3>Technical Approach</h3><p>Our approach includes...</p><h3>Deliverables</h3><ul><li>Deliverable 1</li><li>Deliverable 2</li></ul><h3>Pricing</h3><p>See pricing table below.</p>",
    createdBy: "Admin",
    createdAt: "2025-02-01",
  },
  {
    id: "pt-3",
    title: "Maintenance Contract Proposal",
    content: "<h2>Maintenance Proposal</h2><p>We propose the following maintenance plan for your systems.</p><h3>Coverage</h3><p>24/7 support with SLA guarantees...</p><h3>Monthly Fee</h3><p>As per agreement.</p>",
    createdBy: "John K.",
    createdAt: "2025-03-10",
  },
];

const PROPOSAL_VARIABLES = [
  { label: "Client Name", value: "{{client_name}}" },
  { label: "Project Name", value: "{{project_name}}" },
  { label: "Proposal Number", value: "{{proposal_number}}" },
  { label: "Proposal Date", value: "{{proposal_date}}" },
  { label: "Valid Until", value: "{{valid_until}}" },
  { label: "Total Amount", value: "{{total_amount}}" },
  { label: "Company Name", value: "{{company_name}}" },
  { label: "Prepared By", value: "{{prepared_by}}" },
];

export default function ProposalTemplates() {
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.proposalTemplates.list.useQuery();
  const createMutation = trpc.proposalTemplates.create.useMutation({
    onSuccess: () => { utils.proposalTemplates.list.invalidate(); toast.success("Template created"); setView("list"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.proposalTemplates.update.useMutation({
    onSuccess: () => { utils.proposalTemplates.list.invalidate(); toast.success("Template updated"); setView("list"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.proposalTemplates.delete.useMutation({
    onSuccess: () => { utils.proposalTemplates.list.invalidate(); toast.success("Template deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const duplicateMutation = trpc.proposalTemplates.duplicate.useMutation({
    onSuccess: () => { utils.proposalTemplates.list.invalidate(); toast.success("Template duplicated"); },
    onError: (e) => toast.error(e.message),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ProposalTemplate | null>(null);
  const [form, setForm] = useState<ProposalTemplate>({
    id: "", title: "", content: "", createdBy: "Admin", createdAt: "",
  });

  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditor = (template?: ProposalTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setForm(template);
    } else {
      setEditingTemplate(null);
      setForm({ id: `pt-${Date.now()}`, title: "", content: "", createdBy: "Admin", createdAt: "" });
    }
    setView("editor");
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("Please enter a template title");
      return;
    }
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, title: form.title, content: form.content });
    } else {
      createMutation.mutate({ title: form.title, content: form.content });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = (template: ProposalTemplate) => {
    duplicateMutation.mutate(template.id);
  };

  // Editor view
  if (view === "editor") {
    return (
      <ModuleLayout
        title={editingTemplate ? "Edit Proposal Template" : "New Proposal Template"}
        description="Design a reusable proposal template"
        icon={<FileText className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm/super-admin" },
          { label: "Proposals", href: "/proposals" },
          { label: "Templates", href: "/proposals/templates" },
          { label: editingTemplate ? "Edit" : "New Template" },
        ]}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Templates
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Template Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Standard Proposal" />
              </div>
              <div className="space-y-2">
                <Label>Template Content</Label>
                <RichTextEditor
                  value={form.content}
                  onChange={val => setForm(p => ({ ...p, content: val }))}
                  placeholder="Design your proposal template..."
                  minHeight="500px"
                  enhanced
                  variables={PROPOSAL_VARIABLES}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  // List view (crm.africa style)
  return (
    <ModuleLayout
      title="Proposal Templates"
      description="Manage reusable proposal templates"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm/super-admin" },
        { label: "Proposals", href: "/proposals" },
        { label: "Templates" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => openEditor()}>
            <Plus className="h-4 w-4 mr-2" />New Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>{filtered.length} template{filtered.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Title</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No templates found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(template => (
                    <TableRow key={template.id} className="group">
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{template.createdAt ? new Date(template.createdAt).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">{template.createdBy.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{template.createdBy}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(template)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditor(template)} title="Edit">
                            <Edit2 className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicate(template)} title="Duplicate">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.title}</DialogTitle>
            <DialogDescription>Template preview</DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="border rounded-md p-4">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewTemplate.content }} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
            <Button onClick={() => { openEditor(previewTemplate!); setPreviewTemplate(null); }}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
