import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/utils/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ticket,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Eye,
  Loader2,
  MessageCircle,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";
import { useUserLookup } from "@/hooks/useUserLookup";
import { Checkbox } from "@/components/ui/checkbox";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";

export default function Tickets() {
  const { getUserName } = useUserLookup();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());

  const ticketColumns: ColumnConfig[] = [
    { key: "title", label: "Title" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "createdBy", label: "Created By" },
    { key: "createdDate", label: "Created Date" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(ticketColumns, "tickets");

  // Queries
  const { data: tickets = [], isLoading } = trpc.tickets.list.useQuery({});
  const { data: ticketDetail } = trpc.tickets.getById.useQuery(selectedTicket || "", {
    enabled: !!selectedTicket,
  });

  // Mutations
  const createTicket = trpc.tickets.create.useMutation({
    onSuccess: () => {
      toast.success("Ticket created successfully");
      setShowCreateDialog(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => {
      toast.success("Ticket updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteTicket = trpc.tickets.delete.useMutation({
    onSuccess: () => {
      toast.success("Ticket deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const filteredTickets = useMemo(() => {
    return (tickets || []).filter((ticket) => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ticket.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const stats = {
    new: tickets?.filter((t) => t.status === "new").length || 0,
    open: tickets?.filter((t) => t.status === "open").length || 0,
    inProgress: tickets?.filter((t) => t.status === "in_progress").length || 0,
    completed: tickets?.filter((t) => t.status === "completed").length || 0,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case "open":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-purple-600" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "closed":
        return <CheckCircle2 className="h-4 w-4 text-slate-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "open":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-slate-100 text-slate-800";
      default:
        return "";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "";
    }
  };

  return (
    <ModuleLayout
      title="Support Tickets"
      description="Create and manage support tickets"
      icon={<Ticket className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Support & Ticketing" },
      ]}
      actions={
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Ticket
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="New" value={stats.new} description="Not started" color="border-l-orange-500" />

          <StatsCard label="Open" value={stats.open} description="Awaiting action" color="border-l-purple-500" />

          <StatsCard label="In Progress" value={stats.inProgress} description="Being worked on" color="border-l-green-500" />

          <StatsCard label="Completed" value={stats.completed} description="Done" color="border-l-blue-500" />
        </div>

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search tickets..."
          onCreateClick={() => setShowCreateDialog(true)}
          createLabel="New Ticket"
          onPrintClick={() => window.print()}
          filterContent={
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />

        {/* Bulk Actions */}
        <EnhancedBulkActions
          selectedCount={selectedTickets.size}
          onClear={() => setSelectedTickets(new Set())}
          actions={[
            { id: "close", label: "Close Tickets", icon: <CheckCircle2 className="h-3.5 w-3.5" />, confirm: true, confirmMessage: `Close ${selectedTickets.size} selected ticket(s)?`, onClick: () => { selectedTickets.forEach((id) => updateTicket.mutate({ id, status: "closed" })); setSelectedTickets(new Set()); } },
            bulkExportAction(selectedTickets, tickets, ticketColumns, "tickets"),
            bulkCopyIdsAction(selectedTickets),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedTickets, (ids) => { ids.forEach((id) => deleteTicket.mutate(id)); setSelectedTickets(new Set()); }),
          ]}
        />

        {/* Main Content */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}</span>
              <TableColumnSettings columns={ticketColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No tickets found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedTickets.size === filteredTickets.length && filteredTickets.length > 0} onCheckedChange={() => { if (selectedTickets.size === filteredTickets.length) setSelectedTickets(new Set()); else setSelectedTickets(new Set(filteredTickets.map((t: any) => t.id))); }} /></TableHead>
                      {isVisible("title") && <TableHead>Title</TableHead>}
                      {isVisible("priority") && <TableHead>Priority</TableHead>}
                      {isVisible("status") && <TableHead>Status</TableHead>}
                      {isVisible("createdBy") && <TableHead className="hidden md:table-cell">Created By</TableHead>}
                      {isVisible("createdDate") && <TableHead className="hidden md:table-cell">Created Date</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} className={selectedTickets.has(ticket.id) ? "bg-primary/5" : ""}>
                        <TableCell><Checkbox checked={selectedTickets.has(ticket.id)} onCheckedChange={() => { const next = new Set(selectedTickets); if (next.has(ticket.id)) next.delete(ticket.id); else next.add(ticket.id); setSelectedTickets(next); }} /></TableCell>
                        {isVisible("title") && <TableCell className="font-medium">{ticket.title}</TableCell>}
                        {isVisible("priority") && <TableCell>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {(ticket.priority || "medium").charAt(0).toUpperCase() + (ticket.priority || "medium").slice(1)}
                          </Badge>
                        </TableCell>}
                        {isVisible("status") && <TableCell>
                          <Badge className={getStatusColor(ticket.status)} variant="outline">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(ticket.status)}
                              {(ticket.status || "new").replace("_", " ").charAt(0).toUpperCase() + (ticket.status || "new").replace("_", " ").slice(1)}
                            </div>
                          </Badge>
                        </TableCell>}
                        {isVisible("createdBy") && <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{getUserName(ticket.createdBy)}</TableCell>}
                        {isVisible("createdDate") && <TableCell className="hidden md:table-cell text-sm">{new Date(ticket.createdAt || "").toLocaleDateString()}</TableCell>}
                        <TableCell className="text-right">
                          <RowActionsMenu
                            primaryActions={[
                              { label: "View", icon: actionIcons.view, onClick: () => setSelectedTicket(ticket.id) },
                            ]}
                            menuActions={[
                              { label: "Edit Ticket", icon: <Edit className="h-4 w-4" />, onClick: () => navigate(`/tickets/${ticket.id}/edit`) },
                              { label: "Duplicate", icon: <Copy className="h-4 w-4" />, onClick: () => navigate(`/tickets/create?clone=${ticket.id}`), separator: true },
                              { label: "Delete", icon: <Trash2 className="h-4 w-4" />, onClick: () => { if (confirm("Delete this ticket?")) deleteTicket.mutate(ticket.id); }, variant: "destructive" },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Ticket Dialog */}
        <CreateTicketDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
          }}
        />

        {/* Ticket Detail Dialog */}
        {selectedTicket && ticketDetail && (
          <TicketDetailDialog
            ticket={ticketDetail}
            open={!!selectedTicket}
            onOpenChange={(open) => {
              if (!open) setSelectedTicket(null);
            }}
          />
        )}
      </div>
    </ModuleLayout>
  );
}

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function CreateTicketDialog({ open, onOpenChange, onSuccess }: CreateTicketDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [area, setArea] = useState("");
  const [clientId, setClientId] = useState("");

  const TICKET_AREAS = [
    { value: "finance", label: "Finance & Accounting" },
    { value: "hr", label: "Human Resources" },
    { value: "it", label: "IT Support & Systems" },
    { value: "operations", label: "Operations & Logistics" },
    { value: "sales", label: "Sales & Business Development" },
    { value: "procurement", label: "Procurement & Suppliers" },
    { value: "customer_service", label: "Customer Service" },
    { value: "administration", label: "Administration & General" },
    { value: "projects", label: "Projects & Timelines" },
    { value: "other", label: "Other" },
  ];

  const createTicket = trpc.tickets.create.useMutation({
    onSuccess: () => {
      toast.success("Ticket created successfully");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setArea("");
      setClientId("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!area) {
      toast.error("Please select an area");
      return;
    }
    await createTicket.mutateAsync({
      clientId: clientId || "default",
      title,
      description: description || undefined,
      priority: priority as any,
      category: area,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Support Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of your issue"
                required
              />
            </div>
            
            <div className="col-span-2">
              <label className="text-sm font-medium">Area of Concern *</label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the area you need help with" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_AREAS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information about your issue, including what you've already tried"
                className="min-h-32 border rounded-lg p-3 w-full text-sm resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Can wait</SelectItem>
                  <SelectItem value="medium">Medium - Soon</SelectItem>
                  <SelectItem value="high">High - Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TicketDetailDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TicketDetailDialog({ ticket, open, onOpenChange }: TicketDetailDialogProps) {
  const [status, setStatus] = useState(ticket.status || "new");
  const [priority, setPriority] = useState(ticket.priority || "medium");

  const updateTicket = trpc.tickets.update.useMutation({
    onSuccess: () => {
      toast.success("Ticket updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = async () => {
    await updateTicket.mutateAsync({
      id: ticket.id,
      status,
      priority: priority as any,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ticket Details: {ticket.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <p className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
              {ticket.description || "No description provided"}
            </p>
          </div>

          {ticket.comments && ticket.comments.length > 0 && (
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Comments ({ticket.comments.length})
              </label>
              <div className="space-y-2 mt-2">
                {ticket.comments.map((comment: any) => (
                  <div key={comment.id} className="bg-slate-50 p-3 rounded-lg text-sm">
                    <p className="font-medium">{comment.authorId}</p>
                    <p className="text-muted-foreground">{comment.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" disabled={updateTicket.isPending} onClick={handleSave}>
              {updateTicket.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
