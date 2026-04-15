import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGradientCard, animations } from "@/lib/designSystem";
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
  Receipt,
  Search,
  Plus,
  DollarSign,
  CheckCircle2,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Download,
  ArrowUpDown,
  Loader2,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

const iconMap = {
  DollarSign,
  CheckCircle2,
  Calendar,
};

interface ReceiptRecord {
  id: string;
  receiptNumber: string;
  client: string;
  clientEmail?: string;
  amount: number;
  paymentMethod: "cash" | "bank-transfer" | "mpesa" | "cheque" | "card";
  date: string;
  invoice: string;
  status: "issued" | "void";
}

type SortField = "receiptNumber" | "client" | "amount" | "date" | "paymentMethod" | "status";
type SortOrder = "asc" | "desc";

const PAYMENT_METHOD_ICONS: Record<string, any> = {
  cash: Banknote,
  "bank-transfer": Building2,
  mpesa: Smartphone,
  cheque: FileText,
  card: CreditCard,
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-500/10 text-green-500 border-green-500/20",
  "bank-transfer": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  mpesa: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cheque: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  card: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

export default function Receipts() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("accounting:receipts:view");
  
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());

  // Fetch real data from backend
  const { data: receiptsData = [], isLoading: isLoadingReceipts } = trpc.receipts.list.useQuery();
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  
  // Delete mutation
  const deleteReceiptMutation = trpc.receipts.delete.useMutation({
    onSuccess: () => {
      utils.receipts.list.invalidate();
      toast.success("Receipt deleted successfully");
      setSelectedReceipts(new Set());
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete receipt");
    },
  });

  // Convert frozen Drizzle objects to plain JS for React dependencies
  const plainReceiptsData = Array.isArray(receiptsData)
    ? receiptsData.map((rec: any) => JSON.parse(JSON.stringify(rec)))
    : [];
  const plainClientsData = Array.isArray(clientsData)
    ? clientsData.map((client: any) => JSON.parse(JSON.stringify(client)))
    : [];

  // Transform backend data to display format
  const receipts: ReceiptRecord[] = useMemo(() => {
    return (plainReceiptsData as any[]).map((rec: any) => ({
      id: rec.id,
      receiptNumber: rec.receiptNumber || `REC-${rec.id.slice(0, 8)}`,
      client: (plainClientsData as any[]).find((c: any) => c.id === rec.clientId)?.companyName || "Unknown Client",
      clientEmail: (plainClientsData as any[]).find((c: any) => c.id === rec.clientId)?.email,
      amount: (rec.amount || 0) / 100,
      paymentMethod: rec.paymentMethod || "cash",
      date: rec.date ? format(new Date(rec.date), "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
      invoice: rec.invoiceId ? `INV-${rec.invoiceId.slice(0, 8)}` : "N/A",
      status: rec.status || "issued",
    }));
  }, [plainReceiptsData, plainClientsData]);

  // Filter and sort receipts
  const filteredAndSortedReceipts = useMemo(() => {
    let result = receipts.filter((receipt) => {
      const matchesSearch =
        receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.invoice.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMethod = methodFilter === "all" || receipt.paymentMethod === methodFilter;
      const matchesStatus = statusFilter === "all" || receipt.status === statusFilter;

      return matchesSearch && matchesMethod && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "amount") {
        aVal = parseFloat(String(aVal));
        bVal = parseFloat(String(bVal));
      } else if (sortField === "date") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [receipts, searchQuery, methodFilter, statusFilter, sortField, sortOrder]);

  const stats = useMemo(() => [
    {
      title: "Total Received",
      value: `Ksh ${receipts.reduce((sum, rec) => sum + rec.amount, 0).toLocaleString()}`,
      description: "All time",
      iconName: "DollarSign" as keyof typeof iconMap,
    },
    {
      title: "Issued Receipts",
      value: receipts.filter((rec) => rec.status === "issued").length,
      description: "Active receipts",
      iconName: "CheckCircle2" as keyof typeof iconMap,
    },
    {
      title: "This Month",
      value: `Ksh ${receipts
        .filter((rec) => {
          const recDate = new Date(rec.date);
          const now = new Date();
          return recDate.getMonth() === now.getMonth() && recDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, rec) => sum + rec.amount, 0)
        .toLocaleString()}`,
      description: "Current month",
      iconName: "Calendar" as keyof typeof iconMap,
    },
  ], [receipts]);

  // Action handlers
  const handleView = (id: string) => {
    navigate(`/receipts/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/receipts/${id}/edit`);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this receipt?")) {
      deleteReceiptMutation.mutate(id);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedReceipts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReceipts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedReceipts.size === filteredAndSortedReceipts.length) {
      setSelectedReceipts(new Set());
    } else {
      setSelectedReceipts(new Set(filteredAndSortedReceipts.map((rec) => rec.id)));
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const dataToExport = selectedReceipts.size > 0 
        ? filteredAndSortedReceipts.filter((rec) => selectedReceipts.has(rec.id))
        : filteredAndSortedReceipts;

      const headers = ["Receipt #", "Client", "Amount (Ksh)", "Date", "Payment Method", "Invoice", "Status"];
      const rows = dataToExport.map((rec) => [
        rec.receiptNumber,
        rec.client,
        rec.amount.toLocaleString(),
        rec.date,
        rec.paymentMethod,
        rec.invoice,
        rec.status,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipts_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Receipts exported successfully");
    } catch (error) {
      toast.error("Failed to export receipts");
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedReceipts.size === 0) {
      toast.error("No receipts selected");
      return;
    }

    if (confirm(`Delete ${selectedReceipts.size} receipt(s)? This action cannot be undone.`)) {
      selectedReceipts.forEach((id) => {
        deleteReceiptMutation.mutate(id);
      });
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <ModuleLayout
      title="Receipts"
      description="Manage payment receipts"
      icon={<Receipt className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Receipts", href: "/receipts" },
      ]}
      actions={
        <Button onClick={() => navigate("/receipts/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Receipt
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search and Filter */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search receipts by number, client, or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
              <SelectItem value="mpesa">M-Pesa</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting || filteredAndSortedReceipts.length === 0}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, index) => {
            const Icon = iconMap[stat.iconName];
            const colorSchemes = ["blue", "emerald", "purple"] as const;
            const colorScheme = colorSchemes[index % colorSchemes.length];
            return (
              <Card key={stat.title} className={getGradientCard(colorScheme)}>
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

        {/* Bulk Actions Bar */}
        {selectedReceipts.size > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedReceipts.size} receipt(s) selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReceipts(new Set())}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Receipts Table */}
        <Card className={getGradientCard("slate")}>
          <CardHeader>
            <CardTitle className={animations.fadeIn}>All Receipts</CardTitle>
            <CardDescription>
              Manage and track all your receipts ({filteredAndSortedReceipts.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingReceipts ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading receipts...
              </div>
            ) : filteredAndSortedReceipts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No receipts found. Create your first receipt to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedReceipts.size === filteredAndSortedReceipts.length && filteredAndSortedReceipts.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("receiptNumber")}>
                        <div className="flex items-center gap-2">
                          Receipt #
                          {sortField === "receiptNumber" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("client")}>
                        <div className="flex items-center gap-2">
                          Client
                          {sortField === "client" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("amount")}>
                        <div className="flex items-center gap-2">
                          Amount
                          {sortField === "amount" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("date")}>
                        <div className="flex items-center gap-2">
                          Date
                          {sortField === "date" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("paymentMethod")}>
                        <div className="flex items-center gap-2">
                          Payment Method
                          {sortField === "paymentMethod" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}>
                        <div className="flex items-center gap-2">
                          Status
                          {sortField === "status" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedReceipts.map((receipt) => {
                      const MethodIcon = PAYMENT_METHOD_ICONS[receipt.paymentMethod] || Banknote;
                      return (
                        <TableRow
                          key={receipt.id}
                          className={selectedReceipts.has(receipt.id) ? "bg-blue-50" : ""}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedReceipts.has(receipt.id)}
                              onChange={() => handleToggleSelect(receipt.id)}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                          <TableCell>{receipt.client}</TableCell>
                          <TableCell>Ksh {(receipt.amount || 0).toLocaleString()}</TableCell>
                          <TableCell>{receipt.date ? new Date(receipt.date).toLocaleDateString() : "-"}</TableCell>
                          <TableCell>
                            <Badge className={PAYMENT_METHOD_COLORS[receipt.paymentMethod]}>
                              <MethodIcon className="h-3 w-3 mr-1" />
                              {receipt.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>{receipt.invoice}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {receipt.status === "issued" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                              ) : null}
                              {receipt.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(receipt.id)}
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(receipt.id)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(receipt.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
