import { useState, useRef, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PayslipTemplate } from "@/components/PayslipTemplate";
import { trpc } from "@/lib/trpc";
import { useCurrencySettings } from "@/lib/currency";
import {
  FileText,
  Download,
  Mail,
  Archive,
  Eye,
  Search,
  Loader2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

export default function PayslipManagement() {
  const { symbol, position } = useCurrencySettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [resendDialog, setResendDialog] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch payslips
  const { data: payslips = [], isLoading, refetch } = trpc.payroll.payslips.list.useQuery({});

  // TRPC mutations
  const resendMutation = trpc.payroll.payslips.resend.useMutation({
    onSuccess: () => {
      toast.success("Payslip sent successfully");
      setResendDialog(false);
      setResendEmail("");
      setResendMessage("");
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = trpc.payroll.payslips.archive.useMutation({
    onSuccess: () => {
      toast.success("Payslip archived successfully");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Payslip-${selectedPayslip?.employeeId}-${monthFilter}`,
  });

  const handleDownload = () => {
    handlePrint();
  };

  const fmt = (amount: number) => {
    const value = amount / 100;
    if (position === "prefix") return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${symbol}`;
  };

  // Filter payslips
  const filteredPayslips = useMemo(() => {
    return payslips.filter((p: any) => {
      const matchesSearch =
        p.employee?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employee?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());

      const payslipMonth = new Date(p.payDate).toISOString().slice(0, 7);
      const matchesMonth = monthFilter === "all" || payslipMonth === monthFilter;

      return matchesSearch && matchesMonth;
    });
  }, [payslips, searchQuery, monthFilter]);

  // Transform payslip data for template
  const payslipData = selectedPayslip ? {
    id: selectedPayslip.id,
    employeeName: `${selectedPayslip.employee?.firstName} ${selectedPayslip.employee?.lastName}`,
    employeeId: selectedPayslip.employee?.id || "",
    department: selectedPayslip.employee?.department || "N/A",
    position: selectedPayslip.employee?.position || "N/A",
    payPeriod: {
      start: new Date(selectedPayslip.startDate),
      end: new Date(selectedPayslip.endDate),
    },
    basicSalary: selectedPayslip.basicSalary || 0,
    allowances: (selectedPayslip.allowances || []).map((a: any) => ({
      name: a.name,
      amount: a.amount,
    })),
    deductions: (selectedPayslip.deductions || []).map((d: any) => ({
      name: d.name,
      amount: d.amount,
    })),
    netSalary: selectedPayslip.netSalary || 0,
    bankAccount: selectedPayslip.employee?.bankAccountNumber,
    companyName: "Nexus360",
    companyAddress: "Global Operations",
    payDate: new Date(selectedPayslip.payDate),
    totalEarnings: selectedPayslip.totalEarnings || selectedPayslip.basicSalary,
    totalDeductions: selectedPayslip.totalDeductions || 0,
  } : null;

  return (
    <ModuleLayout title="Payslip Management">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters & Search */}
        <Card>
          <CardHeader>
            <CardTitle>Find Payslips</CardTitle>
            <CardDescription>View, download, or resend employee payslips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-48">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const value = d.toISOString().slice(0, 7);
                    return (
                      <SelectItem key={value} value={value}>
                        {d.toLocaleDateString("en-GB", { year: "numeric", month: "long" })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payslips Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payslips ({filteredPayslips.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredPayslips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payslips found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayslips.map((payslip: any) => (
                      <TableRow key={payslip.id}>
                        <TableCell className="font-medium">
                          {payslip.employee?.firstName} {payslip.employee?.lastName}
                        </TableCell>
                        <TableCell>
                          {new Date(payslip.startDate).toLocaleDateString("en-GB", { month: "short", day: "2-digit" })} -{" "}
                          {new Date(payslip.endDate).toLocaleDateString("en-GB", { month: "short", day: "2-digit", year: "numeric" })}
                        </TableCell>
                        <TableCell>{fmt(payslip.basicSalary || 0)}</TableCell>
                        <TableCell>{fmt(payslip.totalDeductions || 0)}</TableCell>
                        <TableCell className="font-semibold text-green-700 dark:text-green-400">
                          {fmt(payslip.netSalary || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={payslip.archived ? "bg-gray-100" : "bg-green-50 text-green-700"}>
                            {payslip.archived ? "Archived" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayslip(payslip);
                              setViewDialog(true);
                            }}
                            title="View payslip"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayslip(payslip);
                              setResendEmail(payslip.employee?.email || "");
                              setResendDialog(true);
                            }}
                            title="Resend payslip"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          {!payslip.archived && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => archiveMutation.mutate({ id: payslip.id })}
                              title="Archive payslip"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Payslip Dialog */}
        <Dialog open={viewDialog} onOpenChange={setViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payslip Preview</DialogTitle>
              <DialogDescription>
                {selectedPayslip?.employee?.firstName} {selectedPayslip?.employee?.lastName} - {monthFilter}
              </DialogDescription>
            </DialogHeader>
            {payslipData && (
              <div>
                <div className="mb-4">
                  <PayslipTemplate ref={printRef} data={payslipData} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setViewDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={handleDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Resend Payslip Dialog */}
        <Dialog open={resendDialog} onOpenChange={setResendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resend Payslip</DialogTitle>
              <DialogDescription>
                Send payslip to {selectedPayslip?.employee?.firstName} {selectedPayslip?.employee?.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a custom message..."
                  value={resendMessage}
                  onChange={(e) => setResendMessage(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResendDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!resendEmail.trim()) {
                    toast.error("Please enter an email address");
                    return;
                  }
                  resendMutation.mutate({
                    id: selectedPayslip?.id,
                    email: resendEmail,
                    message: resendMessage,
                  });
                }}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? "Sending..." : "Send Payslip"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleLayout>
  );
}
