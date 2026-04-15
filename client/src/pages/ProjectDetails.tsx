import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import StaffAssignment from "@/components/StaffAssignment";
import { CreateProjectTask } from "@/components/ProjectTasks/CreateProjectTask";
import { EditProjectTask } from "@/components/ProjectTasks/EditProjectTask";
import { ProjectTasksList } from "@/components/ProjectTasks/ProjectTasksList";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProjectProgressBar } from "@/components/ProjectProgressBar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Building2,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  Star,
  FolderKanban,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logDelete } from "@/lib/activityLog";
import { StatsCard } from "@/components/ui/stats-card";
import { RichTextDisplay } from "@/components/RichTextEditor";
import { useCurrencySettings } from "@/lib/currency";
import { useUserLookup } from "@/hooks/useUserLookup";
import { useFavorite } from "@/hooks/useFavorite";

export default function ProjectDetails() {
  const { code: currencyCode } = useCurrencySettings();
  const { getUserName } = useUserLookup();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskView, setTaskView] = useState<"list" | "create" | "edit">("list");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = params.id!;

  const { data: project, isLoading } = trpc.projects.getById.useQuery(projectId);
  const updateProgressMutation = trpc.projects.updateProgress.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate(projectId);
      utils.projects.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update progress: ${error.message}`);
    },
  });
  const { data: client } = trpc.clients.getById.useQuery(
    project?.clientId || "",
    { enabled: !!project?.clientId }
  );
  const { data: rawTasks = [], refetch: refetchTasks } = trpc.projects.tasks.list.useQuery({ projectId });
  const { data: rawTeamMembers = [] } = trpc.projects.teamMembers.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const { data: invoices = [] } = trpc.invoices.byClient.useQuery(
    { clientId: project?.clientId || "" },
    { enabled: !!project?.clientId }
  );
  const { data: estimates = [] } = trpc.estimates.byClient.useQuery(
    { clientId: project?.clientId || "" },
    { enabled: !!project?.clientId }
  );
  
  // Convert frozen Drizzle objects to plain objects to avoid React error #306
  const tasks = rawTasks ? JSON.parse(JSON.stringify(rawTasks)) : [];
  const teamMembers = rawTeamMembers ? JSON.parse(JSON.stringify(rawTeamMembers)) : [];
  const plainProject = project ? JSON.parse(JSON.stringify(project)) : null;
  const plainClient = client ? JSON.parse(JSON.stringify(client)) : null;
  const plainInvoices = invoices ? JSON.parse(JSON.stringify(invoices)) : [];
  const plainEstimates = estimates ? JSON.parse(JSON.stringify(estimates)) : [];
  const { isStarred, toggleStar } = useFavorite("project", projectId, plainProject?.name);
  
  const utils = trpc.useUtils();
  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success(`Project "${plainProject?.name}" has been deleted`);
      logDelete("Projects", projectId, plainProject?.name || "Unknown");
      navigate("/projects");
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteProjectMutation, projectId);
      setIsDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout title="Project Details" icon={<FolderKanban className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Projects", href: "/projects"}, {label: "Details"}]} backLink={{label: "Projects", href: "/projects"}}>
        <div className="flex items-center justify-center h-64">
          <p>Loading project...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!project) {
    return (
      <ModuleLayout title="Project Details" icon={<FolderKanban className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Projects", href: "/projects"}, {label: "Details"}]} backLink={{label: "Projects", href: "/projects"}}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Project not found</p>
          <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
        </div>
      </ModuleLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "planning":
        return "bg-blue-500";
      case "on_hold":
        return "bg-yellow-500";
      case "completed":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100);
  };

  return (
    <ModuleLayout title="Project Details" icon={<FolderKanban className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Projects", href: "/projects"}, {label: "Details"}]} backLink={{label: "Projects", href: "/projects"}}>
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={toggleStar}><Star className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}/edit`)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsDeleteOpen(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>

        {/* Split Layout */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-[320px] min-w-[320px] space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{plainProject?.name}</h2>
                  <p className="text-sm text-muted-foreground">{plainProject?.projectNumber}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={getStatusColor(plainProject?.status)}>
                    {plainProject?.status?.replace("_", " ").toUpperCase()}
                  </Badge>
                  <Badge variant={getPriorityColor(plainProject?.priority)}>
                    {(plainProject?.priority || "medium").toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Client</p>
                      <p className="font-medium">{plainClient?.companyName || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Manager</p>
                      <p className="font-medium">{plainProject?.projectManager ? getUserName(plainProject.projectManager) : "Not assigned"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Start</p>
                      <p className="font-medium">
                        {plainProject?.startDate
                          ? format(new Date(plainProject.startDate), "MMM dd, yyyy")
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Due</p>
                      <p className="font-medium">
                        {plainProject?.endDate
                          ? format(new Date(plainProject.endDate), "MMM dd, yyyy")
                          : "No deadline"}
                      </p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Financial Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-bold">{plainProject?.budget ? formatCurrency(plainProject.budget) : "N/A"}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Spent</p>
                      <p className="font-bold">{formatCurrency(plainProject?.actualCost || 0)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <ProjectProgressBar
                  projectId={projectId}
                  projectName={plainProject?.name || ""}
                  currentProgress={plainProject?.progress || 0}
                  onProgressUpdate={(newProgress) => {
                    updateProgressMutation.mutate({ id: projectId, progress: newProgress });
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Content */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="team">Team ({teamMembers.length})</TabsTrigger>
                <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
                <TabsTrigger value="invoices">Invoices ({plainInvoices.length})</TabsTrigger>
                <TabsTrigger value="estimates">Estimates ({plainEstimates.length})</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  {plainProject?.description ? (
                    <RichTextDisplay html={plainProject.description} className="text-sm text-muted-foreground" />
                  ) : (
                    <p className="text-sm text-muted-foreground">No description provided</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Project Manager</h4>
                    <p className="text-sm text-muted-foreground">
                      {plainProject?.projectManager ? getUserName(plainProject.projectManager) : "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Assigned To</h4>
                    <p className="text-sm text-muted-foreground">
                      {plainProject?.assignedTo ? getUserName(plainProject.assignedTo) : "Not assigned"}
                    </p>
                  </div>
                </div>

                {plainProject?.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <RichTextDisplay html={plainProject.notes} className="text-sm text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <StaffAssignment projectId={projectId} />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {taskView === "list" && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Project Tasks</CardTitle>
                      <CardDescription>Manage and track project tasks</CardDescription>
                    </div>
                    <Button
                      onClick={() => setTaskView("create")}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Task
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ProjectTasksList
                      projectId={projectId}
                      tasks={tasks}
                      teamMembers={teamMembers.map((tm: any) => ({
                        id: tm.employeeId,
                        name: tm.employeeId, // Note: In real app, would fetch employee name
                      }))}
                      isAdmin={true}
                      onEdit={(task) => {
                        setSelectedTask(task);
                        setTaskView("edit");
                      }}
                      onRefresh={() => refetchTasks()}
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {taskView === "create" && (
              <CreateProjectTask
                projectId={projectId}
                teamMembers={teamMembers.map((tm: any) => ({
                  id: tm.employeeId,
                  name: tm.employeeId,
                }))}
                onSuccess={() => {
                  refetchTasks();
                  setTaskView("list");
                  toast.success("Task created successfully");
                }}
                onCancel={() => setTaskView("list")}
              />
            )}

            {taskView === "edit" && selectedTask && (
              <EditProjectTask
                task={selectedTask}
                teamMembers={teamMembers.map((tm: any) => ({
                  id: tm.employeeId,
                  name: tm.employeeId,
                }))}
                isAdmin={true}
                onSuccess={() => {
                  refetchTasks();
                  setTaskView("list");
                  setSelectedTask(null);
                  toast.success("Task updated successfully");
                }}
                onCancel={() => {
                  setTaskView("list");
                  setSelectedTask(null);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Invoices</CardTitle>
                    <CardDescription>Client invoices related to this project</CardDescription>
                  </div>
                  <Button onClick={() => navigate("/invoices")}>
                    <FileText className="h-4 w-4 mr-2" />
                    View All Invoices
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {plainInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No invoices yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {plainInvoices.map((invoice: any) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">{invoice.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(invoice.total)}</p>
                          <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estimates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Estimates</CardTitle>
                    <CardDescription>Quotations for this project</CardDescription>
                  </div>
                  <Button onClick={() => navigate("/estimates")}>
                    <Receipt className="h-4 w-4 mr-2" />
                    View All Estimates
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {plainEstimates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No estimates yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {plainEstimates.map((estimate: any) => (
                      <div
                        key={estimate.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => navigate(`/estimates/${estimate.id}`)}
                      >
                        <div>
                          <p className="font-medium">{estimate.estimateNumber}</p>
                          <p className="text-sm text-muted-foreground">{estimate.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(estimate.total)}</p>
                          <Badge
                            variant={estimate.status === "accepted" ? "default" : "secondary"}
                          >
                            {estimate.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Files</CardTitle>
                <CardDescription>Documents and attachments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-3">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No files attached to this project yet.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/documents")}>
                    <Plus className="h-4 w-4 mr-1" /> Manage Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone. All associated tasks, invoices, and estimates will be marked as deleted."
        itemName={plainProject?.name}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
        isDangerous={true}
      />
    </ModuleLayout>
  );
}

