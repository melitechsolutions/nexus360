import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Edit,
  Loader2,
  Ticket,
  MessageSquare,
  CheckSquare,
  Calendar,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/currency";

const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  normal: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
  reopened: "bg-orange-100 text-orange-700",
};

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function fmtDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { format } = useCurrency();

  const { data, isLoading } = trpc.tickets.getById.useQuery(id || "");

  if (isLoading) {
    return (
      <ModuleLayout
        title="Ticket"
        icon={<Ticket className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Tickets", href: "/tickets" },
          { label: "Loading..." },
        ]}
        backLink={{ label: "Tickets", href: "/tickets" }}
      >
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!data) {
    return (
      <ModuleLayout
        title="Ticket Not Found"
        icon={<Ticket className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Tickets", href: "/tickets" },
          { label: "Not Found" },
        ]}
        backLink={{ label: "Tickets", href: "/tickets" }}
      >
        <div className="text-center py-16 text-muted-foreground">
          Ticket not found or you don't have permission to view it.
        </div>
      </ModuleLayout>
    );
  }

  const ticket = data as any;
  const comments: any[] = Array.isArray(ticket.comments) ? ticket.comments : [];
  const tasks: any[] = Array.isArray(ticket.tasks) ? ticket.tasks : [];
  const ticketLabel = ticket.ticketNumber || ticket.title || "Ticket";

  return (
    <ModuleLayout
      title={ticketLabel}
      icon={<Ticket className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Tickets", href: "/tickets" },
        { label: ticketLabel },
      ]}
      backLink={{ label: "Tickets", href: "/tickets" }}
      actions={
        <Button
          onClick={() => navigate(`/tickets/${id}/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit
        </Button>
      }
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                {ticket.ticketNumber && (
                  <p className="text-xs text-muted-foreground mb-1">{ticket.ticketNumber}</p>
                )}
                <CardTitle className="text-xl">{ticket.title}</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={priorityColors[ticket.priority] || "bg-gray-100 text-gray-700"}>
                  {(ticket.priority || "normal").charAt(0).toUpperCase() +
                    (ticket.priority || "normal").slice(1)}
                </Badge>
                <Badge className={statusColors[ticket.status] || "bg-gray-100 text-gray-700"}>
                  {(ticket.status || "open").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </Badge>
              </div>
            </div>
          </CardHeader>
          {ticket.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ticket.category && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium capitalize">{ticket.category.replace(/_/g, " ")}</span>
                </div>
              )}
              {ticket.department && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span>{ticket.department}</span>
                </div>
              )}
              {ticket.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span>{ticket.assignedTo}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{fmtDateTime(ticket.createdAt)}</span>
              </div>
              {ticket.requestedDueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span>{fmt(ticket.requestedDueDate)}</span>
                </div>
              )}
              {ticket.firstResponseAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First Response</span>
                  <span>{fmtDateTime(ticket.firstResponseAt)}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved</span>
                  <span>{fmtDateTime(ticket.resolvedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resolution */}
        {ticket.resolution && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.resolution}</p>
              {ticket.solutionUrl && (
                <a
                  href={ticket.solutionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 block"
                >
                  {ticket.solutionUrl}
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                Tasks ({tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((task: any) => (
                <div key={task.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{task.serviceType}</span>
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">{fmt(task.dueDate)}</span>
                    )}
                  </div>
                  {task.details && (
                    <p className="text-sm text-muted-foreground">{task.details}</p>
                  )}
                  {task.budget != null && (
                    <p className="text-xs text-muted-foreground">Budget: {format(task.budget)}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        {comments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.map((comment: any, i: number) => (
                <div key={comment.id || i}>
                  {i > 0 && <Separator className="my-3" />}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {comment.authorId || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
