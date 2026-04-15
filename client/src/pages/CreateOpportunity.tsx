import { useState } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TrendingUp, Plus, Save, Users, DollarSign, Calendar, Target, Briefcase } from "lucide-react";
import { useCurrencySettings } from "@/lib/currency";

const SOURCES = [
  "Referral",
  "Website / SEO",
  "Cold Call",
  "Social Media",
  "Email Campaign",
  "Exhibition / Event",
  "Walk-in",
  "Partner",
  "Tender / RFQ",
  "Other",
];

const STAGE_PROBABILITY: Record<string, number> = {
  lead: 10,
  qualified: 30,
  proposal: 50,
  negotiation: 75,
  closed_won: 100,
  closed_lost: 0,
};

export default function CreateOpportunity() {
  const { code: currencyCode } = useCurrencySettings();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    companyRevenue: "",
    decisionMaker: "",
    competitorInfo: "",
    value: "",
    stage: "lead",
    probability: "10",
    currency: currencyCode,
    expectedCloseDate: "",
    actualCloseDate: "",
    nextFollowUpDate: "",
    assignedTo: "",
    source: "",
    campaignName: "",
    referredBy: "",
    winReason: "",
    lossReason: "",
    notes: "",
    internalNotes: "",
  });

  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: usersData = [] } = trpc.users.list.useQuery();
  const teamMembers = Array.isArray(usersData) ? usersData : (usersData as any)?.users ?? [];
  const clientsArr = Array.isArray(clients) ? clients : (clients as any)?.items ?? [];

  const createMutation = trpc.opportunities.create.useMutation({
    onSuccess: () => {
      toast.success("Opportunity created successfully!");
      utils.opportunities.list.invalidate();
      navigate("/opportunities");
    },
    onError: (error: any) => {
      toast.error(`Failed to create opportunity: ${error.message}`);
    },
  });

  const isClosed = formData.stage === "closed_won" || formData.stage === "closed_lost";

  const handleStageChange = (stage: string) => {
    setFormData({
      ...formData,
      stage,
      probability: String(STAGE_PROBABILITY[stage] ?? formData.probability),
    });
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.title || !formData.value) {
      toast.error("Client, Title and Value are required");
      return;
    }
    createMutation.mutate({
      clientId: formData.clientId,
      title: formData.title,
      description: formData.description || undefined,
      value: Math.round(parseFloat(formData.value) * 100),
      stage: formData.stage as any,
      probability: formData.probability ? parseInt(formData.probability) : undefined,
      expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : undefined,
      actualCloseDate: formData.actualCloseDate ? new Date(formData.actualCloseDate) : undefined,
      assignedTo: formData.assignedTo || undefined,
      source: formData.source || undefined,
      notes: formData.notes || undefined,
      winReason: formData.winReason || undefined,
      lossReason: formData.lossReason || undefined,
    });
  };

  return (
    <ModuleLayout
      title="Create Opportunity"
      description="Track a new sales opportunity through your pipeline"
      icon={<Plus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Opportunities", href: "/opportunities" },
        { label: "Create" },
      ]}
      backLink={{ label: "Opportunities", href: "/opportunities" }}
    >
      <div className="space-y-6 max-w-5xl">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Opportunity Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />Opportunity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Client <span className="text-destructive">*</span></Label>
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {clientsArr.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName || c.contactPerson}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Opportunity Title <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.title}
                  onChange={set("title")}
                  placeholder="e.g., Website Redesign for Acme Corp"
                />
              </div>

              <div className="space-y-2">
                <Label>Brief Description / Scope</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(v) => setFormData({ ...formData, description: v })}
                  placeholder="Describe the opportunity, client needs, and scope of work..."
                  minHeight="120px"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Key Decision Maker</Label>
                  <Input
                    value={formData.decisionMaker}
                    onChange={set("decisionMaker")}
                    placeholder="Name and title of decision maker"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Annual Revenue (KES)</Label>
                  <Input
                    type="number"
                    value={formData.companyRevenue}
                    onChange={set("companyRevenue")}
                    placeholder="Estimated client revenue"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Competitor / Alternative Solutions</Label>
                <Input
                  value={formData.competitorInfo}
                  onChange={set("competitorInfo")}
                  placeholder="e.g., Zoho CRM, Salesforce, in-house system"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Deal Value & Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />Deal Value & Pipeline Stage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Deal Value <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={set("value")}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES – Kenyan Shilling</SelectItem>
                      <SelectItem value="USD">USD – US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR – Euro</SelectItem>
                      <SelectItem value="GBP">GBP – British Pound</SelectItem>
                      <SelectItem value="UGX">UGX – Ugandan Shilling</SelectItem>
                      <SelectItem value="TZS">TZS – Tanzanian Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pipeline Stage <span className="text-destructive">*</span></Label>
                  <Select value={formData.stage} onValueChange={handleStageChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">🔵 Lead</SelectItem>
                      <SelectItem value="qualified">🟢 Qualified</SelectItem>
                      <SelectItem value="proposal">🟡 Proposal Sent</SelectItem>
                      <SelectItem value="negotiation">🟠 Negotiation</SelectItem>
                      <SelectItem value="closed_won">✅ Closed Won</SelectItem>
                      <SelectItem value="closed_lost">❌ Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Win Probability: {formData.probability}%</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={set("probability")}
                  className="w-full accent-primary"
                  aria-label="Win probability percentage"
                  title="Win probability percentage"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0% – Very unlikely</span><span>50% – Even odds</span><span>100% – Certain</span>
                </div>
              </div>

              {isClosed && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>{formData.stage === "closed_won" ? "Win Reason" : "Loss Reason"}</Label>
                    <Textarea
                      value={formData.stage === "closed_won" ? formData.winReason : formData.lossReason}
                      onChange={
                        formData.stage === "closed_won"
                          ? (e) => setFormData({ ...formData, winReason: e.target.value })
                          : (e) => setFormData({ ...formData, lossReason: e.target.value })
                      }
                      placeholder={
                        formData.stage === "closed_won"
                          ? "What factors contributed to winning this deal? (price, relationship, features...)"
                          : "Why was this deal lost? (lost to competitor, budget constraints, no decision...)"
                      }
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />Timeline & Follow-up
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Expected Close Date</Label>
                  <Input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={set("expectedCloseDate")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Actual Close Date</Label>
                  <Input
                    type="date"
                    value={formData.actualCloseDate}
                    onChange={set("actualCloseDate")}
                  />
                  <p className="text-xs text-muted-foreground">Fill when deal is closed</p>
                </div>
                <div className="space-y-2">
                  <Label>Next Follow-up Date</Label>
                  <Input
                    type="date"
                    value={formData.nextFollowUpDate}
                    onChange={set("nextFollowUpDate")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Lead Source & Campaign */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />Lead Source & Marketing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lead Source</Label>
                  <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                    <SelectTrigger><SelectValue placeholder="How did this lead come in?" /></SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      {SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaign / Marketing Initiative</Label>
                  <Input
                    value={formData.campaignName}
                    onChange={set("campaignName")}
                    placeholder="e.g., Q1 2025 Email Campaign"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Referred By</Label>
                <Input
                  value={formData.referredBy}
                  onChange={set("referredBy")}
                  placeholder="Name of the person or company that referred this lead"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Team Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />Team Assignment & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assigned Sales Rep</Label>
                <Select value={formData.assignedTo} onValueChange={(v) => setFormData({ ...formData, assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                  <SelectContent className="max-h-56 overflow-y-auto">
                    <SelectItem value="unassigned">— Unassigned —</SelectItem>
                    {teamMembers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Client-Facing Notes</Label>
                <RichTextEditor
                  value={formData.notes}
                  onChange={(v) => setFormData({ ...formData, notes: v })}
                  placeholder="Notes visible in proposals, reports, or shared with client..."
                  minHeight="100px"
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <RichTextEditor
                  value={formData.internalNotes}
                  onChange={(v) => setFormData({ ...formData, internalNotes: v })}
                  placeholder="Internal notes, next steps, action items, objections raised..."
                  minHeight="120px"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-between pb-8">
            <Button type="button" variant="outline" onClick={() => navigate("/opportunities")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Creating..." : "Create Opportunity"}
            </Button>
          </div>
        </form>
      </div>
    </ModuleLayout>
  );
}


