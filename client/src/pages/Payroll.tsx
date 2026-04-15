import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Eye,
  Trash2,
  FileDown,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "paid" | "pending" | "processing";
  paymentDate: string;
  month: string;
}

export default function Payroll() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("2024-10");
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState<"" | "paid" | "pending" | "processing">("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Fetch real data from backend
  const { data: data = [], isLoading } = trpc.payroll.list.useQuery();
  const deleteMut = trpc.payroll.delete.useMutation();
  const updateMut = trpc.payroll.update.useMutation();
  const downloadP9 = trpc.payroll.downloadP9.useMutation();
  const exportMut = trpc.payroll.bulkExport.useMutation();
  const bulkUpdateStatusMut = trpc.payroll.bulkUpdateStatus.useMutation();
  const bulkDeleteMut = trpc.payroll.bulkDelete.useMutation();
  const listQ = trpc.payroll.list;
  const utils = trpc.useUtils();

  const [records, setRecords] = useState<PayrollRecord[]>([]);

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setRecords(
        data.map((r: any) => ({
          id: r.id,
          employeeId: r.employeeId,
          employeeName: r.employeeName || '',
          department: r.department || '',
          basicSalary: r.basicSalary,
          allowances: r.allowances || 0,
          deductions: r.deductions || 0,
          netSalary: r.netSalary,
          status: r.status,
          paymentDate: r.paymentDate || '',
          month: r.month || '',
        }))
      );
    }
  }, [data]);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesMonth = record.month === monthFilter;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "processing":
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-3 w-3" />;
      case "pending":
        return <AlertCircle className="h-3 w-3" />;
      case "processing":
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const handleMarkPaid = (id: string) => {
    updateMut.mutate(
      { id, status: "paid" },
      {
        onSuccess() {
          toast.success("Marked as paid");
          utils.payroll.list.refetch();
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this payroll record?")) {
      deleteMut.mutate(id, {
        onSuccess() {
          toast.success("Deleted");
          utils.payroll.list.refetch();
        },
      });
    }
  };

  const handleDownloadP9 = (employeeId: string) => {
    downloadP9.mutate(
      { employeeId },
      {
        onSuccess() {
          toast.success("P9 downloaded");
        },
      }
    );
  };

  const handleExport = () => {
    if (selectedPayrollIds.size === 0) {
      toast.error("Select at least one record to export");
      return;
    }

    setIsExporting(true);
    exportMut.mutate(
      {
        payrollIds: Array.from(selectedPayrollIds),
        format: exportFormat,
      },
      {
        onSuccess(response) {
          // Convert base64 to blob and download
          const binaryString = atob(response.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], {
            type:
              exportFormat === "xlsx"
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : "text/csv",
          });

          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `payroll-export-${new Date().toISOString().split("T")[0]}.${exportFormat}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          setSelectedPayrollIds(new Set());
          setIsExporting(false);
          toast.success(`Exported ${selectedPayrollIds.size} records`);
        },
        onError(error) {
          setIsExporting(false);
          toast.error("Export failed: " + error.message);
        },
      }
    );
  };

  const handleBulkUpdateStatus = () => {
    if (selectedPayrollIds.size === 0 || !bulkStatusUpdate) {
      toast.error("Select records and a status to update");
      return;
    }

    setIsBulkUpdating(true);
    bulkUpdateStatusMut.mutate(
      {
        payrollIds: Array.from(selectedPayrollIds),
        status: bulkStatusUpdate,
      },
      {
        onSuccess() {
          setSelectedPayrollIds(new Set());
          setBulkStatusUpdate("");
          setIsBulkUpdating(false);
          utils.payroll.list.refetch();
          toast.success(`Updated status for ${selectedPayrollIds.size} records`);
        },
        onError(error) {
          setIsBulkUpdating(false);
          toast.error("Update failed: " + error.message);
        },
      }
    );
  };

  const handleBulkDelete = () => {
    if (selectedPayrollIds.size === 0) {
      toast.error("Select records to delete");
      return;
    }

    if (
      !confirm(
        `Delete ${selectedPayrollIds.size} payroll record(s)? This cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkDeleting(true);
    bulkDeleteMut.mutate(
      {
        payrollIds: Array.from(selectedPayrollIds),
      },
      {
        onSuccess() {
          setSelectedPayrollIds(new Set());
          setIsBulkDeleting(false);
          utils.payroll.list.refetch();
          toast.success(`Deleted ${selectedPayrollIds.size} records`);
        },
        onError(error) {
          setIsBulkDeleting(false);
          toast.error("Delete failed: " + error.message);
        },
      }
    );
  };

  const totalGrossPay = filteredRecords.reduce((sum, r) => sum + r.basicSalary + r.allowances, 0);
  const totalDeductions = filteredRecords.reduce((sum, r) => sum + r.deductions, 0);
  const totalNetPay = filteredRecords.reduce((sum, r) => sum + r.netSalary, 0);
  const paidCount = filteredRecords.filter((r) => r.status === "paid").length;

  return (
    <ModuleLayout
      title="Payroll Management"
      description="Process and manage employee salaries"
      icon={<DollarSign className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "HR", href: "/hr" },
        { label: "Payroll" },
      ]}
      actions={
        <Button
          onClick={() => setLocation("/payroll/tax-compliance")}
          className="gap-2"
          variant="outline"
        >
          <FileText className="h-4 w-4" />
          Tax Compliance Reports
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Gross Pay"
            value={<>Ksh {(totalGrossPay / 100).toLocaleString()}</>}
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-blue-500"
          />

          <StatsCard
            label="Deductions"
            value={<>Ksh {(totalDeductions / 100).toLocaleString()}</>}
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-red-500"
          />

          <StatsCard
            label="Net Pay"
            value={<>Ksh {(totalNetPay / 100).toLocaleString()}</>}
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard label="Paid" value={paidCount} icon={<CheckCircle2 className="h-5 w-5" />} color="border-l-purple-500" />
        </div>

        {/* Bulk Actions Toolbar */}
        {filteredRecords.length > 0 && (
          <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950">
            <CardContent className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedPayrollIds.size === filteredRecords.length && filteredRecords.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPayrollIds(new Set(filteredRecords.map((r) => r.id)));
                      } else {
                        setSelectedPayrollIds(new Set());
                      }
                    }}
                  />
                  <span className="text-sm font-medium">
                    {selectedPayrollIds.size > 0
                      ? `${selectedPayrollIds.size} selected`
                      : "Select records to manage"}
                  </span>
                </div>
              </div>

              {selectedPayrollIds.size > 0 && (
                <div className="space-y-3">
                  {/* Status Update */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={bulkStatusUpdate}
                      onValueChange={(value) =>
                        setBulkStatusUpdate(value as "" | "paid" | "pending" | "processing")
                      }
                    >
                      <SelectTrigger className="w-40 bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Mark as Paid</SelectItem>
                        <SelectItem value="pending">Mark as Pending</SelectItem>
                        <SelectItem value="processing">Mark as Processing</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleBulkUpdateStatus}
                      disabled={isBulkUpdating || !bulkStatusUpdate}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {isBulkUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Status"
                      )}
                    </Button>
                  </div>

                  {/* Export and Delete Actions */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={exportFormat}
                      onValueChange={(value) => setExportFormat(value as "xlsx" | "csv")}
                    >
                      <SelectTrigger className="w-32 bg-white dark:bg-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="gap-2"
                      size="sm"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FileDown className="h-4 w-4" />
                          Export
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                    >
                      {isBulkDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-10">October 2024</SelectItem>
                  <SelectItem value="2024-09">September 2024</SelectItem>
                  <SelectItem value="2024-08">August 2024</SelectItem>
                  <SelectItem value="2024-07">July 2024</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Records */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading payroll records...
              </CardContent>
            </Card>
          ) : filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No payroll records found.
              </CardContent>
            </Card>
          ) : (
            filteredRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-start gap-4">
                    <Checkbox
                      checked={selectedPayrollIds.has(record.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedPayrollIds);
                        if (checked) {
                          newSet.add(record.id);
                        } else {
                          newSet.delete(record.id);
                        }
                        setSelectedPayrollIds(newSet);
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-lg mb-2">
                        {record.employeeName}
                        <span className="text-sm text-muted-foreground ml-2">({record.employeeId})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Department:</span>
                          <div className="font-medium">{record.department}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Month:</span>
                          <div className="font-medium">{record.month}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Basic Salary:</span>
                          <div className="font-medium">Ksh {(record.basicSalary / 100).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Allowances:</span>
                          <div className="font-medium text-green-600">+Ksh {(record.allowances / 100).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Deductions:</span>
                          <div className="font-medium text-red-600">-Ksh {(record.deductions / 100).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Net Salary:</span>
                          <div className="font-bold text-lg">Ksh {(record.netSalary / 100).toLocaleString()}</div>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(record.status)} className="gap-1">
                        {getStatusIcon(record.status)}
                        {record.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => setLocation(`/payroll/${record.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {record.status !== "paid" && (
                        <Button size="sm" onClick={() => handleMarkPaid(record.id)}>
                          Mark Paid
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDownloadP9(record.employeeId)}>
                        <Download className="h-4 w-4 mr-2" />
                        P9
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}

