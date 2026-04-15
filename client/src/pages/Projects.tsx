import { useState } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { type ProjectFilters } from "@/components/SearchAndFilter";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  ExternalLink,
  Copy,
  Users,
  FileText,
  Receipt,
  Download,
} from "lucide-react";
import { PaginationControls, usePagination } from "@/components/ui/data-table-controls";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { SummaryStatCards, type SummaryCard } from "@/components/list-page/SummaryStatCards";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";

const COLUMNS: ColumnConfig[] = [
  { key: "id", label: "ID", defaultVisible: true },
  { key: "title", label: "Title", defaultVisible: true },
  { key: "client", label: "Client", defaultVisible: true },
  { key: "startDate", label: "Start Date", defaultVisible: true },
  { key: "dueDate", label: "Due Date", defaultVisible: true },
  { key: "tags", label: "Tags", defaultVisible: true },
  { key: "progress", label: "Progress", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "priority", label: "Priority", defaultVisible: false },
  { key: "budget", label: "Budget", defaultVisible: false },
  { key: "manager", label: "Manager", defaultVisible: false },
  { key: "teamSize", label: "Team Size", defaultVisible: false },
];

export default function Projects() {
  const { allowed, isLoading } = useRequireFeature("projects:view");
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ProjectFilters>({
    status: "all",
    priority: "all",
    sortBy: "date",
    sortOrder: "desc",
  });
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const { page, pageSize, setPage, setPageSize, paginate } = usePagination(25);
  const { visibleColumns, toggleColumn, isVisible, pageSize: colPageSize, updatePageSize, reset } = useColumnVisibility(COLUMNS, "projects");
  
  // always initialize queries to maintain hook order
  const { data: projects = [], isLoading: isLoadingProjects } = trpc.projects.list.useQuery(undefined, { enabled: allowed });
  const utils = trpc.useUtils();
  
  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted successfully");
      utils.projects.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });
  
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planning":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Planning</Badge>;
      case "active":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case "on_hold":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">On Hold</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Low</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Medium</Badge>;
      case "high":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">High</Badge>;
      case "urgent":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Urgent</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const filteredProjects = projects
    .filter(
      (project) =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.projectNumber.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: any = a[filters.sortBy as keyof typeof a];
      let bVal: any = b[filters.sortBy as keyof typeof b];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

  const pagedProjects = paginate(filteredProjects);

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete project "${projectName}"?`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  return (
    <ModuleLayout
      title="Projects"
      icon={<Briefcase className="w-6 h-6" />}
      breadcrumbs={[
        { label: "App", href: "/crm-home" },
        { label: "Projects", href: "/projects" },
      ]}
      actions={
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search projects..."
          onCreateClick={() => navigate("/projects/create")}
          createLabel="New Project"
        />
      }
    >
      <div className="space-y-6">
        {/* Summary Stat Cards */}
        <SummaryStatCards
          cards={[
            {
              label: "All Projects",
              value: projects.length,
              color: "blue",
              progress: 100,
            },
            {
              label: "In Progress",
              value: projects.filter((p) => p.status === "active").length,
              color: "green",
              progress: projects.length ? (projects.filter((p) => p.status === "active").length / projects.length) * 100 : 0,
            },
            {
              label: "On Hold",
              value: projects.filter((p) => p.status === "on_hold").length,
              color: "orange",
              progress: projects.length ? (projects.filter((p) => p.status === "on_hold").length / projects.length) * 100 : 0,
            },
            {
              label: "Completed",
              value: projects.filter((p) => p.status === "completed").length,
              color: "green",
              progress: projects.length ? (projects.filter((p) => p.status === "completed").length / projects.length) * 100 : 0,
            },
          ] satisfies SummaryCard[]}
        />

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0 space-y-0">
            {/* Bulk actions bar */}
            <EnhancedBulkActions
              selectedCount={selectedProjects.size}
              onClear={() => setSelectedProjects(new Set())}
              actions={[
                bulkExportAction(selectedProjects, projects, COLUMNS, "projects"),
                bulkCopyIdsAction(selectedProjects),
                bulkEmailAction(navigate),
                bulkDeleteAction(selectedProjects, (ids) => { ids.forEach((id) => deleteProjectMutation.mutate(id)); setSelectedProjects(new Set()); }),
              ]}
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Project #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Priority</TableHead>
                  <TableHead className="hidden md:table-cell">Progress</TableHead>
                  <TableHead className="hidden lg:table-cell">End Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProjects ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading projects...
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No projects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedProjects.map((project) => (
                    <TableRow key={project.id} className={selectedProjects.has(project.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProjects.has(project.id)}
                          onChange={() => {
                            const next = new Set(selectedProjects);
                            if (next.has(project.id)) next.delete(project.id);
                            else next.add(project.id);
                            setSelectedProjects(next);
                          }}
                          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{project.projectNumber}</TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{getStatusBadge(project.status || "planning")}</TableCell>
                      <TableCell className="hidden md:table-cell">{getPriorityBadge(project.priority || "medium")}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-full h-2 max-w-[100px]">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${project.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{project.progress || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : "Not set"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/projects/${project.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteProject(project.id, project.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationControls
              total={filteredProjects.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              className="px-2"
            />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
