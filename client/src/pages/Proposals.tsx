import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileText, Plus, Search, Eye, Edit, Trash2, Download, Send, TrendingUp, Clock, CheckCircle2, DollarSign, Loader2, Copy, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/export-utils";
import { useLocation, useSearch } from "wouter";
import { buildCommunicationComposePath } from "@/lib/communications";
import { StatsCard } from "@/components/ui/stats-card";
import { Checkbox } from "@/components/ui/checkbox";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";

export default function Proposals() {
  const [location, navigate] = useLocation();
  const _search = useSearch();
  useEffect(() => { if (new URLSearchParams(_search).get("action") === "create") setIsCreateDialogOpen(true); }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set());

  const proposalColumns: ColumnConfig[] = [
    { key: "title", label: "Title" },
    { key: "client", label: "Client" },
    { key: "value", label: "Value" },
    { key: "stage", label: "Stage" },
    { key: "expectedClose", label: "Expected Close" },
  ];
  const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(proposalColumns);
  
  const utils = trpc.useUtils();
  const { data: proposals = [], isLoading } = trpc.opportunities.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  
  const createProposalMutation = trpc.opportunities.create.useMutation({
    onSuccess: () => {
      toast.success("Opportunity created successfully");
      utils.opportunities.list.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const deleteProposalMutation = trpc.opportunities.delete.useMutation({
    onSuccess: () => {
      toast.success("Opportunity deleted");
      utils.opportunities.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const [newProposal, setNewProposal] = useState({
    clientId: "",
    title: "",
    description: "",
    value: 0,
    stage: "proposal" as const,
    expectedCloseDate: new Date().toISOString().split('T')[0],
    probability: 50,
    notes: "",
  });

  const handleCreate = () => {
    if (!newProposal.clientId || !newProposal.title) {
      toast.error("Please fill in all required fields");
      return;
    }
    createProposalMutation.mutate({
      ...newProposal,
      value: Math.round(newProposal.value * 100),
      expectedCloseDate: new Date(newProposal.expectedCloseDate),
      probability: newProposal.probability || undefined,
      notes: newProposal.notes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      lead: "bg-gray-100 text-gray-700",
      qualified: "bg-blue-100 text-blue-700",
      proposal: "bg-purple-100 text-purple-700",
      negotiation: "bg-orange-100 text-orange-700",
      closed_won: "bg-green-100 text-green-700",
      closed_lost: "bg-red-100 text-red-700",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100"}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredProposals = proposals.filter((proposal) => {
    const client = clients.find(c => c.id === proposal.clientId);
    const clientName = client?.companyName || "";
    const matchesSearch =
      proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || proposal.stage === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = proposals.reduce((sum, p) => sum + (p.value || 0), 0);
  const acceptedValue = proposals.filter(p => p.stage === "closed_won").reduce((sum, p) => sum + (p.value || 0), 0);
  const activeValue = proposals.filter(p => p.stage !== "closed_won" && p.stage !== "closed_lost").reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <ModuleLayout title="Opportunities" description="Create and manage business opportunities" icon={<FileText className="w-6 h-6" />} breadcrumbs={[{ label: "Dashboard" }, { label: "Sales" }, { label: "Opportunities" }]} actions={<></>}>
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Pipeline Value"
            value={<>Ksh {(activeValue / 100).toLocaleString()}</>}
            description="Active deals"
            icon={<TrendingUp className="h-5 w-5" />}
            color="border-l-orange-500"
          />
          <StatsCard
            label="Closed Won"
            value={<>Ksh {(acceptedValue / 100).toLocaleString()}</>}
            description={<>{proposals.filter(p => p.stage === "closed_won").length} deals</>}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="border-l-purple-500"
          />
          <StatsCard
            label="Avg Value"
            value={<>Ksh {(proposals.length > 0 ? totalValue / proposals.length / 100 : 0).toLocaleString()}</>}
            description="Per opportunity"
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-green-500"
          />
          <StatsCard
            label="Avg Probability"
            value={<>{proposals.length > 0 ? Math.round(proposals.reduce((sum, p) => sum + (p.probability || 0), 0) / proposals.length) : 0}%</>}
            description="Win confidence"
            icon={<Clock className="h-5 w-5" />}
            color="border-l-blue-500"
          />
        </div>

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search opportunities..."
          onCreateClick={() => setIsCreateDialogOpen(true)}
          createLabel="New Opportunity"
          onExportClick={() => downloadCSV(filteredProposals.map((p: any) => { const client = clients.find((c: any) => c.id === p.clientId); return { Title: p.title, Client: client?.companyName || "Unknown", Value: (p.value / 100).toFixed(2), Stage: p.stage || "", ExpectedClose: p.expectedCloseDate ? new Date(p.expectedCloseDate).toLocaleDateString() : "" }; }), "opportunities")}
          onPrintClick={() => window.print()}
          filterContent={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Bulk Actions */}
        {selectedProposals.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
            <span className="text-sm font-medium">{selectedProposals.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => { const selected = filteredProposals.filter((p: any) => selectedProposals.has(p.id)); downloadCSV(selected.map((p: any) => { const client = clients.find((c: any) => c.id === p.clientId); return { Title: p.title, Client: client?.companyName || "Unknown", Value: (p.value / 100).toFixed(2), Stage: p.stage || "", ExpectedClose: p.expectedCloseDate ? new Date(p.expectedCloseDate).toLocaleDateString() : "" }; }), "opportunities-selected"); }}><Download className="h-4 w-4 mr-1" />Export</Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm(`Delete ${selectedProposals.size} opportunities?`)) { selectedProposals.forEach((id) => deleteProposalMutation.mutate(id)); setSelectedProposals(new Set()); } }}>Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedProposals(new Set())}>Clear</Button>
          </div>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                <DialogTitle>Create New Opportunity</DialogTitle>
                <DialogDescription>Fill in the details to create a new business opportunity</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
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
                        <Label htmlFor="client">Client *</Label>
                        <Select onValueChange={(val) => setNewProposal({...newProposal, clientId: val})}>
                          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                          <SelectContent>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stage">Stage</Label>
                        <Select value={newProposal.stage} onValueChange={(val) => setNewProposal({...newProposal, stage: val as any})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Label htmlFor="title">Opportunity Title *</Label>
                      <Input id="title" placeholder="Enter opportunity title" value={newProposal.title} onChange={(e) => setNewProposal({...newProposal, title: e.target.value})} />
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
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="value">Estimated Value (Ksh) *</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="value" type="number" placeholder="0.00" value={newProposal.value || ""} onChange={(e) => setNewProposal({...newProposal, value: parseFloat(e.target.value) || 0})} step="0.01" min="0" className="pl-9" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expectedClose">Expected Close Date</Label>
                        <Input id="expectedClose" type="date" value={newProposal.expectedCloseDate} onChange={(e) => setNewProposal({...newProposal, expectedCloseDate: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="probability">Win Probability (%)</Label>
                        <Input id="probability" type="number" value={newProposal.probability} onChange={(e) => setNewProposal({...newProposal, probability: parseInt(e.target.value) || 0})} min="0" max="100" placeholder="50" />
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
                      <Label htmlFor="description">Description</Label>
                      <RichTextEditor value={newProposal.description} onChange={(v) => setNewProposal({...newProposal, description: v})} placeholder="Enter proposal description..." minHeight="120px" />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="notes">Internal Notes</Label>
                      <RichTextEditor value={newProposal.notes} onChange={(v) => setNewProposal({...newProposal, notes: v})} placeholder="Add any internal notes..." minHeight="100px" />
                    </div>
                  </CardContent>
                </Card>
              </div>
                <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createProposalMutation.isPending}>
                  {createProposalMutation.isPending ? "Creating..." : "Create Opportunity"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredProposals.length} opportunities</span>
              <TableColumnSettings columns={proposalColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredProposals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No opportunities found. Click "+" to create one.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedProposals.size === filteredProposals.length && filteredProposals.length > 0} onCheckedChange={() => { if (selectedProposals.size === filteredProposals.length) setSelectedProposals(new Set()); else setSelectedProposals(new Set(filteredProposals.map((p: any) => p.id))); }} /></TableHead>
                      {isVisible("title") && <TableHead>Title</TableHead>}
                      {isVisible("client") && <TableHead>Client</TableHead>}
                      {isVisible("value") && <TableHead>Value</TableHead>}
                      {isVisible("stage") && <TableHead>Stage</TableHead>}
                      {isVisible("expectedClose") && <TableHead>Expected Close</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProposals.map((proposal) => {
                      const client = clients.find(c => c.id === proposal.clientId);
                      return (
                        <TableRow key={proposal.id} className={selectedProposals.has(proposal.id) ? "bg-primary/5" : ""}>
                          <TableCell><Checkbox checked={selectedProposals.has(proposal.id)} onCheckedChange={() => { const next = new Set(selectedProposals); if (next.has(proposal.id)) next.delete(proposal.id); else next.add(proposal.id); setSelectedProposals(next); }} /></TableCell>
                          {isVisible("title") && <TableCell className="font-medium">{proposal.title}</TableCell>}
                          {isVisible("client") && <TableCell>{client?.companyName || "Unknown Client"}</TableCell>}
                          {isVisible("value") && <TableCell>Ksh {(proposal.value / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>}
                          {isVisible("stage") && <TableCell>{getStatusBadge(proposal.stage || "proposal")}</TableCell>}
                          {isVisible("expectedClose") && <TableCell>{proposal.expectedCloseDate ? new Date(proposal.expectedCloseDate).toLocaleDateString() : "N/A"}</TableCell>}
                          <TableCell className="text-right">
                            <RowActionsMenu
                              primaryActions={[
                                { label: "View", icon: actionIcons.view, onClick: () => navigate(`/proposals/${proposal.id}`) },
                                { label: "Delete", icon: actionIcons.delete, onClick: () => { if(confirm("Delete this proposal?")) deleteProposalMutation.mutate(proposal.id); }, variant: "destructive" },
                              ]}
                              menuActions={[
                                { label: "Edit", icon: actionIcons.edit, onClick: () => navigate(`/proposals/${proposal.id}/edit`) },
                                { label: "Duplicate", icon: actionIcons.copy, onClick: () => navigate(`/proposals/create?clone=${proposal.id}`) },
                                { label: "Send to Client", icon: <Send className="h-4 w-4" />, onClick: () => navigate(buildCommunicationComposePath(location, client?.email || "", `Proposal: ${proposal.title}`)), separator: true },
                                { label: "Download PDF", icon: actionIcons.download, onClick: () => { navigate(`/proposals/${proposal.id}`); setTimeout(() => window.print(), 500); } },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
