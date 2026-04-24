import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Edit,
  Loader2,
  Target,
  User,
  Calendar,
  DollarSign,
  Percent,
} from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { useCurrency } from "@/lib/currency";

const stageColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700",
  qualified: "bg-cyan-100 text-cyan-700",
  proposal: "bg-yellow-100 text-yellow-700",
  negotiation: "bg-orange-100 text-orange-700",
  closed_won: "bg-green-100 text-green-700",
  closed_lost: "bg-red-100 text-red-700",
};

const stageLabels: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { format } = useCurrency();

  const { data: raw, isLoading } = trpc.opportunities.getById.useQuery(id || "");

  if (isLoading) {
    return (
      <ModuleLayout
        title="Lead"
        icon={<Target className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: "Loading..." },
        ]}
        backLink="/leads"
      >
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!raw) {
    return (
      <ModuleLayout
        title="Lead Not Found"
        icon={<Target className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: "Not Found" },
        ]}
        backLink="/leads"
      >
        <div className="text-center py-16 text-muted-foreground">
          Lead not found or you don't have permission to view it.
        </div>
      </ModuleLayout>
    );
  }

  const lead = raw as any;
  const stage = lead.stage || lead.status || "lead";

  return (
    <ModuleLayout
      title={lead.title || "Lead"}
      icon={<Target className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: lead.title || "Lead" },
      ]}
      backLink="/leads"
      actions={
        <Button
          onClick={() => navigate(`/opportunities/${id}/edit`)}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl">{lead.title}</CardTitle>
              <Badge className={stageColors[stage] || "bg-gray-100 text-gray-700"}>
                {stageLabels[stage] || stage.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          {lead.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Value & Probability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Value
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between font-semibold text-base">
                <span>Deal Value</span>
                <span>{format(lead.value ?? lead.amount ?? 0)}</span>
              </div>
              {lead.probability != null && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Percent className="h-3 w-3" /> Probability
                    </span>
                    <span>{lead.probability}%</span>
                  </div>
                </>
              )}
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
              {lead.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span>{lead.assignedTo}</span>
                </div>
              )}
              {lead.source && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="capitalize">{lead.source.replace(/_/g, " ")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{fmt(lead.createdAt)}</span>
            </div>
            {lead.expectedCloseDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Close</span>
                <span>{fmt(lead.expectedCloseDate)}</span>
              </div>
            )}
            {lead.actualCloseDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Close</span>
                <span>{fmt(lead.actualCloseDate)}</span>
              </div>
            )}
            {lead.stageMovedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage Updated</span>
                <span>{fmt(lead.stageMovedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Win/Loss Reason */}
        {(lead.winReason || lead.lossReason) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outcome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lead.winReason && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Win Reason</p>
                  <p className="text-muted-foreground">{lead.winReason}</p>
                </div>
              )}
              {lead.lossReason && (
                <div>
                  <p className="text-xs font-medium text-red-600 mb-1">Loss Reason</p>
                  <p className="text-muted-foreground">{lead.lossReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {lead.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
