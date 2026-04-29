import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Edit,
  Trash2,
  FileText,
  Users,
  Building2,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Repeat2,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import mutateAsync from "@/lib/mutationHelpers";

const STATUS_STYLES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
  trial: { label: "Trial", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", icon: <Clock className="h-3 w-3" /> },
  suspended: { label: "Suspended", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", icon: <AlertTriangle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: <XCircle className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.active;
  return (
    <Badge className={cn("gap-1 border-0 font-medium text-xs", s.className)}>
      {s.icon} {s.label}
    </Badge>
  );
}

export default function SubscriptionDetails() {
  const [, params] = useRoute("/subscriptions/:id");
  const [, navigate] = useLocation();
  const subscriptionId = params?.id || "";
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch subscription (recurring invoice)
  const { data: subData, isLoading, refetch } = trpc.recurringInvoices.getById.useQuery(subscriptionId);
  const { data: clientsData = [] } = trpc.clients.list.useQuery({});
  const { data: invoicesList = [] } = trpc.invoices.list.useQuery({});

  // Get client info
  const client = subData && clientsData ? (clientsData as any[]).find((c: any) => c.id === (subData as any).clientId) : null;

  const utils = trpc.useUtils();
  const deleteMutation = trpc.recurringInvoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Subscription deleted successfully");
      utils.recurringInvoices.list.invalidate();
      navigate("/subscriptions");
    },
    onError: (err) => toast.error(err.message || "Failed to delete subscription"),
  });

  const toggleMutation = trpc.recurringInvoices.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("Subscription status updated");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to update subscription"),
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deleteMutation, subscriptionId);
    } catch (error) {
      // handled by mutation
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await mutateAsync(toggleMutation, subscriptionId);
    } catch (error) {
      // handled by mutation
    }
  };

  const subscription = subData ? {
    id: subscriptionId,
    clientId: (subData as any).clientId,
    clientName: client?.companyName || client?.name || "Unknown Client",
    clientEmail: client?.email || "",
    clientPhone: client?.phone || "",
    clientAddress: client?.address || "",
    description: (subData as any).description || "Subscription",
    title: (subData as any).title || "Subscription",
    amount: ((subData as any).amount || 0) / 100,
    frequency: (subData as any).frequency || "monthly",
    startDate: (subData as any).startDate,
    nextDueDate: (subData as any).nextDueDate,
    endDate: (subData as any).endDate,
    isActive: (subData as any).isActive,
    notes: (subData as any).notes || "",
  } : null;

  // Get related invoices
  const relatedInvoices = subscription && invoicesList ? (invoicesList as any[])
    .filter((inv: any) => inv.recurringInvoiceId === subscriptionId)
    .slice(0, 10)
    : [];

  const getStatusDisplay = () => {
    if (!subscription) return "unknown";
    return subscription.isActive ? "active" : "cancelled";
  };

  const getFrequencyLabel = () => {
    if (!subscription) return "N/A";
    const freq = subscription.frequency?.toLowerCase() || "monthly";
    const map: Record<string, string> = {
      weekly: "Weekly",
      biweekly: "Bi-weekly",
      monthly: "Monthly",
      quarterly: "Quarterly",
      annually: "Annually",
      yearly: "Annually",
    };
    return map[freq] || "Monthly";
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Subscription Details"
        icon={<Repeat2 className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Subscriptions", href: "/subscriptions" },
          { label: "Details" },
        ]}
        backLink={{ label: "Subscriptions", href: "/subscriptions" }}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (!subscription) {
    return (
      <ModuleLayout
        title="Subscription Details"
        icon={<Repeat2 className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Subscriptions", href: "/subscriptions" },
          { label: "Details" },
        ]}
        backLink={{ label: "Subscriptions", href: "/subscriptions" }}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p>Subscription not found</p>
          <Button onClick={() => navigate("/subscriptions")}>Back to Subscriptions</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Subscription Details"
      icon={<Repeat2 className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Subscriptions", href: "/subscriptions" },
        { label: subscription.clientName },
      ]}
      backLink={{ label: "Subscriptions", href: "/subscriptions" }}
    >
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex items-center gap-2">
            <Button
              variant={subscription.isActive ? "outline" : "default"}
              onClick={handleToggleStatus}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {subscription.isActive ? "Suspend" : "Reactivate"}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/subscriptions/${subscriptionId}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" size="icon" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-5">
                {/* Title + Status */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Repeat2 className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-bold">{subscription.title}</h2>
                  </div>
                  <StatusBadge status={getStatusDisplay()} />
                </div>

                <Separator />

                {/* Key Fields */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Client</p>
                      <p className="text-sm font-medium truncate">{subscription.clientName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate">{subscription.clientEmail || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{subscription.clientPhone || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-medium">{subscription.clientAddress || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-sm font-bold text-green-600">
                        ${subscription.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Frequency</p>
                      <p className="text-sm font-medium">{getFrequencyLabel()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="text-sm font-medium">
                        {subscription.startDate
                          ? new Date(subscription.startDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Next Renewal</p>
                      <p className="text-sm font-medium">
                        {subscription.nextDueDate
                          ? new Date(subscription.nextDueDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="invoices">Invoices ({relatedInvoices.length})</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Subscription Details</CardTitle>
                    <CardDescription>Plan and renewal information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Plan Name</p>
                        <p className="text-base font-semibold">{subscription.title}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                        <StatusBadge status={getStatusDisplay()} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Billing Frequency</p>
                        <p className="text-base font-semibold">{getFrequencyLabel()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Amount Per Cycle</p>
                        <p className="text-base font-semibold text-green-600">
                          ${subscription.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Start Date</p>
                        <p className="text-base font-semibold">
                          {subscription.startDate
                            ? new Date(subscription.startDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Next Renewal Date</p>
                        <p className="text-base font-semibold">
                          {subscription.nextDueDate
                            ? new Date(subscription.nextDueDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {subscription.endDate && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">End Date</p>
                          <p className="text-base font-semibold">
                            {new Date(subscription.endDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </>
                    )}

                    {subscription.notes && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                          <p className="text-sm text-foreground">{subscription.notes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Generated Invoices</CardTitle>
                    <CardDescription>Last 10 invoices from this subscription</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {relatedInvoices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-30" />
                        <p>No invoices generated yet</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {relatedInvoices.map((inv: any, idx: number) => (
                            <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-medium">
                                <a href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">
                                  {inv.invoiceNumber || `INV-${inv.id.slice(0, 8)}`}
                                </a>
                              </TableCell>
                              <TableCell>
                                {inv.issueDate
                                  ? new Date(inv.issueDate).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${((inv.total || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {inv.status || "Draft"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
