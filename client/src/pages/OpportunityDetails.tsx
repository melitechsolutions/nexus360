import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ChevronRight, DollarSign, Percent, CalendarDays, User, Globe, Target } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ModuleLayout } from "@/components/ModuleLayout";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import mutateAsync from '@/lib/mutationHelpers';
import { RichTextDisplay } from "@/components/RichTextEditor";

export default function OpportunityDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: opportunityData, isLoading } = trpc.opportunities.getById.useQuery(id || "");
  const utils = trpc.useUtils();

  const deleteOpportunityMutation = trpc.opportunities.delete.useMutation({
    onSuccess: () => {
      toast.success("Opportunity deleted successfully");
      utils.opportunities.list.invalidate();
      navigate("/opportunities");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete opportunity");
    },
  });

  const opportunity = opportunityData ? {
    id: opportunityData.id || id || "1",
    name: (opportunityData as any).name || "Unknown Opportunity",
    client: (opportunityData as any).clientId || "Unknown Client",
    value: ((opportunityData as any).value || 0) / 100,
    stage: (opportunityData as any).stage || "prospecting",
    probability: (opportunityData as any).probability || 0,
    expectedClose: (opportunityData as any).expectedCloseDate ? new Date((opportunityData as any).expectedCloseDate).toISOString().split('T')[0] : "",
    status: (opportunityData as any).status || "active",
    owner: (opportunityData as any).owner || "",
    source: (opportunityData as any).source || "",
    notes: (opportunityData as any).notes || "",
  } : null;

  const handleEdit = () => {
    navigate(`/opportunities/${id}/edit`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteOpportunityMutation, id || "");
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      prospecting: "Prospecting",
      qualification: "Qualification",
      proposal: "Proposal",
      negotiation: "Negotiation",
      closed_won: "Closed Won",
      closed_lost: "Closed Lost",
    };
    return labels[stage] || stage;
  };

  const getStageBadgeVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (stage) {
      case "closed_won": return "default";
      case "closed_lost": return "destructive";
      case "negotiation": return "secondary";
      default: return "outline";
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "prospecting": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "qualification": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "proposal": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "negotiation": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "closed_won": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "closed_lost": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "";
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout title="Opportunity Details" icon={<Target className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Opportunities", href: "/opportunities"}, {label: "Details"}]} backLink={{label: "Opportunities", href: "/opportunities"}}>
        <div className="flex items-center justify-center h-64">
          <p>Loading opportunity...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!opportunity) {
    return (
      <ModuleLayout title="Opportunity Details" icon={<Target className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Opportunities", href: "/opportunities"}, {label: "Details"}]} backLink={{label: "Opportunities", href: "/opportunities"}}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Opportunity not found</p>
          <Button onClick={() => navigate("/opportunities")}>Back to Opportunities</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title="Opportunity Details" icon={<Target className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Opportunities", href: "/opportunities"}, {label: "Details"}]} backLink={{label: "Opportunities", href: "/opportunities"}}>
      <div className="space-y-6">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>

        {/* Split layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <h2 className="text-xl font-semibold">{opportunity.name}</h2>
                  <Badge className={getStageColor(opportunity.stage)}>
                    {getStageLabel(opportunity.stage)}
                  </Badge>
                </div>

                <Separator className="my-5" />

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Value / Amount</p>
                      <p className="text-sm font-medium">Ksh {(opportunity.value || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Percent className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Probability</p>
                      <p className="text-sm font-medium">{opportunity.probability}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Close Date</p>
                      <p className="text-sm font-medium">{opportunity.expectedClose || "Not set"}</p>
                    </div>
                  </div>

                  {opportunity.owner && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Owner</p>
                        <p className="text-sm font-medium">{opportunity.owner}</p>
                      </div>
                    </div>
                  )}

                  {opportunity.source && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Source</p>
                        <p className="text-sm font-medium">{opportunity.source}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader>
                <CardTitle>Description & Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {opportunity.notes ? (
                  <RichTextDisplay html={opportunity.notes} className="text-sm text-muted-foreground" />
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Opportunity"
        description="Are you sure you want to delete this opportunity? This action cannot be undone."
      />
    </ModuleLayout>
  );
}
