import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Clock,
  Calendar,
  User,
  DollarSign,
  Edit,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/currency";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  invoiced: "bg-purple-100 text-purple-700",
  rejected: "bg-red-100 text-red-700",
};

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function formatDuration(minutes: number): string {
  if (!minutes) return "0h 0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TimesheetDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { format } = useCurrency();

  const { data: entry, isLoading } = trpc.timeEntries.getById.useQuery(id || "");

  if (isLoading) {
    return (
      <ModuleLayout
        title="Time Entry"
        icon={<Clock className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Timesheets", href: "/timesheets" },
          { label: "Loading..." },
        ]}
        backLink="/timesheets"
      >
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!entry) {
    return (
      <ModuleLayout
        title="Time Entry Not Found"
        icon={<Clock className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Timesheets", href: "/timesheets" },
          { label: "Not Found" },
        ]}
        backLink="/timesheets"
      >
        <div className="text-center py-16 text-muted-foreground">
          Time entry not found or you don't have permission to view it.
        </div>
      </ModuleLayout>
    );
  }

  const e = entry as any;
  const isBillable = e.billable === true || e.billable === 1;

  return (
    <ModuleLayout
      title={fmt(e.entryDate)}
      icon={<Clock className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Timesheets", href: "/timesheets" },
        { label: fmt(e.entryDate) },
      ]}
      backLink="/timesheets"
    >
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl">{e.description}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={statusColors[e.status] || "bg-gray-100 text-gray-700"}>
                  {(e.status || "draft").charAt(0).toUpperCase() +
                    (e.status || "draft").slice(1)}
                </Badge>
                {isBillable && (
                  <Badge className="bg-green-100 text-green-700">Billable</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time & Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry Date</span>
                <span>{fmt(e.entryDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{formatDuration(e.durationMinutes)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project</span>
                <span>{e.projectId || "—"}</span>
              </div>
              {e.projectTaskId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task</span>
                  <span>{e.projectTaskId}</span>
                </div>
              )}
              {e.approvedBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved By</span>
                  <span>{e.approvedBy}</span>
                </div>
              )}
              {e.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved At</span>
                  <span>{fmt(e.approvedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Billing */}
        {isBillable && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {e.hourlyRate != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hourly Rate</span>
                  <span>{format(e.hourlyRate)}</span>
                </div>
              )}
              {e.amount != null && e.amount > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Amount</span>
                  <span>{format(e.amount)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {e.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{e.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
