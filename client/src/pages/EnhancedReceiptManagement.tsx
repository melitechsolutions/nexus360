/**
 * Enhanced Receipt Management Component
 * Comprehensive receipt tracking, filtering, payment reconciliation, and bulk operations
 * 
 * Features:
 * - Advanced filtering (date range, payment method, status)
 * - Bulk actions (download, email, void)
 * - Payment reconciliation view
 * - Receipt templates
 * - Email distribution
 * - Export to PDF/CSV
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  Search,
  Plus,
  Download,
  Mail,
  Trash2,
  MoreVertical,
  Filter,
  Eye,
  Printer,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";

interface ReceiptFilters {
  dateFrom?: Date;
  dateTo?: Date;
  paymentMethod?: string;
  status?: string;
  search?: string;
}

export default function EnhancedReceiptManagement() {
  const { allowed, isLoading: permissionsLoading } = useRequireFeature("accounting:receipts:view");
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState<ReceiptFilters>({});
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);

  // Fetch data
  const { data: receiptsData = [], isLoading: receiptsLoading } = trpc.receipts.list.useQuery();
  const { data: clientsData = [] } = trpc.clients.list.useQuery();

  const utils = trpc.useUtils();

  const { code: currencyCode } = useCurrencySettings();

  // Email mutation
  const emailReceiptsMutation = trpc.emailQueue.queueEmail.useMutation({
    onSuccess: (result) => {
      toast.success(`Email queued for ${selectedReceipts.size} receipts`);
      setSelectedReceipts(new Set());
      setIsEmailing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to queue emails");
      setIsEmailing(false);
    },
  });

  // Transform and filter receipts
  const filteredReceipts = useMemo(() => {
    let result = Array.isArray(receiptsData) ? receiptsData : [];

    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter((r: any) => {
        const client = (clientsData as any[]).find((c: any) => c.id === r.clientId);
        return (
          r.receiptNumber?.toLowerCase().includes(search) ||
          client?.companyName?.toLowerCase().includes(search)
        );
      });
    }

    if (filters.dateFrom) {
      result = result.filter((r: any) => new Date(r.date) >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      result = result.filter((r: any) => new Date(r.date) <= filters.dateTo!);
    }

    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      result = result.filter((r: any) => r.paymentMethod === filters.paymentMethod);
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((r: any) => r.status === filters.status);
    }

    return result.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receiptsData, filters, clientsData]);

  // Calculate statistics
  const stats = useMemo(() => {
    const receipts = filteredReceipts;
    return {
      total: receipts.length,
      totalAmount: receipts.reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
      issued: receipts.filter((r: any) => r.status === "issued").length,
      voided: receipts.filter((r: any) => r.status === "void").length,
    };
  }, [filteredReceipts]);

  if (permissionsLoading) return <Spinner className="w-8 h-8 mx-auto my-8" />;
  if (!allowed) return null;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100);
  };

  // Handlers
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedReceipts);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedReceipts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedReceipts.size === filteredReceipts.length) {
      setSelectedReceipts(new Set());
    } else {
      setSelectedReceipts(new Set(filteredReceipts.map((r: any) => r.id)));
    }
  };

  const handleEmailReceipts = async () => {
    if (selectedReceipts.size === 0) {
      toast.error("Please select at least one receipt");
      return;
    }

    setIsEmailing(true);
    try {
      const receiptsToEmail = filteredReceipts.filter((r: any) => selectedReceipts.has(r.id));
      
      for (const receipt of receiptsToEmail) {
        const client = (clientsData as any[]).find((c: any) => c.id === receipt.clientId);
        if (client?.email) {
          await emailReceiptsMutation.mutateAsync({
            toEmail: client.email,
            subject: `Receipt ${receipt.receiptNumber} from Melitech CRM`,
            htmlContent: `<p>Please find attached your receipt ${receipt.receiptNumber} for ${formatCurrency(receipt.amount)}</p>`,
            sendImmediately: false,
          });
        }
      }
    } catch (error) {
      console.error("Email error:", error);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ["Receipt #", "Client", "Amount", "Date", "Payment Method", "Status"];
      const rows = filteredReceipts.map((r: any) => [
        r.receiptNumber,
        (clientsData as any[]).find((c: any) => c.id === r.clientId)?.companyName || "Unknown",
        formatCurrency(r.amount),
        format(new Date(r.date), "yyyy-MM-dd"),
        r.paymentMethod,
        r.status,
      ]);

      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipts_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Receipts exported successfully");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickDateFilter = (days: number) => {
    const to = new Date();
    const from = subDays(to, days);
    setFilters((prev) => ({
      ...prev,
      dateFrom: startOfDay(from),
      dateTo: endOfDay(to),
    }));
  };

  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Receipts", href: "/receipts" },
      ]}
      title="Receipt Management"
      description="Track and manage all receipt transactions"
      icon={<Receipt className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button onClick={() => navigate("/receipts/create")} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Receipt
            </Button>
          </div>

          <div className="flex gap-2">
            {selectedReceipts.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEmailReceipts}
                  disabled={isEmailing}
                >
                  {isEmailing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Emailing...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Email ({selectedReceipts.size})
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export ({selectedReceipts.size})
                    </>
                  )}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExporting || filteredReceipts.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="Total Receipts" value={stats.total} description={<>{stats.issued} issued</>} color="border-l-orange-500" />

          <StatsCard label="Total Amount" value={formatCurrency(stats.totalAmount)} description="Combined value" color="border-l-purple-500" />

          <StatsCard label="Issued" value={stats.issued} description="Active receipts" color="border-l-green-500" />

          <StatsCard label="Voided" value={stats.voided} description="Cancelled receipts" color="border-l-blue-500" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Search receipt number or client..."
                  value={filters.search || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />

                <Select
                  value={filters.paymentMethod || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      paymentMethod: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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

                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="void">Voided</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDateFilter(7)}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickDateFilter(30)}
                  >
                    Last 30 days
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
            <CardDescription>{filteredReceipts.length} receipts found</CardDescription>
          </CardHeader>
          <CardContent>
            {receiptsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedReceipts.size === filteredReceipts.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No receipts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReceipts.map((receipt: any) => {
                        const client = (clientsData as any[]).find(
                          (c: any) => c.id === receipt.clientId
                        );
                        return (
                          <TableRow key={receipt.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedReceipts.has(receipt.id)}
                                onCheckedChange={() => handleToggleSelect(receipt.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                            <TableCell>{client?.companyName || "Unknown"}</TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(receipt.amount)}
                            </TableCell>
                            <TableCell>{format(new Date(receipt.date), "yyyy-MM-dd")}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{receipt.paymentMethod}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={receipt.status === "issued" ? "default" : "destructive"}
                              >
                                {receipt.status === "issued" ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Issued
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Voided
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/receipts/${receipt.id}`)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/receipts/${receipt.id}/edit`)}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      try {
                                        await emailReceiptsMutation.mutateAsync({
                                          toEmail: client?.email || "",
                                          subject: `Receipt ${receipt.receiptNumber}`,
                                          htmlContent: `<p>Receipt for ${formatCurrency(receipt.amount)}</p>`,
                                          sendImmediately: true,
                                        });
                                        toast.success("Receipt email sent");
                                      } catch (error) {
                                        toast.error("Failed to send email");
                                      }
                                    }}
                                  >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
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
