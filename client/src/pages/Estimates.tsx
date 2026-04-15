import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildCommunicationComposePath } from "@/lib/communications";
import { downloadCSV } from "@/lib/export-utils";
import { format } from "date-fns";
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
  FileText,
  Search,
  Plus,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  Eye,
  Copy,
  Mail,
  Link,
  Send,
} from "lucide-react";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkSendAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { Checkbox } from "@/components/ui/checkbox";

const iconMap = {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
};

interface EstimateDisplay {
  id: string;
  quoteNumber: string;
  client: string;
  amount: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  issueDate: string;
  expiryDate: string;
  project?: string;
  validDays: number;
}

type SortField = "quoteNumber" | "client" | "amount" | "issueDate" | "expiryDate" | "status";
type SortOrder = "asc" | "desc";

export default function Estimates() {
  const { allowed, isLoading } = useRequireFeature("estimates:read");
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("issueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedEstimates, setSelectedEstimates] = useState<Set<string>>(new Set());

  const estimateColumns: ColumnConfig[] = [
    { key: "quoteNumber", label: "Estimate #" },
    { key: "client", label: "Client" },
    { key: "amount", label: "Amount" },
    { key: "issueDate", label: "Date" },
    { key: "expiryDate", label: "Expiry Date" },
    { key: "project", label: "Project" },
    { key: "status", label: "Status" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(estimateColumns, "estimates");

  // Data fetching hooks - enabled flag prevents queries when not allowed
  const { data: estimatesData = [], isLoading: estimatesLoading } = trpc.estimates.list.useQuery(undefined, { enabled: allowed });
  const { data: clientsData = [] } = trpc.clients.list.useQuery(undefined, { enabled: allowed });
  const utils = trpc.useUtils();

  // Delete mutation - must be called unconditionally (React Rules of Hooks)
  const deleteEstimateMutation = trpc.estimates.delete.useMutation({
    onSuccess: () => {
      toast.success("Estimate deleted successfully");
      utils.estimates.list.invalidate();
      setSelectedEstimates(new Set());
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete estimate");
    },
  });

  const submitForApprovalMutation = trpc.estimates.submitForApproval.useMutation({
    onSuccess: () => {
      toast.success("Estimate submitted for approval");
      utils.estimates.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit estimate");
    },
  });

  // NOW we can return early with conditional content - all hooks have been called
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  // Deep copy frozen Drizzle objects to ensure plain JS objects for React dependencies
  const plainEstimatesData = (() => {
    if (!Array.isArray(estimatesData)) return [];
    return estimatesData.map((est: any) => {
      try {
        return JSON.parse(JSON.stringify(est));
      } catch {
        return est;
      }
    });
  })();

  const plainClientsData = (() => {
    if (!Array.isArray(clientsData)) return [];
    return clientsData.map((client: any) => {
      try {
        return JSON.parse(JSON.stringify(client));
      } catch {
        return client;
      }
    });
  })();

  // Transform backend data to display format
  const estimates: EstimateDisplay[] = (() => {
    return (plainEstimatesData as any[]).map((est: any) => ({
      id: est.id,
      quoteNumber: est.estimateNumber || `EST-${est.id.slice(0, 8)}`,
      client: (plainClientsData as any[]).find((c: any) => c.id === est.clientId)?.companyName || "Unknown Client",
      amount: (est.total || 0) / 100,
      status: est.status || "draft",
      issueDate: est.issueDate ? format(new Date(est.issueDate), "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
      expiryDate: est.expiryDate ? format(new Date(est.expiryDate), "yyyy-MM-dd") : "",
      project: est.projectId ? "Project" : undefined,
      validDays: 45,
    }));
  })();

  // Filter and sort estimates
  const filteredAndSortedEstimates = (() => {
    let result = estimates.filter((estimate) => {
      const matchesSearch =
        estimate.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        estimate.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        estimate.project?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || estimate.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "amount") {
        aVal = parseFloat(String(aVal));
        bVal = parseFloat(String(bVal));
      } else if (sortField === "issueDate" || sortField === "expiryDate") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  })();

  const stats = (() => [
    {
      title: "Total Estimates",
      value: `Ksh ${estimates.reduce((sum, est) => sum + est.amount, 0).toLocaleString()}`,
      description: "All time",
      iconName: "DollarSign" as keyof typeof iconMap,
    },
    {
      title: "Accepted",
      value: `Ksh ${estimates
        .filter((est) => est.status === "accepted")
        .reduce((sum, est) => sum + est.amount, 0)
        .toLocaleString()}`,
      description: `${estimates.filter((est) => est.status === "accepted").length} estimates`,
      iconName: "CheckCircle2" as keyof typeof iconMap,
    },
    {
      title: "Pending",
      value: `Ksh ${estimates
        .filter((est) => est.status === "sent" || est.status === "draft")
        .reduce((sum, est) => sum + est.amount, 0)
        .toLocaleString()}`,
      description: `${estimates.filter((est) => est.status === "sent" || est.status === "draft").length} estimates`,
      iconName: "Clock" as keyof typeof iconMap,
    },
    {
      title: "Expired",
      value: estimates.filter((est) => est.status === "expired").length,
      description: "Need renewal",
      iconName: "AlertCircle" as keyof typeof iconMap,
    },
  ])();

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleSelectEstimate = (id: string) => {
    setSelectedEstimates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllEstimates = () => {
    if (selectedEstimates.size === filteredAndSortedEstimates.length) {
      setSelectedEstimates(new Set());
    } else {
      setSelectedEstimates(new Set(filteredAndSortedEstimates.map((e) => e.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "sent": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "rejected": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "expired": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <ModuleLayout
      title="Estimates"
      description="Create and manage estimates"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Sales", href: "/sales" },
        { label: "Estimates", href: "/estimates" },
      ]}
      actions={
        <Button onClick={() => navigate("/estimates/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Estimate
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = iconMap[stat.iconName];
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search estimates..."
          onCreateClick={() => navigate("/estimates/create")}
          createLabel="Create Estimate"
          onExportClick={() => downloadCSV(estimates, ["id", "quoteNumber", "client", "amount", "status", "issueDate", "expiryDate"], "estimates")}
          onImportClick={() => toast.info("CSV import is available in Settings > Data Management")}
          onPrintClick={() => window.print()}
          filterContent={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Bulk Actions Bar */}
        <EnhancedBulkActions
          selectedCount={selectedEstimates.size}
          onClear={() => setSelectedEstimates(new Set())}
          actions={[
            bulkSendAction(selectedEstimates, (ids) => ids.forEach((id) => submitForApprovalMutation.mutate({ id }))),
            bulkExportAction(selectedEstimates, estimates, estimateColumns, "estimates"),
            bulkCopyIdsAction(selectedEstimates),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedEstimates, (ids) => ids.forEach((id) => deleteEstimateMutation.mutate(id))),
          ]}
        />

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredAndSortedEstimates.length} estimates</span>
              <TableColumnSettings columns={estimateColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedEstimates.size === filteredAndSortedEstimates.length && filteredAndSortedEstimates.length > 0} onCheckedChange={toggleSelectAllEstimates} /></TableHead>
                  {isVisible("quoteNumber") && <TableHead className="cursor-pointer" onClick={() => toggleSort("quoteNumber")}>
                    Estimate # {sortField === "quoteNumber" && <ArrowUpDown className="inline h-4 w-4 ml-1" />}
                  </TableHead>}
                  {isVisible("client") && <TableHead className="cursor-pointer" onClick={() => toggleSort("client")}>
                    Client {sortField === "client" && <ArrowUpDown className="inline h-4 w-4 ml-1" />}
                  </TableHead>}
                  {isVisible("amount") && <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("amount")}>
                    Amount {sortField === "amount" && <ArrowUpDown className="inline h-4 w-4 ml-1" />}
                  </TableHead>}
                  {isVisible("issueDate") && <TableHead className="cursor-pointer" onClick={() => toggleSort("issueDate")}>
                    Date {sortField === "issueDate" && <ArrowUpDown className="inline h-4 w-4 ml-1" />}
                  </TableHead>}
                  {isVisible("status") && <TableHead>Status</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-muted-foreground">Loading estimates...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedEstimates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No estimates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedEstimates.map((est) => (
                    <TableRow key={est.id} className={selectedEstimates.has(est.id) ? "bg-primary/5" : ""}>
                      <TableCell><Checkbox checked={selectedEstimates.has(est.id)} onCheckedChange={() => toggleSelectEstimate(est.id)} /></TableCell>
                      {isVisible("quoteNumber") && <TableCell className="font-medium">{est.quoteNumber}</TableCell>}
                      {isVisible("client") && <TableCell>{est.client}</TableCell>}
                      {isVisible("amount") && <TableCell className="text-right font-semibold">
                        Ksh {est.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>}
                      {isVisible("issueDate") && <TableCell>{est.issueDate ? new Date(est.issueDate).toLocaleDateString() : "-"}</TableCell>}
                      {isVisible("status") && <TableCell>
                        <Badge variant="outline" className={getStatusColor(est.status)}>
                          {(est.status || 'draft').toUpperCase()}
                        </Badge>
                      </TableCell>}
                      <TableCell className="text-right">
                        <RowActionsMenu
                          primaryActions={[
                            { label: "View", icon: actionIcons.view, onClick: () => navigate(`/estimates/${est.id}`) },
                            { label: "Edit", icon: actionIcons.edit, onClick: () => navigate(`/estimates/${est.id}/edit`) },
                            { label: "Delete", icon: actionIcons.delete, onClick: () => { if(confirm("Delete this estimate?")) deleteEstimateMutation.mutate(est.id); }, variant: "destructive" },
                          ]}
                          menuActions={[
                            { label: "Send to Client", icon: <Send className="h-4 w-4" />, onClick: () => submitForApprovalMutation.mutate({ id: est.id }) },
                            { label: "Duplicate Estimate", icon: actionIcons.copy, onClick: () => navigate(`/estimates/create?clone=${est.id}`) },
                            { label: "Email Estimate", icon: actionIcons.email, onClick: () => navigate(buildCommunicationComposePath(location, "", `Estimate ${est.quoteNumber || est.id}`)), separator: true },
                            { label: "Convert to Invoice", icon: <FileText className="h-4 w-4" />, onClick: () => navigate(`/invoices/create?fromEstimate=${est.id}`) },
                            { label: "Download PDF", icon: actionIcons.download, onClick: () => { navigate(`/estimates/${est.id}`); setTimeout(() => window.print(), 500); } },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
