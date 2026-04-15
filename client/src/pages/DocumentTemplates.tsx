import React, { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileText, Plus, Edit2, Trash2, Search, Eye, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";

interface DocumentTemplate {
  id: string;
  type: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// Document type configurations
const DOC_CONFIG: Record<string, {
  label: string;
  singular: string;
  parentLabel: string;
  parentHref: string;
  dashboardHref: string;
  variables: { label: string; value: string }[];
}> = {
  invoice: {
    label: "Invoice Templates",
    singular: "Invoice",
    parentLabel: "Invoices",
    parentHref: "/invoices",
    dashboardHref: "/crm/super-admin",
    variables: [
      { label: "Client Name", value: "{{client_name}}" },
      { label: "Client Email", value: "{{client_email}}" },
      { label: "Client Address", value: "{{client_address}}" },
      { label: "Invoice Number", value: "{{invoice_number}}" },
      { label: "Invoice Date", value: "{{invoice_date}}" },
      { label: "Due Date", value: "{{due_date}}" },
      { label: "Total Amount", value: "{{total_amount}}" },
      { label: "Sub Total", value: "{{sub_total}}" },
      { label: "Tax Amount", value: "{{tax_amount}}" },
      { label: "Discount", value: "{{discount}}" },
      { label: "Payment Terms", value: "{{payment_terms}}" },
      { label: "Items Table", value: "{{items_table}}" },
      { label: "Notes", value: "{{notes}}" },
      { label: "Company Name", value: "{{company_name}}" },
      { label: "Company Address", value: "{{company_address}}" },
      { label: "Company Phone", value: "{{company_phone}}" },
      { label: "Company Email", value: "{{company_email}}" },
      { label: "Logo URL", value: "{{logo_url}}" },
      { label: "Today's Date", value: "{{todays_date}}" },
    ],
  },
  estimate: {
    label: "Estimate Templates",
    singular: "Estimate",
    parentLabel: "Estimates",
    parentHref: "/estimates",
    dashboardHref: "/crm/super-admin",
    variables: [
      { label: "Client Name", value: "{{client_name}}" },
      { label: "Client Email", value: "{{client_email}}" },
      { label: "Client Address", value: "{{client_address}}" },
      { label: "Estimate Number", value: "{{estimate_number}}" },
      { label: "Estimate Date", value: "{{estimate_date}}" },
      { label: "Expiry Date", value: "{{expiry_date}}" },
      { label: "Total Amount", value: "{{total_amount}}" },
      { label: "Sub Total", value: "{{sub_total}}" },
      { label: "Tax Amount", value: "{{tax_amount}}" },
      { label: "Items Table", value: "{{items_table}}" },
      { label: "Notes", value: "{{notes}}" },
      { label: "Terms", value: "{{terms}}" },
      { label: "Company Name", value: "{{company_name}}" },
      { label: "Company Address", value: "{{company_address}}" },
      { label: "Logo URL", value: "{{logo_url}}" },
      { label: "Today's Date", value: "{{todays_date}}" },
    ],
  },
  quotation: {
    label: "Quotation Templates",
    singular: "Quotation",
    parentLabel: "Quotations",
    parentHref: "/quotations",
    dashboardHref: "/crm/super-admin",
    variables: [
      { label: "Client Name", value: "{{client_name}}" },
      { label: "Client Email", value: "{{client_email}}" },
      { label: "Client Address", value: "{{client_address}}" },
      { label: "Quotation Number", value: "{{quotation_number}}" },
      { label: "Quotation Date", value: "{{quotation_date}}" },
      { label: "Valid Until", value: "{{valid_until}}" },
      { label: "Total Amount", value: "{{total_amount}}" },
      { label: "Sub Total", value: "{{sub_total}}" },
      { label: "Tax Amount", value: "{{tax_amount}}" },
      { label: "Items Table", value: "{{items_table}}" },
      { label: "Terms & Conditions", value: "{{terms}}" },
      { label: "Notes", value: "{{notes}}" },
      { label: "Company Name", value: "{{company_name}}" },
      { label: "Company Address", value: "{{company_address}}" },
      { label: "Logo URL", value: "{{logo_url}}" },
      { label: "Today's Date", value: "{{todays_date}}" },
    ],
  },
  receipt: {
    label: "Receipt Templates",
    singular: "Receipt",
    parentLabel: "Receipts",
    parentHref: "/receipts",
    dashboardHref: "/crm/super-admin",
    variables: [
      { label: "Client Name", value: "{{client_name}}" },
      { label: "Receipt Number", value: "{{receipt_number}}" },
      { label: "Receipt Date", value: "{{receipt_date}}" },
      { label: "Payment Amount", value: "{{payment_amount}}" },
      { label: "Payment Method", value: "{{payment_method}}" },
      { label: "Payment Reference", value: "{{payment_reference}}" },
      { label: "Invoice Number", value: "{{invoice_number}}" },
      { label: "Balance Due", value: "{{balance_due}}" },
      { label: "Notes", value: "{{notes}}" },
      { label: "Company Name", value: "{{company_name}}" },
      { label: "Company Address", value: "{{company_address}}" },
      { label: "Logo URL", value: "{{logo_url}}" },
      { label: "Today's Date", value: "{{todays_date}}" },
    ],
  },
  purchase_order: {
    label: "Purchase Order Templates",
    singular: "Purchase Order",
    parentLabel: "Purchase Orders",
    parentHref: "/lpos",
    dashboardHref: "/crm/super-admin",
    variables: [
      { label: "Supplier Name", value: "{{supplier_name}}" },
      { label: "Supplier Email", value: "{{supplier_email}}" },
      { label: "Supplier Address", value: "{{supplier_address}}" },
      { label: "PO Number", value: "{{po_number}}" },
      { label: "PO Date", value: "{{po_date}}" },
      { label: "Delivery Date", value: "{{delivery_date}}" },
      { label: "Total Amount", value: "{{total_amount}}" },
      { label: "Sub Total", value: "{{sub_total}}" },
      { label: "Tax Amount", value: "{{tax_amount}}" },
      { label: "Items Table", value: "{{items_table}}" },
      { label: "Delivery Address", value: "{{delivery_address}}" },
      { label: "Payment Terms", value: "{{payment_terms}}" },
      { label: "Notes", value: "{{notes}}" },
      { label: "Company Name", value: "{{company_name}}" },
      { label: "Company Address", value: "{{company_address}}" },
      { label: "Logo URL", value: "{{logo_url}}" },
      { label: "Authorized By", value: "{{authorized_by}}" },
      { label: "Today's Date", value: "{{todays_date}}" },
    ],
  },
  credit_note: {
    label: "Credit Note Templates",
    singular: "Credit Note",
    parentLabel: "Credit Notes",
    parentHref: "/credit-notes",
    dashboardHref: "/crm/super-admin",
    variables: [
      { label: "Client Name", value: "{{client_name}}" },
      { label: "Client Email", value: "{{client_email}}" },
      { label: "Credit Note Number", value: "{{credit_note_number}}" },
      { label: "Credit Note Date", value: "{{credit_note_date}}" },
      { label: "Invoice Number", value: "{{invoice_number}}" },
      { label: "Total Amount", value: "{{total_amount}}" },
      { label: "Reason", value: "{{reason}}" },
      { label: "Items Table", value: "{{items_table}}" },
      { label: "Notes", value: "{{notes}}" },
      { label: "Company Name", value: "{{company_name}}" },
      { label: "Company Address", value: "{{company_address}}" },
      { label: "Logo URL", value: "{{logo_url}}" },
      { label: "Today's Date", value: "{{todays_date}}" },
    ],
  },
  debit_note: {
    label: "Debit Note Templates",
    singular: "Debit Note",
    parentLabel: "Debit Notes",
    parentHref: "/debit-notes",
    dashboardHref: "/crm/super-admin",
    variables: [
      { label: "Client Name", value: "{{client_name}}" },
      { label: "Client Email", value: "{{client_email}}" },
      { label: "Debit Note Number", value: "{{debit_note_number}}" },
      { label: "Debit Note Date", value: "{{debit_note_date}}" },
      { label: "Invoice Number", value: "{{invoice_number}}" },
      { label: "Total Amount", value: "{{total_amount}}" },
      { label: "Reason", value: "{{reason}}" },
      { label: "Items Table", value: "{{items_table}}" },
      { label: "Notes", value: "{{notes}}" },
      { label: "Company Name", value: "{{company_name}}" },
      { label: "Company Address", value: "{{company_address}}" },
      { label: "Logo URL", value: "{{logo_url}}" },
      { label: "Today's Date", value: "{{todays_date}}" },
    ],
  },
};

interface DocumentTemplatesProps {
  type: string;
}

export default function DocumentTemplates({ type }: DocumentTemplatesProps) {
  const config = DOC_CONFIG[type];
  if (!config) return <div className="p-8 text-center text-muted-foreground">Unknown document type: {type}</div>;

  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.documentTemplates.list.useQuery({ type });
  const createMutation = trpc.documentTemplates.create.useMutation({
    onSuccess: () => { utils.documentTemplates.list.invalidate(); toast.success("Template created"); setView("list"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.documentTemplates.update.useMutation({
    onSuccess: () => { utils.documentTemplates.list.invalidate(); toast.success("Template updated"); setView("list"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.documentTemplates.delete.useMutation({
    onSuccess: () => { utils.documentTemplates.list.invalidate(); toast.success("Template deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const duplicateMutation = trpc.documentTemplates.duplicate.useMutation({
    onSuccess: () => { utils.documentTemplates.list.invalidate(); toast.success("Template duplicated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [form, setForm] = useState<{ title: string; content: string }>({ title: "", content: "" });

  const filtered = (templates as DocumentTemplate[]).filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditor = (template?: DocumentTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setForm({ title: template.title, content: template.content });
    } else {
      setEditingTemplate(null);
      setForm({ title: "", content: "" });
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
      createMutation.mutate({ type, title: form.title, content: form.content });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  // Editor view
  if (view === "editor") {
    return (
      <ModuleLayout
        title={editingTemplate ? `Edit ${config.singular} Template` : `New ${config.singular} Template`}
        description={`Design a reusable ${config.singular.toLowerCase()} template`}
        icon={<FileText className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: config.dashboardHref },
          { label: config.parentLabel, href: config.parentHref },
          { label: "Templates", href: `${config.parentHref}/templates` },
          { label: editingTemplate ? "Edit" : "New Template" },
        ]}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Templates
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Template Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={`e.g., Standard ${config.singular}`} />
              </div>
              <div className="space-y-2">
                <Label>Template Content</Label>
                <RichTextEditor
                  value={form.content}
                  onChange={val => setForm(p => ({ ...p, content: val }))}
                  placeholder={`Design your ${config.singular.toLowerCase()} template...`}
                  minHeight="500px"
                  enhanced
                  variables={config.variables}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </ModuleLayout>
    );
  }

  // List view
  if (isLoading) {
    return (
      <ModuleLayout title={config.label} description={`Manage reusable ${config.singular.toLowerCase()} templates`} icon={<FileText className="h-5 w-5" />}>
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title={config.label}
      description={`Manage reusable ${config.singular.toLowerCase()} templates`}
      icon={<FileText className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: config.dashboardHref },
        { label: config.parentLabel, href: config.parentHref },
        { label: "Templates" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
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
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No templates found. Create your first {config.singular.toLowerCase()} template.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(template => (
                    <TableRow key={template.id} className="group">
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">{template.createdBy.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
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
                          <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(template.id)} title="Duplicate">
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
