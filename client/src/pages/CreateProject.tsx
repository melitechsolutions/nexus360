import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Save, FolderOpen, Calendar, DollarSign, Users, Tag, FileText, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function CreateProject() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    clientId: "",
    name: "",
    description: "",
    status: "planning" as "planning" | "active" | "on_hold" | "completed" | "cancelled",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    startDate: "",
    endDate: "",
    budget: "",
    progress: "0",
    assignedTo: "",
    projectManager: "",
    tags: "",
    notes: "",
  });

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: usersData = [] } = trpc.users.list.useQuery();
  const teamMembers = Array.isArray(usersData) ? usersData : (usersData as any)?.users ?? [];
  const clientsArr = Array.isArray(clients) ? clients : (clients as any)?.items ?? [];

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully!");
      utils.projects.list.invalidate();
      navigate("/projects");
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.name) {
      toast.error("Client and Project Name are required");
      return;
    }
    createProjectMutation.mutate({
      clientId: formData.clientId,
      name: formData.name,
      description: formData.description || undefined,
      status: formData.status,
      priority: formData.priority,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      progress: formData.progress ? parseInt(formData.progress) : 0,
      assignedTo: formData.assignedTo || undefined,
      projectManager: formData.projectManager || undefined,
      tags: formData.tags || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <ModuleLayout
      title="Create Project"
      description="Set up a new project and assign it to a client"
      icon={<Plus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Projects", href: "/projects" },
        { label: "Create" },
      ]}
      backLink={{ label: "Projects", href: "/projects" }}
    >
      <div className="space-y-6 max-w-5xl">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Project Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-4 w-4" />Project Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client <span className="text-destructive">*</span></Label>
                  <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {clientsArr.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName || c.contactPerson}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.name}
                    onChange={set("name")}
                    placeholder="e.g., Website Redesign Phase 2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Project Description / Scope</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(v) => setFormData({ ...formData, description: v })}
                  placeholder="Describe the project scope, objectives, and key deliverables..."
                  minHeight="120px"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Schedule & Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />Schedule & Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Status</Label>
                  <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">📋 Planning</SelectItem>
                      <SelectItem value="active">🟢 Active</SelectItem>
                      <SelectItem value="on_hold">⏸ On Hold</SelectItem>
                      <SelectItem value="completed">✅ Completed</SelectItem>
                      <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority Level</Label>
                  <Select value={formData.priority} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 Low</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="urgent">🔴 Critical / Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={set("startDate")} />
                </div>
                <div className="space-y-2">
                  <Label>End Date / Deadline</Label>
                  <Input type="date" value={formData.endDate} onChange={set("endDate")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Budget & Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />Budget & Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Project Budget (KES)</Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={set("budget")}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">Total approved budget for this project</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Initial Completion: {formData.progress}%</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={set("progress")}
                  className="w-full accent-primary"
                  aria-label="Project completion percentage"
                  title="Project completion percentage"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0% – Not started</span><span>50% – Halfway</span><span>100% – Complete</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Team Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />Team Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Manager</Label>
                  <Select value={formData.projectManager} onValueChange={(v) => setFormData({ ...formData, projectManager: v })}>
                    <SelectTrigger><SelectValue placeholder="Select project manager" /></SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      <SelectItem value="unassigned">— Unassigned —</SelectItem>
                      {teamMembers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Manager</Label>
                  <Select value={formData.assignedTo} onValueChange={(v) => setFormData({ ...formData, assignedTo: v })}>
                    <SelectTrigger><SelectValue placeholder="Select account manager" /></SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      <SelectItem value="unassigned">— Unassigned —</SelectItem>
                      {teamMembers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Tag className="h-3 w-3" />Tags</Label>
                <Input
                  value={formData.tags}
                  onChange={set("tags")}
                  placeholder="e.g., design, development, urgent, phase2 (comma-separated)"
                />
                <p className="text-xs text-muted-foreground">Separate tags with commas for easy filtering</p>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />Additional Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Project Notes</Label>
                <RichTextEditor
                  value={formData.notes}
                  onChange={(v) => setFormData({ ...formData, notes: v })}
                  placeholder="Special instructions, client requirements, technical notes, risks to watch out for..."
                  minHeight="140px"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-between pb-8">
            <Button type="button" variant="outline" onClick={() => navigate("/projects")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Cancel
            </Button>
            <Button type="submit" disabled={createProjectMutation.isPending} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}
