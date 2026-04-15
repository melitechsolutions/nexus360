import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Plus, Edit2, Trash2, Search, CheckCircle, Clock, ClipboardList, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { StatsCard } from "@/components/ui/stats-card";

export default function Onboarding() {
  useRequireFeature("hr:view");
  const [activeTab, setActiveTab] = useState<"checklists" | "templates">("checklists");
  const [search, setSearch] = useState("");
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showCreateChecklist, setShowCreateChecklist] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", description: "", type: "onboarding" as "onboarding" | "offboarding" });
  const [checklistForm, setChecklistForm] = useState({ employeeId: "", templateId: "", type: "onboarding" as "onboarding" | "offboarding" });
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"template" | "checklist">("template");

  const templates = trpc.onboarding.listTemplates.useQuery();
  const checklists = trpc.onboarding.listChecklists.useQuery();
  const employees = trpc.employees.list.useQuery();
  const checklistDetail = trpc.onboarding.getChecklist.useQuery(
    { id: selectedChecklist! },
    { enabled: !!selectedChecklist }
  );
  const utils = trpc.useUtils();

  const createTemplate = trpc.onboarding.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      setShowCreateTemplate(false);
      setTemplateForm({ name: "", description: "", type: "onboarding" });
      utils.onboarding.listTemplates.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createChecklist = trpc.onboarding.createChecklist.useMutation({
    onSuccess: () => {
      toast.success("Checklist created from template");
      setShowCreateChecklist(false);
      setChecklistForm({ employeeId: "", templateId: "", type: "onboarding" });
      utils.onboarding.listChecklists.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTask = trpc.onboarding.updateTask.useMutation({
    onSuccess: () => {
      toast.success("Task updated");
      utils.onboarding.getChecklist.invalidate();
      utils.onboarding.listChecklists.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTemplate = trpc.onboarding.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Deleted");
      setDeleteId(null);
      utils.onboarding.listTemplates.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredChecklists = (checklists.data || []).filter((c: any) =>
    !search || (c.firstName + " " + c.lastName).toLowerCase().includes(search.toLowerCase())
  );

  const filteredTemplates = (templates.data || []).filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: (checklists.data || []).length,
    pending: (checklists.data || []).filter((c: any) => c.status === "pending" || c.status === "in_progress").length,
    completed: (checklists.data || []).filter((c: any) => c.status === "completed").length,
    templates: (templates.data || []).length,
  };

  return (
    <ModuleLayout
      title="Onboarding & Offboarding"
      description="Manage employee onboarding and offboarding checklists"
      icon={UserPlus}
      breadcrumbs={[{ label: "HR", href: "/employees" }, { label: "Onboarding" }]}
    >
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard label="Total Checklists" value={stats.total} icon={<ClipboardList className="h-5 w-5" />} color="border-l-blue-500" />
        <StatsCard label="In Progress" value={stats.pending} icon={<Clock className="h-5 w-5" />} color="border-l-orange-500" />
        <StatsCard label="Completed" value={stats.completed} icon={<CheckCircle className="h-5 w-5" />} color="border-l-green-500" />
        <StatsCard label="Templates" value={stats.templates} icon={<Users className="h-5 w-5" />} color="border-l-purple-500" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button variant={activeTab === "checklists" ? "default" : "outline"} onClick={() => setActiveTab("checklists")}>
          <ClipboardList className="h-4 w-4 mr-2" /> Checklists
        </Button>
        <Button variant={activeTab === "templates" ? "default" : "outline"} onClick={() => setActiveTab("templates")}>
          <Users className="h-4 w-4 mr-2" /> Templates
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {activeTab === "templates" && (
          <Button onClick={() => setShowCreateTemplate(true)}><Plus className="h-4 w-4 mr-2" /> New Template</Button>
        )}
        {activeTab === "checklists" && (
          <Button onClick={() => setShowCreateChecklist(true)}><Plus className="h-4 w-4 mr-2" /> New Checklist</Button>
        )}
      </div>

      {/* Checklists Tab */}
      {activeTab === "checklists" && (
        <Card>
          <CardContent className="p-0">
            {checklists.isLoading ? (
              <div className="flex justify-center p-8"><Spinner /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChecklists.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No checklists found</TableCell></TableRow>
                  ) : filteredChecklists.map((c: any) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelectedChecklist(c.id)}>
                      <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                      <TableCell><Badge variant={c.type === "onboarding" ? "default" : "secondary"}>{c.type}</Badge></TableCell>
                      <TableCell>{c.templateName || "-"}</TableCell>
                      <TableCell>{c.completedTasks || 0}/{c.totalTasks || 0}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "completed" ? "default" : c.status === "in_progress" ? "secondary" : "outline"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedChecklist(c.id); }}>
                          View Tasks
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <Card>
          <CardContent className="p-0">
            {templates.isLoading ? (
              <div className="flex justify-center p-8"><Spinner /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No templates</TableCell></TableRow>
                  ) : filteredTemplates.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell><Badge variant={t.type === "onboarding" ? "default" : "secondary"}>{t.type}</Badge></TableCell>
                      <TableCell className="max-w-[300px] truncate">{t.description || "-"}</TableCell>
                      <TableCell>{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(t.id); setDeleteType("template"); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checklist Detail Dialog */}
      <Dialog open={!!selectedChecklist} onOpenChange={() => setSelectedChecklist(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist Tasks</DialogTitle>
            <DialogDescription>Toggle tasks as they are completed</DialogDescription>
          </DialogHeader>
          {checklistDetail.isLoading ? <Spinner /> : (
            <div className="space-y-2">
              {(checklistDetail.data?.tasks || []).map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => updateTask.mutate({ id: task.id, isCompleted: !task.isCompleted })}
                    className="h-5 w-5 rounded"
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                    {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  </div>
                  {task.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                  {task.assignedTo && <Badge variant="secondary" className="text-xs">{task.assignedTo}</Badge>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>Create a reusable onboarding/offboarding template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Template name" value={templateForm.name} onChange={(e) => setTemplateForm(p => ({ ...p, name: e.target.value }))} />
            <Textarea placeholder="Description" value={templateForm.description} onChange={(e) => setTemplateForm(p => ({ ...p, description: e.target.value }))} />
            <Select value={templateForm.type} onValueChange={(v: any) => setTemplateForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="offboarding">Offboarding</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!templateForm.name || createTemplate.isPending} onClick={() => createTemplate.mutate(templateForm)}>
              {createTemplate.isPending ? <Spinner className="mr-2" /> : null} Create Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Checklist Dialog */}
      <Dialog open={showCreateChecklist} onOpenChange={setShowCreateChecklist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Checklist</DialogTitle>
            <DialogDescription>Assign a checklist to an employee from a template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={checklistForm.employeeId} onValueChange={(v) => setChecklistForm(p => ({ ...p, employeeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
              <SelectContent>
                {(employees.data || []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={checklistForm.templateId} onValueChange={(v) => setChecklistForm(p => ({ ...p, templateId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Template" /></SelectTrigger>
              <SelectContent>
                {(templates.data || []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={checklistForm.type} onValueChange={(v: any) => setChecklistForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="offboarding">Offboarding</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!checklistForm.employeeId || !checklistForm.templateId || createChecklist.isPending}
              onClick={() => createChecklist.mutate(checklistForm)}>
              {createChecklist.isPending ? <Spinner className="mr-2" /> : null} Create Checklist
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete {deleteType}?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteTemplate.mutate({ id: deleteId })}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}
