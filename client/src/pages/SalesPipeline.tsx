import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

type Opportunity = {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  assignedTo: string | null;
  source: string | null;
  winReason: string | null;
  lossReason: string | null;
  notes: string | null;
  stageMovedAt: string | null;
};

type PipelineStage = {
  id: string;
  title: string;
  opportunities: Opportunity[];
  count: number;
};

const stageLabelMap: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  negotiation: "Negotiating",
  closed_won: "Won",
  closed_lost: "Lost",
};

const STAGE_ORDER = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];

export default function SalesPipeline() {
  const [draggedCard, setDraggedCard] = useState<{ oppId: string; sourceStage: string } | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [moveDialog, setMoveDialog] = useState<{ oppId: string; newStage: string } | null>(null);
  const [reasonText, setReasonText] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    value: 0,
    probability: 50,
    expectedCloseDate: "",
    assignedTo: "",
    source: "",
    notes: "",
  });

  // Queries
  const boardQuery = trpc.salesPipeline.getPipelineBoard.useQuery();
  const forecastQuery = trpc.salesPipeline.getSalesForecast.useQuery({});
  const statsQuery = trpc.salesPipeline.getWinLossStats.useQuery({ months: 3 });
  const clientsQuery = trpc.clients.list.useQuery(undefined);

  // Mutations
  const createMutation = trpc.salesPipeline.create.useMutation({
    onSuccess: () => {
      toast.success("Opportunity created");
      boardQuery.refetch();
      forecastQuery.refetch();
      resetForm();
      setOpenDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create opportunity");
    },
  });

  const moveMutation = trpc.salesPipeline.moveOpportunity.useMutation({
    onSuccess: () => {
      toast.success("Opportunity moved");
      boardQuery.refetch();
      forecastQuery.refetch();
      statsQuery.refetch();
      setMoveDialog(null);
      setReasonText("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to move opportunity");
    },
  });

  const updateProbability = trpc.salesPipeline.updateProbability.useMutation({
    onSuccess: () => {
      toast.success("Probability updated");
      boardQuery.refetch();
      forecastQuery.refetch();
    },
    onError: () => {
      toast.error("Failed to update probability");
    },
  });

  // Helper functions
  const resetForm = () => {
    setFormData({
      clientId: "",
      title: "",
      description: "",
      value: 0,
      probability: 50,
      expectedCloseDate: "",
      assignedTo: "",
      source: "",
      notes: "",
    });
  };

  const handleCreateOpportunity = () => {
    if (!formData.clientId || !formData.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    const dateString = formData.expectedCloseDate
      ? `${formData.expectedCloseDate}T12:00:00Z`
      : undefined;

    createMutation.mutate({
      clientId: formData.clientId,
      title: formData.title,
      description: formData.description || undefined,
      value: formData.value,
      probability: formData.probability,
      expectedCloseDate: dateString,
      assignedTo: formData.assignedTo || undefined,
      source: formData.source || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleDragStart = (e: React.DragEvent, oppId: string, stage: string) => {
    setDraggedCard({ oppId, sourceStage: stage });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();

    if (!draggedCard) return;

    if (draggedCard.sourceStage === targetStage) {
      setDraggedCard(null);
      return;
    }

    // Check if moving to closed_won or closed_lost (need reason)
    if (targetStage === "closed_won" || targetStage === "closed_lost") {
      setMoveDialog({ oppId: draggedCard.oppId, newStage: targetStage });
    } else {
      moveMutation.mutate({
        id: draggedCard.oppId,
        newStage: targetStage as any,
      });
    }

    setDraggedCard(null);
  };

  const handleConfirmMove = () => {
    if (!moveDialog) return;

    if (
      (moveDialog.newStage === "closed_won" || moveDialog.newStage === "closed_lost") &&
      !reasonText
    ) {
      toast.error("Please provide a reason for closing this deal");
      return;
    }

    const isWon = moveDialog.newStage === "closed_won";
    moveMutation.mutate({
      id: moveDialog.oppId,
      newStage: moveDialog.newStage as any,
      winReason: isWon ? reasonText : undefined,
      lossReason: !isWon ? reasonText : undefined,
    });
  };

  if (boardQuery.isLoading) {
    return <div className="p-6">Loading pipeline...</div>;
  }

  const board = boardQuery.data;
  const forecast = forecastQuery.data;
  const stats = statsQuery.data;
  const clients = clientsQuery.data || [];

  const sortedStages = board?.stages.sort(
    (a, b) => STAGE_ORDER.indexOf(a.id) - STAGE_ORDER.indexOf(b.id)
  ) || [];

  const getCardColor = (stage: string) => {
    switch (stage) {
      case "lead":
        return "border-blue-200 bg-blue-50";
      case "qualified":
        return "border-purple-200 bg-purple-50";
      case "proposal":
        return "border-orange-200 bg-orange-50";
      case "negotiation":
        return "border-yellow-200 bg-yellow-50";
      case "closed_won":
        return "border-green-200 bg-green-50";
      case "closed_lost":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200";
    }
  };

  return (
    <ModuleLayout
      title="Sales Pipeline"
      icon={<TrendingUp className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Sales", href: "/sales" },
        { label: "Pipeline" },
      ]}
    >
      <div className="space-y-6">
      <Tabs defaultValue="kanban" className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> New Opportunity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Opportunity</DialogTitle>
                  <DialogDescription>
                    Add a new sales opportunity to your pipeline
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client">Client *</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, clientId: value })
                      }
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(clients) && clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Opportunity Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Website Redesign Project"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="value">Deal Value (KES) *</Label>
                    <Input
                      id="value"
                      type="number"
                      min="0"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({ ...formData, value: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="probability">Probability (%)</Label>
                    <Input
                      id="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) =>
                        setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Weighted forecast: KES{" "}
                      {Math.round(((formData.value || 0) * (formData.probability || 0)) / 100).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="date">Expected Close Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expectedCloseDate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Details about this opportunity"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={handleCreateOpportunity}
                    disabled={createMutation.isPending}
                    className="w-full"
                  >
                    Create Opportunity
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Kanban View */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 pb-6">
            {sortedStages.map((stage) => (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="bg-muted/30 rounded-lg p-4 min-h-96"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-sm">{stage.title}</h3>
                  <Badge variant="outline">{stage.count}</Badge>
                </div>

                <div className="space-y-3">
                  {stage.opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, opp.id, stage.id)}
                      onClick={() => setSelectedOpp(opp)}
                      className={`p-3 rounded-lg cursor-move border-2 hover:shadow-md transition-shadow ${getCardColor(
                        stage.id
                      )}`}
                    >
                      <div className="flex gap-2 mb-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{opp.title}</p>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Value:</span>
                          <span className="font-semibold">
                            KES {(opp.value || 0).toLocaleString()}
                          </span>
                        </div>

                        {opp.probability > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Probability:</span>
                            <span className="font-semibold">{opp.probability}%</span>
                          </div>
                        )}

                        {opp.expectedCloseDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Close:</span>
                            <span className="font-semibold">
                              {new Date(opp.expectedCloseDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Forecast View */}
        <TabsContent value="forecast" className="space-y-4">
          {forecast && (
            <div className="space-y-6">
              {/* Forecast Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                  label="Total Pipeline"
                  value={<>KES {(forecast.totalPipeline || 0).toLocaleString()}</>}
                  description={<>{forecast.opportunities.length} opportunities</>}
                  color="border-l-cyan-500"
                />

                <StatsCard
                  label="Weighted Forecast"
                  value={<>KES {(forecast.weightedForecast || 0).toLocaleString()}</>}
                  description="Probability-weighted revenue"
                  color="border-l-pink-500"
                />

                <StatsCard
                  label="Confidence"
                  value={<>{forecast.totalPipeline > 0 ? Math.round( (forecast.weightedForecast / forecast.totalPipeline) * 100 ) : 0} %</>}
                  description="Average deal confidence"
                  color="border-l-emerald-500"
                />
              </div>

              {/* By Stage */}
              <Card>
                <CardHeader>
                  <CardTitle>Forecast by Stage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(forecast.byStage).map(([stage, data]: [string, any]) => (
                    <div key={stage}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium capitalize">{stageLabelMap[stage]}</span>
                        <span className="text-sm text-muted-foreground">{data.count} deals</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Pipeline:</span>
                          <span>KES {(data.value || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Forecast:</span>
                          <span className="font-semibold">KES {(data.forecast || 0).toLocaleString()}</span>
                        </div>
                        <Progress
                          value={data.value > 0 ? (data.forecast / data.value) * 100 : 0}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard
                  label="Win Rate (3mo)"
                  value={<>{stats.winRate}%</>}
                  description={<>{stats.won}/{stats.total} deals</>}
                  color="border-l-orange-500"
                />

                <StatsCard
                  label="Total Won"
                  value={<>KES {(stats.totalWon || 0).toLocaleString()}</>}
                  description={<>Avg: KES {(stats.avgWonDealSize || 0).toLocaleString()}</>}
                  color="border-l-purple-500"
                />

                <StatsCard
                  label="Total Lost"
                  value={<>KES {(stats.totalLost || 0).toLocaleString()}</>}
                  description={<>{stats.lost} deals</>}
                  color="border-l-green-500"
                />

                <StatsCard
                  label="Avg Closure Time"
                  value={<>{stats.closureTimeAsAvg} days</>}
                  description="Avg deal lifecycle"
                  color="border-l-blue-500"
                />
              </div>

              {/* Win Reasons */}
              {Object.keys(stats.byReason.wins).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" /> Top Win Reasons
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(stats.byReason.wins)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([reason, count]) => (
                        <div key={reason} className="flex justify-between items-center">
                          <span>{reason}</span>
                          <Badge>{count}</Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Loss Reasons */}
              {Object.keys(stats.byReason.losses).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <XCircle className="h-5 w-5" /> Top Loss Reasons
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(stats.byReason.losses)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([reason, count]) => (
                        <div key={reason} className="flex justify-between items-center">
                          <span>{reason}</span>
                          <Badge variant="destructive">{count}</Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Move Reason Dialog */}
      <AlertDialog open={!!moveDialog} onOpenChange={(open) => !open && setMoveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {moveDialog?.newStage === "closed_won" ? "Mark as Won" : "Mark as Lost"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {moveDialog?.newStage === "closed_won"
                ? "Why did we win this deal?"
                : "Why did we lose this deal?"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Textarea
            placeholder={
              moveDialog?.newStage === "closed_won"
                ? "e.g., Best price, excellent service..."
                : "e.g., Lost to competitor, budget constraints..."
            }
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            rows={3}
          />

          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove} disabled={!reasonText}>
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ModuleLayout>
  );
}
