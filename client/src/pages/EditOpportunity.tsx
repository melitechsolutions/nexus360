import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TrendingUp, ArrowLeft, Trash2, Loader2, Save } from "lucide-react";

export default function EditOpportunity() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const opportunityId = params.id;
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    value: "",
    stage: "prospecting",
    probability: "",
    expectedCloseDate: "",
    source: "",
    notes: "",
  });

  // Fetch opportunity data
  const { data: opportunity, isLoading } = trpc.opportunities.getById.useQuery(opportunityId || "", {
    enabled: !!opportunityId,
  });

  const { data: clients = [] } = trpc.clients.list.useQuery();

  // Populate form when opportunity data loads
  useEffect(() => {
    if (opportunity) {
      setFormData({
        clientId: opportunity.clientId || "",
        title: opportunity.title || "",
        description: opportunity.description || "",
        value: opportunity.value ? (opportunity.value / 100).toString() : "",
        stage: opportunity.stage || "prospecting",
        probability: opportunity.probability ? opportunity.probability.toString() : "",
        expectedCloseDate: opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate).toISOString().split("T")[0] : "",
        source: opportunity.source || "",
        notes: opportunity.notes || "",
      });
    }
  }, [opportunity]);

  const updateOpportunityMutation = trpc.opportunities.update.useMutation({
    onSuccess: () => {
      toast.success("Opportunity updated successfully!");
      utils.opportunities.list.invalidate();
      utils.opportunities.getById.invalidate(opportunityId || "");
      navigate("/opportunities");
    },
    onError: (error: any) => {
      toast.error(`Failed to update opportunity: ${error.message}`);
    },
  });

  const deleteOpportunityMutation = trpc.opportunities.delete.useMutation({
    onSuccess: () => {
      toast.success("Opportunity deleted successfully!");
      utils.opportunities.list.invalidate();
      navigate("/opportunities");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete opportunity: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.title || !formData.value) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!opportunityId) {
      toast.error("Opportunity ID is missing");
      return;
    }

    updateOpportunityMutation.mutate({
      id: opportunityId,
      clientId: formData.clientId,
      title: formData.title,
      description: formData.description || undefined,
      value: Math.round(parseFloat(formData.value) * 100),
      stage: formData.stage as any,
      probability: formData.probability ? parseInt(formData.probability) : undefined,
      expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toISOString().split("T")[0] : undefined,
      source: formData.source || undefined,
      notes: formData.notes || undefined,
    } as any);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this opportunity? This action cannot be undone.")) {
      deleteOpportunityMutation.mutate(opportunityId || "");
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit Opportunity"
        description="Loading opportunity details..."
        icon={<TrendingUp className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Sales", href: "/sales" },
          { label: "Opportunities", href: "/opportunities" },
          { label: "Edit Opportunity" },
        ]}
      >
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Opportunity"
      description="Update opportunity details"
      icon={<TrendingUp className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Sales", href: "/sales" },
        { label: "Opportunities", href: "/opportunities" },
        { label: "Edit Opportunity" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Opportunity</CardTitle>
            <CardDescription>
              Update the opportunity details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client *</Label>
                  <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.companyName || client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Opportunity Name *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Website Redesign Project"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(v) => setFormData({ ...formData, description: v })}
                  placeholder="Enter opportunity description"
                  minHeight="120px"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="value">Opportunity Value (Ksh) *</Label>
                  <Input
                    id="value"
                    type="number"
                    placeholder="0.00"
                    value={formData.value}
                    onChange={(e) =>
                      setFormData({ ...formData, value: e.target.value })
                    }
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    placeholder="0"
                    value={formData.probability}
                    onChange={(e) =>
                      setFormData({ ...formData, probability: e.target.value })
                    }
                    min="0"
                    max="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                  <Input
                    id="expectedCloseDate"
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedCloseDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospecting">Prospecting</SelectItem>
                      <SelectItem value="qualification">Qualification</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="closed_won">Closed Won</SelectItem>
                      <SelectItem value="closed_lost">Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="e.g., Referral, Website"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <RichTextEditor
                  value={formData.notes}
                  onChange={(v) => setFormData({ ...formData, notes: v })}
                  placeholder="Enter any additional notes"
                  minHeight="100px"
                />
              </div>

              <div className="flex gap-4 justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteOpportunityMutation.isPending}
                >
                  {deleteOpportunityMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete Opportunity
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/opportunities")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateOpportunityMutation.isPending}
                  >
                    {updateOpportunityMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Update Opportunity
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
