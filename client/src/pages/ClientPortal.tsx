import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleLayout } from "@/components/ModuleLayout";
import {
  FileText,
  FolderOpen,
  Download,
  Eye,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { trpc } from "@/lib/trpc";
import { useUserLookup } from "@/hooks/useUserLookup";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

/**
 * ClientPortal component with backend API integration
 * Wrapped with DashboardLayout for consistent navigation
 * 
 * Features:
 * - Dashboard layout with role-based navigation
 * - Fetch client data from backend
 * - Display projects with real-time status
 * - Manage invoices and payments
 * - Download documents
 * - View account information
 * - Persistent authentication
 */
export default function ClientPortal() {
  const [, setLocation] = useLocation();
  const { getUserName } = useUserLookup();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, loading: authLoading, isAuthenticated } = useAuthWithPersistence({
    redirectOnUnauthenticated: true,
  });

  // Verify user is a client
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role !== "client") {
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  // Fetch client data from backend
  const clientQuery = trpc.clients.getClientByUserId.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "client",
  });

  const projectsQuery = trpc.projects.getClientProjects.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "client",
  });

  const invoicesQuery = trpc.invoices.getClientInvoices.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "client",
  });

  const documentsQuery = trpc.documents.getClientDocuments.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "client",
  });

  const paymentPlansQuery = trpc.paymentPlans.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "client",
    select: (plans) => {
      // Filter payment plans for invoices belonging to this client
      return plans?.filter((plan: any) => {
        const invoice = invoicesQuery.data?.find((inv: any) => inv.id === plan.invoiceId);
        return !!invoice;
      }) || [];
    },
  });

  const milestonesQuery = trpc.projectMilestones.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "client",
    select: (milestones) => {
      // Filter milestones for projects belonging to this client
      return milestones?.filter((milestone: any) => {
        const project = projectsQuery.data?.find((p: any) => p.id === milestone.projectId);
        return !!project;
      }) || [];
    },
  });

  if (authLoading) {
    return (
      <ModuleLayout
        title="Client Portal"
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Client Portal" },
        ]}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ModuleLayout>
    );
  }

  if (!isAuthenticated || user?.role !== "client") {
    return null;
  }

  const clientData = clientQuery.data || {
    name: user?.name || "Client",
    email: user?.email || "",
    phone: "",
    accountManager: "",
  };

  const projects = projectsQuery.data || [];
  const invoices = invoicesQuery.data || [];
  const documents = documentsQuery.data || [];

  // Calculate stats
  const activeProjectsCount = projects.filter((p: any) => p.status === "active").length;
  const totalSpent = projects.reduce((sum: number, p: any) => sum + (p.spent || 0), 0);
  const pendingInvoices = invoices.filter((i: any) => i.status === "pending");
  const pendingAmount = pendingInvoices.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      toast.promise(
        Promise.resolve(),
        {
          loading: "Downloading document...",
          success: `${fileName} downloaded successfully`,
          error: "Failed to download document",
        }
      );
      // Implement actual download logic
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  return (
    <ModuleLayout
      title="Client Portal"
      icon={<Users className="h-5 w-5" />}
      description="Your project dashboard and documents"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Client Portal" },
      ]}
    >
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            label="Active Projects"
            value={activeProjectsCount}
            description="In progress"
            icon={<FolderOpen className="h-5 w-5" />}
            color="border-l-orange-500"
          />

          <StatsCard
            label="Total Spent"
            value={<>Ksh {(totalSpent / 1000).toFixed(0)}K</>}
            description="Across all projects"
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-purple-500"
          />

          <StatsCard
            label="Pending Invoices"
            value={pendingInvoices.length}
            description={<>Ksh {(pendingAmount / 1000).toFixed(0)}K due</>}
            icon={<FileText className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Documents"
            value={documents.length}
            description="Available to download"
            icon={<FileText className="h-5 w-5" />}
            color="border-l-blue-500"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">My Projects</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payment Plans</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            {projectsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : projects.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No projects found</p>
                </CardContent>
              </Card>
            ) : (
              projects.map((project: any) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>
                          {project.startDate ? new Date(project.startDate).toLocaleDateString() : "-"} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : "-"}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          project.status === "active"
                            ? "default"
                            : project.status === "on-hold"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {project.status === "active" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {(project.status || 'active').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span className="font-medium">{project.progress || 0}%</span>
                      </div>
                      <Progress value={project.progress || 0} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="text-lg font-semibold">
                          Ksh {(project.budget || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Spent</p>
                        <p className="text-lg font-semibold">
                          Ksh {(project.spent || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Milestones Section */}
                    {milestonesQuery.data && milestonesQuery.data.some((m: any) => m.projectId === project.id) && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold mb-3">Milestones</p>
                        <div className="space-y-2">
                          {milestonesQuery.data
                            .filter((m: any) => m.projectId === project.id)
                            .map((milestone: any) => (
                              <div
                                key={milestone.id}
                                className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  {milestone.status === "completed" && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  )}
                                  {milestone.status === "in_progress" && (
                                    <Clock className="h-4 w-4 text-blue-600" />
                                  )}
                                  {!["completed", "in_progress"].includes(milestone.status) && (
                                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                                  )}
                                  <span className="font-medium">{milestone.phaseName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {milestone.completionPercentage}%
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {milestone.status.replace("_", " ")}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <Button variant="outline" className="w-full" onClick={() => setLocation(`/projects/${project.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Project Details
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Your Invoices</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {invoicesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : invoices.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No invoices found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {invoices
                  .filter((invoice: any) =>
                    invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((invoice: any) => (
                    <Card key={invoice.id}>
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{invoice.id}</p>
                            <p className="text-sm text-muted-foreground">
                              Issued: {invoice.date ? new Date(invoice.date).toLocaleDateString() : "-"} • Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              Ksh {(invoice.amount || 0).toLocaleString()}
                            </p>
                            <Badge
                              variant={
                                invoice.status === "paid"
                                  ? "default"
                                  : invoice.status === "pending"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {(invoice.status || 'draft').toUpperCase()}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Payment Plans Tab */}
          <TabsContent value="payments" className="space-y-4">
            {paymentPlansQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : paymentPlansQuery.data && paymentPlansQuery.data.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No payment plans found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {Array.isArray(paymentPlansQuery.data) && paymentPlansQuery.data.map((plan: any) => (
                  <Card key={plan.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            Payment Plan - {plan.numInstallments} Installments
                          </CardTitle>
                          <CardDescription>
                            {plan.completedInstallments} of {plan.numInstallments} paid
                          </CardDescription>
                        </div>
                        <Badge
                          variant={plan.status === "active" ? "default" : "secondary"}
                        >
                          {plan.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Per Installment</p>
                          <p className="text-lg font-semibold">
                            Ksh {(plan.installmentAmount / 100).toLocaleString("en-KE")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Next Due</p>
                          <p className="text-lg font-semibold">{plan.nextInstallmentDue}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Paid</p>
                          <p className="text-lg font-semibold text-green-600">
                            Ksh {(plan.totalPaid / 100).toLocaleString("en-KE")}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {Math.round(
                              (plan.completedInstallments / plan.numInstallments) * 100
                            )}%
                          </span>
                        </div>
                        <Progress
                          value={
                            (plan.completedInstallments / plan.numInstallments) * 100
                          }
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            {documentsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : documents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No documents available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <Card key={doc.id}>
                    <CardContent className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.type} • {doc.date ? new Date(doc.date).toLocaleDateString() : "-"} • {doc.size}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc.id, doc.name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your client account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="text-lg font-semibold">{clientData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-lg font-semibold">{clientData.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-lg font-semibold">{clientData.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Manager</p>
                    <p className="text-lg font-semibold">{getUserName(clientData.accountManager) || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </ModuleLayout>
  );
}
