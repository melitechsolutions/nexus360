/**
 * Business Rules Engine Page
 * Visual rule builder and business logic automation — wired to automationRules backend
 */

import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Edit,
  Download,
  Zap,
  Settings,
} from "lucide-react";
import { downloadCSV } from "@/lib/export-utils";

const TRIGGER_TYPES = [
  { value: "invoice_created", label: "Invoice Created" },
  { value: "payment_received", label: "Payment Received" },
  { value: "invoice_overdue", label: "Invoice Overdue" },
  { value: "project_milestone", label: "Project Milestone" },
  { value: "time_entry_submitted", label: "Time Entry Submitted" },
  { value: "expense_submitted", label: "Expense Submitted" },
  { value: "client_created", label: "Client Created" },
  { value: "lead_qualified", label: "Lead Qualified" },
] as const;

const ENTITY_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment" },
  { value: "project", label: "Project" },
  { value: "time_entry", label: "Time Entry" },
  { value: "expense", label: "Expense" },
  { value: "client", label: "Client" },
  { value: "lead", label: "Lead" },
] as const;

const ACTION_TYPES = [
  { value: "send_notification", label: "Send Notification" },
  { value: "send_email", label: "Send Email" },
  { value: "create_task", label: "Create Task" },
  { value: "update_field", label: "Update Field" },
  { value: "send_sms", label: "Send SMS" },
  { value: "webhook", label: "Webhook" },
] as const;

const TEMPLATES = [
  {
    name: "Auto-approve Small Invoices",
    description: "Automatically approve invoices under a threshold",
    trigger: "invoice_created",
    entity: "invoice",
    priority: "normal" as const,
  },
  {
    name: "Payment Reminder",
    description: "Send reminder emails before payment due date",
    trigger: "invoice_overdue",
    entity: "invoice",
    priority: "high" as const,
  },
  {
    name: "New Lead Welcome",
    description: "Send welcome email when a lead qualifies",
    trigger: "lead_qualified",
    entity: "lead",
    priority: "normal" as const,
  },
  {
    name: "Expense Auto-routing",
    description: "Route expenses to the right approver based on amount",
    trigger: "expense_submitted",
    entity: "expense",
    priority: "normal" as const,
  },
];

