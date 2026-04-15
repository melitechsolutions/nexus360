import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { buildCommunicationComposePath } from "@/lib/communications";
import mutateAsync from '@/lib/mutationHelpers';
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
  TrendingUp,
  Search,
  Plus,
  Eye,
  Pencil,
  DollarSign,
  Target,
  Users,
  Calendar,
  Trash2,
  Copy,
  FileText,
  Mail,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/export-utils";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatsCard } from "@/components/ui/stats-card";

interface Opportunity {
  id: string;
  name: string;
  client: string;
  value: number;
  stage: "prospecting" | "qualification" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  probability: number;
  expectedCloseDate: string;
  owner: string;
  source: string;
}

export default function Opportunities() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedOpportunities, setSelectedOpportunities] = useState<Set<string>>(new Set());

  const oppColumns: ColumnConfig[] = [
    { key: "name", label: "Opportunity" },
    { key: "client", label: "Client" },
    { key: "value", label: "Value" },
    { key: "stage", label: "Stage" },
    { key: "probability", label: "Probability" },
    { key: "expectedCloseDate", label: "Expected Close" },
    { key: "owner", label: "Owner" },
    { key: "source", label: "Source" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(oppColumns, "opportunities");

  // Fetch real data from backend
  const { data: data = [], isLoading } = trpc.opportunities.list.useQuery();
  const utils = trpc.useUtils();

  // Update mutation
  const updateOpportunityMutation = trpc.opportunities.update.useMutation({
    onSuccess: () => {
      toast.success("Opportunity updated");
      utils.opportunities.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update opportunity");
    },
  });
  // Delete mutation
  const deleteOpportunityMutation = trpc.opportunities.delete.useMutation({
    onSuccess: () => {
      toast.success("Opportunity deleted successfully");
      utils.opportunities.list.invalidate();
      setDeleteDialogOpen(false);
      setSelectedOpportunityId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete opportunity");
    },
  });

  // Transform backend data to display format
  const opportunities: Opportunity[] = (data as any[]).map((opp: any) => ({
    id: String(opp.id),
    name: opp.name || "Unknown Opportunity",
    client: opp.clientId ? "Client" : "Unknown",
    value: (opp.value || 0) / 100,
    stage: opp.stage || "prospecting",
    probability: opp.probability || 0,
    expectedCloseDate: opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    owner: opp.owner || "Unassigned",
    source: opp.source || "Unknown",
  }));

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.client.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

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

  const getStageVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (stage) {
      case "closed_won":
        return "default";
      case "negotiation":
      case "proposal":
        return "secondary";
      case "closed_lost":
        return "destructive";
      default:
        return "outline";
    }
  };

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedValue = opportunities.reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0);
  const avgProbability = opportunities.reduce((sum, opp) => sum + opp.probability, 0) / opportunities.length;

  const toggleSelectOpp = (id: string) => {
    setSelectedOpportunities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOpps = () => {
    if (selectedOpportunities.size === filteredOpportunities.length) {
      setSelectedOpportunities(new Set());
    } else {
      setSelectedOpportunities(new Set(filteredOpportunities.map((o) => o.id)));
    }
  };

  return (
    <ModuleLayout
      title="Sales Opportunities"
      description="Track and manage your sales pipeline"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Sales", href: "/sales" },
        { label: "Opportunities" },
      ]}
      actions={
        <Button onClick={() => navigate("/opportunities/create")}>
          <Plus className="mr-2 h-4 w-4" />
          New Opportunity
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Pipeline Value"
            value={<>Ksh {totalValue.toLocaleString()}</>}
            description="Total opportunity value"
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-orange-500"
          />
          <StatsCard
            label="Weighted Value"
            value={<>Ksh {Math.round(weightedValue).toLocaleString()}</>}
            description="Probability-adjusted"
            icon={<TrendingUp className="h-5 w-5" />}
            color="border-l-green-500"
          />
          <StatsCard
            label="Active Deals"
            value={opportunities.length}
            description="In pipeline"
            icon={<Target className="h-5 w-5" />}
            color="border-l-blue-500"
          />
          <StatsCard
            label="Avg Probability"
            value={<>{Math.round(avgProbability)}%</>}
            description="Win probability"
            icon={<Users className="h-5 w-5" />}
            color="border-l-purple-500"
          />
        </div>

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search opportunities..."
          onCreateClick={() => navigate("/opportunities/create")}
          createLabel="New Opportunity"
          onExportClick={() => downloadCSV(filteredOpportunities.map((opp) => ({ Name: opp.name, Client: opp.client, Value: opp.value, Stage: getStageLabel(opp.stage), Probability: opp.probability, ExpectedClose: opp.expectedCloseDate, Owner: opp.owner, Source: opp.source })), "opportunities")}
          onPrintClick={() => window.print()}
          showImport={false}
          filterContent={
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="prospecting">Prospecting</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Bulk Actions Bar */}
        <EnhancedBulkActions
          selectedCount={selectedOpportunities.size}
          onClear={() => setSelectedOpportunities(new Set())}
          actions={[
            { id: "updateStage", label: "Update Stage", icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => { const stage = prompt("Enter new stage (prospecting, qualification, proposal, negotiation, closed_won, closed_lost):"); if (stage) { selectedOpportunities.forEach((id) => updateOpportunityMutation.mutate({ id, stage: stage as any })); setSelectedOpportunities(new Set()); } } },
            bulkExportAction(selectedOpportunities, opportunities, oppColumns, "opportunities"),
            bulkCopyIdsAction(selectedOpportunities),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedOpportunities, (ids) => { ids.forEach((id) => deleteOpportunityMutation.mutate(id)); setSelectedOpportunities(new Set()); }),
          ]}
        />

        {/* Opportunities Table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredOpportunities.length} opportunities</span>
              <TableColumnSettings columns={oppColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedOpportunities.size === filteredOpportunities.length && filteredOpportunities.length > 0} onCheckedChange={toggleSelectAllOpps} /></TableHead>
                  {isVisible("name") && <TableHead>Opportunity</TableHead>}
                  {isVisible("client") && <TableHead>Client</TableHead>}
                  {isVisible("value") && <TableHead>Value</TableHead>}
                  {isVisible("stage") && <TableHead>Stage</TableHead>}
                  {isVisible("probability") && <TableHead>Probability</TableHead>}
                  {isVisible("expectedCloseDate") && <TableHead>Expected Close</TableHead>}
                  {isVisible("owner") && <TableHead>Owner</TableHead>}
                  {isVisible("source") && <TableHead>Source</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map((opp) => (
                  <TableRow key={opp.id} className={selectedOpportunities.has(opp.id) ? "bg-primary/5" : ""}>
                    <TableCell><Checkbox checked={selectedOpportunities.has(opp.id)} onCheckedChange={() => toggleSelectOpp(opp.id)} /></TableCell>
                    {isVisible("name") && <TableCell className="font-medium">{opp.name}</TableCell>}
                    {isVisible("client") && <TableCell>{opp.client}</TableCell>}
                    {isVisible("value") && <TableCell className="font-medium">Ksh {(opp.value || 0).toLocaleString()}</TableCell>}
                    {isVisible("stage") && <TableCell>
                      <Badge variant={getStageVariant(opp.stage)}>{getStageLabel(opp.stage)}</Badge>
                    </TableCell>}
                    {isVisible("probability") && <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${opp.probability}%` }} />
                        </div>
                        <span className="text-sm font-medium">{opp.probability}%</span>
                      </div>
                    </TableCell>}
                    {isVisible("expectedCloseDate") && <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(opp.expectedCloseDate).toLocaleDateString()}
                      </div>
                    </TableCell>}
                    {isVisible("owner") && <TableCell className="text-sm text-muted-foreground">{opp.owner}</TableCell>}
                    {isVisible("source") && <TableCell className="text-sm text-muted-foreground">{opp.source}</TableCell>}
                    <TableCell className="text-right">
                      <RowActionsMenu
                        primaryActions={[
                          { label: "View", icon: actionIcons.view, onClick: () => navigate(`/opportunities/${opp.id}`) },
                          { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => navigate(`/opportunities/${opp.id}/edit`) },
                          { label: "Delete", icon: actionIcons.delete, onClick: () => { setSelectedOpportunityId(opp.id); setDeleteDialogOpen(true); }, variant: "destructive" },
                        ]}
                        menuActions={[
                          { label: "Convert to Quote", icon: <FileText className="h-4 w-4" />, onClick: () => navigate(`/quotes/new?fromOpportunity=${opp.id}`) },
                          { label: "Duplicate", icon: actionIcons.copy, onClick: () => navigate(`/opportunities/create?clone=${opp.id}`), separator: true },
                          { label: "Send Email", icon: actionIcons.email, onClick: () => navigate(buildCommunicationComposePath(location, opp.clientEmail || "", `Regarding opportunity ${opp.title || opp.name || opp.id}`)) },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this opportunity? This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (selectedOpportunityId) {
                    await mutateAsync(deleteOpportunityMutation, selectedOpportunityId);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleLayout>
  );
}

