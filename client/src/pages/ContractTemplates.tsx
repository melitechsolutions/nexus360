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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

interface ContractTemplate {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "ct-1",
    title: "Default Template",
    content: "<h2>Service Contract Agreement</h2><p>This Service Contract Agreement (\"Agreement\") is entered into as of <strong>{{contract_date}}</strong> by and between:</p><p><strong>{{company_name}}</strong> (\"Service Provider\")<br>and<br><strong>{{client_name}}</strong> (\"Client\")</p><h3>1. Scope of Services</h3><p>The Service Provider agrees to provide the following services:</p><p>{{scope_of_work}}</p><h3>2. Term</h3><p>This Agreement shall commence on {{start_date}} and continue until {{end_date}}, unless terminated earlier in accordance with this Agreement.</p><h3>3. Compensation</h3><p>The Client agrees to pay the Service Provider <strong>{{contract_value}}</strong> for the services described herein.</p><h3>4. Payment Terms</h3><p>Payment shall be made according to the following schedule: {{payment_terms}}</p><h3>5. Confidentiality</h3><p>Both parties agree to maintain confidentiality of proprietary information shared during the course of this Agreement.</p><h3>6. Termination</h3><p>Either party may terminate this Agreement with 30 days written notice.</p><p>{{email_signature}}</p>",
    createdBy: "System",
    createdAt: "2023-07-01",
  },
  {
    id: "ct-2",
    title: "Maintenance Agreement",
    content: "<h2>Maintenance Service Agreement</h2><p>This Maintenance Agreement is made between <strong>{{company_name}}</strong> and <strong>{{client_name}}</strong>.</p><h3>Services Covered</h3><ul><li>Preventive maintenance visits</li><li>Emergency response within 24 hours</li><li>Parts and labor for covered equipment</li></ul><h3>Duration</h3><p>From {{start_date}} to {{end_date}}</p><h3>Monthly Fee</h3><p><strong>{{contract_value}}</strong> payable on the 1st of each month.</p><h3>SLA</h3><p>Response time: 4 hours for critical issues, 24 hours for non-critical.</p>",
    createdBy: "Admin",
    createdAt: "2024-03-15",
  },
  {
    id: "ct-3",
    title: "Software License Agreement",
    content: "<h2>Software License Agreement</h2><p>This Software License Agreement is entered into between <strong>{{company_name}}</strong> (\"Licensor\") and <strong>{{client_name}}</strong> (\"Licensee\").</p><h3>License Grant</h3><p>The Licensor grants the Licensee a non-exclusive, non-transferable license to use the software described herein.</p><h3>Term</h3><p>This license is valid from {{start_date}} to {{end_date}}.</p><h3>License Fee</h3><p>{{contract_value}} — payable annually.</p><h3>Restrictions</h3><ul><li>No reverse engineering</li><li>No sublicensing</li><li>No modification of source code</li></ul>",
    createdBy: "Admin",
    createdAt: "2024-06-20",
  },
];

const CONTRACT_VARIABLES = [
  { label: "Client Name", value: "{{client_name}}" },
  { label: "Client Email", value: "{{client_email}}" },
  { label: "Client Address", value: "{{client_address}}" },
  { label: "Contract ID", value: "{{contract_id}}" },
  { label: "Contract Date", value: "{{contract_date}}" },
  { label: "Contract Value", value: "{{contract_value}}" },
  { label: "Start Date", value: "{{start_date}}" },
  { label: "End Date", value: "{{end_date}}" },
  { label: "Scope of Work", value: "{{scope_of_work}}" },
  { label: "Payment Terms", value: "{{payment_terms}}" },
  { label: "Company Name", value: "{{company_name}}" },
  { label: "Company Address", value: "{{company_address}}" },
  { label: "Email Signature", value: "{{email_signature}}" },
  { label: "Today's Date", value: "{{todays_date}}" },
];

export default function ContractTemplates() {
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.contractTemplates.list.useQuery();
  const createMutation = trpc.contractTemplates.create.useMutation({
    onSuccess: () => { utils.contractTemplates.list.invalidate(); toast.success("Template created"); setView("list"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.contractTemplates.update.useMutation({
    onSuccess: () => { utils.contractTemplates.list.invalidate(); toast.success("Template updated"); setView("list"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.contractTemplates.delete.useMutation({
    onSuccess: () => { utils.contractTemplates.list.invalidate(); toast.success("Template deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const duplicateMutation = trpc.contractTemplates.duplicate.useMutation({
    onSuccess: () => { utils.contractTemplates.list.invalidate(); toast.success("Template duplicated"); },
    onError: (e) => toast.error(e.message),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);
  const [form, setForm] = useState<ContractTemplate>({
    id: "", title: "", content: "", createdBy: "Admin", createdAt: "",
  });

  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditor = (template?: ContractTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setForm(template);
    } else {
      setEditingTemplate(null);
      setForm({ id: `ct-${Date.now()}`, title: "", content: "", createdBy: "Admin", createdAt: "" });
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

  const handleDuplicate = (template: ContractTemplate) => {
    duplicateMutation.mutate(template.id);
  };

  // Editor view
  if (view === "editor") {
    return (
      <ModuleLayout
        title={editingTemplate ? "Edit Contract Template" : "New Contract Template"}
        description="Design a reusable contract template"
        icon={<FileText className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm/super-admin" },
          { label: "Contracts", href: "/contracts" },
          { label: "Templates", href: "/contracts/templates" },
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
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Standard Service Agreement" />
              </div>
              <div className="space-y-2">
                <Label>Template Content</Label>
                <RichTextEditor
                  value={form.content}
                  onChange={val => setForm(p => ({ ...p, content: val }))}
                  placeholder="Design your contract template..."
                  minHeight="500px"
                  enhanced
                  variables={CONTRACT_VARIABLES}
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
      title="Contract Templates"
      description="Manage reusable contract templates"
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm/super-admin" },
        { label: "Contracts", href: "/contracts" },
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
                      <TableCell className="text-sm text-muted-foreground">{template.createdAt ? new Date(template.createdAt).toLocaleDateString() : "—"}</TableCell>
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