export default function BusinessRulesEngine() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    triggerType: "" as string,
    entity: "" as string,
    priority: "normal" as "low" | "normal" | "high",
    actionType: "send_notification" as string,
    actionConfig: "" as string,
    conditionField: "",
    conditionOperator: "equals" as string,
    conditionValue: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      triggerType: "",
      entity: "",
      priority: "normal",
      actionType: "send_notification",
      actionConfig: "",
      conditionField: "",
      conditionOperator: "equals",
      conditionValue: "",
    });
  };

  const utils = trpc.useUtils();
  const { data: rulesRaw, isLoading } = trpc.automationRules.listRules.useQuery();
  const rules = (rulesRaw as any[]) || [];

  const createMutation = trpc.automationRules.createRule.useMutation({
    onSuccess: () => {
      toast.success("Rule created successfully");
      utils.automationRules.listRules.invalidate();
      setCreateOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.automationRules.updateRule.useMutation({
    onSuccess: () => {
      toast.success("Rule updated successfully");
      utils.automationRules.listRules.invalidate();
      setEditOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.automationRules.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("Rule deleted");
      utils.automationRules.listRules.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.automationRules.toggleRuleStatus.useMutation({
    onSuccess: () => {
      utils.automationRules.listRules.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!form.name || !form.triggerType || !form.entity) {
      toast.error("Name, trigger, and entity type are required");
      return;
    }
    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      trigger: {
        type: form.triggerType as any,
        entity: form.entity as any,
      },
      conditions: form.conditionField
        ? [{ field: form.conditionField, operator: form.conditionOperator as any, value: form.conditionValue }]
        : [],
      actions: [
        {
          type: form.actionType as any,
          config: { message: form.actionConfig || form.name },
        },
      ],
      isActive: true,
      priority: form.priority,
    });
  };

  const handleUpdate = () => {
    if (!selectedRule) return;
    updateMutation.mutate({
      id: selectedRule.id,
      name: form.name || undefined,
      description: form.description || undefined,
      isActive: selectedRule.isActive,
      priority: form.priority,
    });
  };

  const handleExport = () => {
    if (!rules.length) {
      toast.warning("No rules to export");
      return;
    }
    const data = rules.map((r: any) => ({
      Name: r.name,
      Description: r.description || "",
      Status: r.isActive ? "Active" : "Inactive",
      Priority: r.priority || "normal",
      CreatedAt: r.createdAt,
    }));
    downloadCSV(data, "business_rules_export.csv");
    toast.success("Rules exported");
  };

  const activeRules = rules.filter((r: any) => r.isActive);
  const totalRules = rules.length;

  return (
    <ModuleLayout
      title="Business Rules Engine"
      description="Create and manage automated business rules"
      icon={<Zap className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Business Rules" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Rule
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{totalRules}</p>
              <p className="text-sm text-muted-foreground">Total Rules</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-green-600">{activeRules.length}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-gray-400">{totalRules - activeRules.length}</p>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-bold text-purple-600">
                {rules.reduce((s: number, r: any) => {
                  const t = r.trigger;
                  return s + (t?.type ? 1 : 0);
                }, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Triggers Configured</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">My Rules ({totalRules})</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">Loading rules...</CardContent>
              </Card>
            ) : rules.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No rules yet</p>
                  <p className="text-sm">Create your first automation rule to get started.</p>
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Create Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule: any) => {
                      const trigger = typeof rule.trigger === "object" ? rule.trigger : {};
                      return (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{rule.name}</p>
                              {rule.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[250px]">{rule.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{trigger.entity || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{trigger.type?.replace(/_/g, " ") || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                rule.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : rule.priority === "low"
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }
                            >
                              {rule.priority || "normal"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={!!rule.isActive}
                              onCheckedChange={(v) =>
                                toggleMutation.mutate({ id: rule.id, isActive: v })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRule(rule);
                                  setDetailOpen(true);
                                }}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRule(rule);
                                  setForm({
                                    name: rule.name,
                                    description: rule.description || "",
                                    triggerType: trigger.type || "",
                                    entity: trigger.entity || "",
                                    priority: rule.priority || "normal",
                                    actionType: "send_notification",
                                    actionConfig: "",
                                    conditionField: "",
                                    conditionOperator: "equals",
                                    conditionValue: "",
                                  });
                                  setEditOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this rule?")) {
                                    deleteMutation.mutate(rule.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEMPLATES.map((tpl) => (
                <Card key={tpl.name} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <CardDescription>{tpl.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{tpl.entity}</Badge>
                      <Badge variant="secondary">{tpl.trigger.replace(/_/g, " ")}</Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setForm({
                          ...form,
                          name: tpl.name,
                          description: tpl.description,
                          triggerType: tpl.trigger,
                          entity: tpl.entity,
                          priority: tpl.priority,
                        });
                        setCreateOpen(true);
                        toast.info("Template loaded — customize and create");
                      }}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Rule</DialogTitle>
              <DialogDescription>Define automation trigger, conditions and actions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Name *</Label>
                <Input placeholder="e.g., Auto-approve invoices under $5,000" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <RichTextEditor value={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="What does this rule do?" minHeight="80px" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Entity Type *</Label>
                  <Select value={form.entity} onValueChange={(v) => setForm({ ...form, entity: v })}>
                    <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Trigger *</Label>
                  <Select value={form.triggerType} onValueChange={(v) => setForm({ ...form, triggerType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Action Type</Label>
                  <Select value={form.actionType} onValueChange={(v) => setForm({ ...form, actionType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Condition (optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Field" value={form.conditionField} onChange={(e) => setForm({ ...form, conditionField: e.target.value })} />
                  <Select value={form.conditionOperator} onValueChange={(v) => setForm({ ...form, conditionOperator: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Not Equals</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                      <SelectItem value="less_than">Less Than</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Value" value={form.conditionValue} onChange={(e) => setForm({ ...form, conditionValue: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Rule</DialogTitle>
              <DialogDescription>Update rule details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <RichTextEditor value={form.description} onChange={(html) => setForm({ ...form, description: html })} minHeight="80px" />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Rule: {selectedRule?.name}</DialogTitle>
            </DialogHeader>
            {selectedRule && (
              <div className="space-y-4">
                {selectedRule.description && (
                  <p className="text-muted-foreground">{selectedRule.description}</p>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="text-xs text-muted-foreground">Priority</div>
                    <div className="text-lg font-bold text-blue-600 capitalize">{selectedRule.priority || "normal"}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="text-lg font-bold text-green-600">{selectedRule.isActive ? "Active" : "Inactive"}</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded">
                    <div className="text-xs text-muted-foreground">Entity</div>
                    <div className="text-lg font-bold text-purple-600 capitalize">{selectedRule.trigger?.entity || "—"}</div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Trigger:</span> {selectedRule.trigger?.type?.replace(/_/g, " ") || "—"}</div>
                    <div><span className="text-muted-foreground">Conditions:</span> {Array.isArray(selectedRule.conditions) ? selectedRule.conditions.length : 0} configured</div>
                    <div><span className="text-muted-foreground">Actions:</span> {Array.isArray(selectedRule.actions) ? selectedRule.actions.length : 0} configured</div>
                    <div><span className="text-muted-foreground">Created:</span> {selectedRule.createdAt ? new Date(selectedRule.createdAt).toLocaleString() : "—"}</div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
