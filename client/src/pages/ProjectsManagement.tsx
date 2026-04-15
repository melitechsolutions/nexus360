import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/_core/hooks/usePermissions";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  BarChart3,
} from "lucide-react";

/**
 * Projects Management Page
 * Provides comprehensive project management with role-based access control
 * Filters visible items and actions based on user permissions
 */
export default function ProjectsManagement() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions(user?.id);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch projects from backend
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();

  // Delete mutation
  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted successfully");
      utils.projects.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  // Filter projects based on what user can see
  const visibleProjects = useMemo(() => {
    return (projects || []).filter((project: any) => {
      // Super admin and admin can see all
      if (["super_admin", "admin"].includes(user?.role || "")) return true;
      
      // Project managers can see assigned projects
      if (user?.role === "project_manager") {
        return project.projectManagerId === user?.id || project.teamMembers?.includes(user?.id);
      }
      
      // Staff can see projects they're assigned to
      if (user?.role === "staff") {
        return project.teamMembers?.includes(user?.id);
      }
      
      return false;
    });
  }, [projects, user]);

  // Filter by search query
  const filteredProjects = useMemo(() => {
    return visibleProjects.filter((project: any) =>
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [visibleProjects, searchQuery]);

  // Management sections show different capabilities
  const managementSections = useMemo(() => {
    const sections = [];

    // Staff Management (for admins and super admins)
    if (["super_admin", "admin"].includes(user?.role || "")) {
      sections.push({
        title: "Team Management",
        description: "Manage project teams and assignments",
        icon: Users,
        href: "#",
        capability: "Can assign team members to projects",
      });
    }

    // Milestone Management
    if (hasPermission("projects_manage_milestones") || ["super_admin", "admin", "project_manager"].includes(user?.role || "")) {
      sections.push({
        title: "Project Milestones",
        description: "Track project milestones and deliverables",
        icon: CheckCircle2,
        href: "/project-milestones",
        capability: "Can create and track milestones",
      });
    }

    // Time Tracking
    if (hasPermission("projects_view_time_tracking") || !["client"].includes(user?.role || "")) {
      sections.push({
        title: "Time Tracking",
        description: "Monitor project time and resource allocation",
        icon: Clock,
        href: "/time-tracking",
        capability: "Can track team hours",
      });
    }

    // Analytics
    if (["super_admin", "admin", "project_manager"].includes(user?.role || "")) {
      sections.push({
        title: "Project Analytics",
        description: "View project performance metrics",
        icon: BarChart3,
        href: "#",
        capability: "Can view analytics",
      });
    }

    return sections;
  }, [user?.role, hasPermission]);

  const canCreate = hasPermission("projects_create") || ["super_admin", "admin", "project_manager"].includes(user?.role || "");
  const canEdit = hasPermission("projects_edit") || ["super_admin", "admin"].includes(user?.role || "");
  const canDelete = hasPermission("projects_delete") || ["super_admin"].includes(user?.role || "");

  return (
    <ModuleLayout
      title="Projects Management"
      icon={<Briefcase className="h-5 w-5" />}
      description="Manage and track all projects with role-based access control"
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Projects", href: "/projects" },
        { label: "Management" },
      ]}
    >
        {/* Management Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {managementSections.map((section) => (
            <Card key={section.title} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{section.description}</p>
                <p className="text-xs text-green-600 font-medium">{section.capability}</p>
                {section.href !== "#" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() => navigate(section.href)}
                  >
                    Manage
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {canCreate && (
              <Button onClick={() => navigate("/projects/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/projects")}>
              <Eye className="w-4 h-4 mr-2" />
              View All Projects
            </Button>
          </CardContent>
        </Card>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Projects ({filteredProjects.length})</CardTitle>
            <CardDescription>
              {canEdit && "Edit or delete projects as needed"}
              {!canEdit && "View-only access to projects"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search projects..."
                className="w-full px-3 py-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {visibleProjects.length === 0
                  ? "No projects available. You may not have access to any projects yet."
                  : "No projects match your search."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project: any) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-semibold">{project.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            project.status === "active"
                              ? "default"
                              : project.status === "completed"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            project.priority === "high"
                              ? "destructive"
                              : project.priority === "medium"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {project.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {project.endDate
                          ? new Date(project.endDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/projects/${project.id}/edit`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to delete this project?"
                                  )
                                ) {
                                  deleteProjectMutation.mutate(project.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </ModuleLayout>
  );
}
