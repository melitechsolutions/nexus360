import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FileText, ArrowLeft, Loader2, Users, DollarSign, Calendar, ClipboardList, Save, Target } from "lucide-react";

export default function EditProposal() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    proposalNumber: "",
    clientId: "",
    title: "",
    description: "",
    amount: "",
    validUntil: new Date().toISOString().split("T")[0],
    status: "draft",
    probability: 0,
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const { data: proposal } = trpc.opportunities.getById.useQuery(id || "", { enabled: !!id });
  const { data: clients = [] } = trpc.clients.list.useQuery();

  useEffect(() => {
    if (proposal) {
      setFormData({
        proposalNumber: proposal.proposalNumber || "",
        clientId: proposal.clientId || "",
        title: proposal.title || "",
        description: proposal.description || "",
        amount: proposal.amount ? (proposal.amount / 100).toString() : "",
        validUntil: proposal.validUntil
          ? new Date(proposal.validUntil).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: proposal.status || proposal.stage || "draft",
        probability: proposal.probability || 0,
        notes: proposal.notes || "",
      });
      setIsLoading(false);
    }
  }, [proposal]);

  const updateMutation = trpc.opportunities.update.useMutation({
    onSuccess: () => {
      toast.success("Opportunity updated successfully!");
      utils.opportunities.list.invalidate();
      utils.opportunities.getById.invalidate(id || "");
      navigate("/opportunities");
    },
    onError: (error: any) => toast.error(`Failed to update: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proposalNumber || !formData.clientId || !formData.title || !formData.amount) {
      toast.error("Please fill in all required fields"); return;
    }
    updateMutation.mutate({
      id: id || "",
      proposalNumber: formData.proposalNumber,
      clientId: formData.clientId,
      title: formData.title,
      description: formData.description || undefined,
      amount: Math.round(parseFloat(formData.amount) * 100),
      validUntil: new Date(formData.validUntil).toISOString().split("T")[0],
      status: formData.status as any,
      probability: formData.probability || undefined,
      notes: formData.notes || undefined,
    });
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/crm-home" },
    { label: "Sales", href: "/sales" },
    { label: "Opportunities", href: "/opportunities" },
    { label: "Edit" },
  ];

  if (isLoading) {
    return (
      <ModuleLayout title="Edit Opportunity" description="Update opportunity details" icon={<FileText className="w-6 h-6" />} breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title="Edit Opportunity" description="Update opportunity details" icon={<FileText className="w-6 h-6" />} breadcrumbs={breadcrumbs}>
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6 p-4 sm:p-6">
        {/* Opportunity Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Opportunity Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Opportunity Number *</Label>
                <Input value={formData.proposalNumber} onChange={e => setFormData({ ...formData, proposalNumber: e.target.value })} placeholder="e.g., PROP-001" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="closed_won">Closed Won</SelectItem>
                    <SelectItem value="closed_lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Opportunity Title *</Label>
              <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Website Development Project" />
            </div>
          </CardContent>
        </Card>

        {/* Client */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:w-1/2">
              <Label>Client *</Label>
              <Select value={formData.clientId} onValueChange={v => setFormData({ ...formData, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>
                  {Array.isArray(clients) && clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>{client.companyName || client.contactPerson}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Amount (Ksh) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" step="0.01" min="0" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Win Probability (%)</Label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" value={formData.probability} onChange={e => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })} min="0" max="100" placeholder="0" className="pl-9" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description & Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Description &amp; Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor value={formData.description} onChange={v => setFormData({ ...formData, description: v })} placeholder="Enter proposal description..." minHeight="120px" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <RichTextEditor value={formData.notes} onChange={v => setFormData({ ...formData, notes: v })} placeholder="Add any internal notes..." minHeight="100px" />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate("/opportunities")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </ModuleLayout>
  );
}

