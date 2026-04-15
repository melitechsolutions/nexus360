import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Send, Trash2, Download, DollarSign, FileCheck, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";

export default function Payslips() {
  useRequireFeature("hr:payroll:view");
  const { formatAmount } = useCurrencySettings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateForm, setGenerateForm] = useState({ payPeriod: "", payDate: "" });
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const payslips = trpc.payslips.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    payPeriod: periodFilter || undefined,
  });
  const payslipDetail = trpc.payslips.getById.useQuery(
    { id: selectedPayslip! },
    { enabled: !!selectedPayslip }
  );
  const utils = trpc.useUtils();

  const generate = trpc.payslips.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.generated} payslips`);
      if (data.errors.length) data.errors.forEach(e => toast.error(e));
      setShowGenerate(false);
      setGenerateForm({ payPeriod: "", payDate: "" });
      utils.payslips.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const sendPayslips = trpc.payslips.sendPayslips.useMutation({
    onSuccess: (data) => {
      toast.success(`Sent ${data.sent}/${data.total} payslips`);
      if (data.errors.length) data.errors.forEach(e => toast.error(e));
      setSelectedIds([]);
      utils.payslips.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePayslip = trpc.payslips.delete.useMutation({
    onSuccess: () => { toast.success("Deleted"); setDeleteId(null); utils.payslips.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const data = (payslips.data || []) as any[];
  const filtered = data.filter((p: any) =>
    !search || `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: data.length,
    draft: data.filter(p => p.status === "draft").length,
    generated: data.filter(p => p.status === "generated").length,
    sent: data.filter(p => p.status === "sent").length,
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <ModuleLayout
      title="Payslips"
      description="Generate and send employee payslips"
      icon={FileText}
      breadcrumbs={[{ label: "HR", href: "/employees" }, { label: "Payroll", href: "/payroll" }, { label: "Payslips" }]}
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatsCard label="Total Payslips" value={stats.total} icon={<FileText className="h-5 w-5" />} color="border-l-blue-500" />
        <StatsCard label="Generated" value={stats.generated} icon={<FileCheck className="h-5 w-5" />} color="border-l-green-500" />
        <StatsCard label="Sent" value={stats.sent} icon={<Send className="h-5 w-5" />} color="border-l-purple-500" />
        <StatsCard label="Draft" value={stats.draft} icon={<Clock className="h-5 w-5" />} color="border-l-orange-500" />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
          </SelectContent>
        </Select>
        <Input type="month" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="w-[180px]" placeholder="Pay Period" />
        {selectedIds.length > 0 && (
          <Button variant="secondary" onClick={() => sendPayslips.mutate({ payslipIds: selectedIds })} disabled={sendPayslips.isPending}>
            <Send className="h-4 w-4 mr-2" /> Send Selected ({selectedIds.length})
          </Button>
        )}
        <Button onClick={() => setShowGenerate(true)}>
          <DollarSign className="h-4 w-4 mr-2" /> Generate Payslips
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {payslips.isLoading ? (
            <div className="flex justify-center p-8"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? filtered.map((p: any) => p.id) : [])}
                      checked={selectedIds.length === filtered.length && filtered.length > 0} />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No payslips found. Generate payslips for a pay period.</TableCell></TableRow>
                ) : filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{p.firstName} {p.lastName}<br /><span className="text-xs text-muted-foreground">{p.employeeNumber}</span></TableCell>
                    <TableCell>{p.payPeriod}</TableCell>
                    <TableCell>{p.payDate ? format(new Date(p.payDate), "MMM d, yyyy") : "-"}</TableCell>
                    <TableCell className="text-right text-green-600">{formatAmount(p.grossPay || 0)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatAmount(p.totalDeductions || 0)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(p.netPay || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "sent" ? "default" : p.status === "generated" ? "secondary" : "outline"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setSelectedPayslip(p.id)} title="View"><FileText className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => sendPayslips.mutate({ payslipIds: [p.id] })} title="Send"><Send className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(p.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payslip Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>{payslipDetail.data?.firstName} {payslipDetail.data?.lastName} - {payslipDetail.data?.payPeriod}</DialogDescription>
          </DialogHeader>
          {payslipDetail.isLoading ? <Spinner /> : payslipDetail.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Employee #</div><div className="font-medium">{payslipDetail.data.employeeNumber}</div>
                <div>Department</div><div className="font-medium">{payslipDetail.data.department}</div>
                <div>Position</div><div className="font-medium">{payslipDetail.data.position}</div>
                <div>Tax ID</div><div className="font-medium">{payslipDetail.data.taxId || "-"}</div>
                <div>NHIF #</div><div className="font-medium">{payslipDetail.data.nhifNumber || "-"}</div>
                <div>NSSF #</div><div className="font-medium">{payslipDetail.data.nssfNumber || "-"}</div>
              </div>
              <hr />
              <div className="space-y-1">
                <div className="flex justify-between"><span>Basic Salary</span><span className="font-medium">{formatAmount(payslipDetail.data.basicSalary || 0)}</span></div>
                {(() => { try { return JSON.parse(payslipDetail.data.allowancesBreakdown || "[]"); } catch { return []; } })().map((a: any, i: number) => (
                  <div key={i} className="flex justify-between text-green-600"><span>{a.name}</span><span>+ {formatAmount(a.amount)}</span></div>
                ))}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Gross Pay</span><span>{formatAmount(payslipDetail.data.grossPay || 0)}</span></div>
              </div>
              <div className="space-y-1">
                {(() => { try { return JSON.parse(payslipDetail.data.deductionsBreakdown || "[]"); } catch { return []; } })().map((d: any, i: number) => (
                  <div key={i} className="flex justify-between text-red-600"><span>{d.name}</span><span>- {formatAmount(d.amount)}</span></div>
                ))}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Total Deductions</span><span className="text-red-600">{formatAmount(payslipDetail.data.totalDeductions || 0)}</span></div>
              </div>
              <div className="flex justify-between text-lg font-bold bg-muted p-3 rounded-lg">
                <span>Net Pay</span><span>{formatAmount(payslipDetail.data.netPay || 0)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Payslips</DialogTitle>
            <DialogDescription>Generate payslips for all active employees for a pay period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Pay Period</label>
              <Input type="month" value={generateForm.payPeriod} onChange={(e) => setGenerateForm(p => ({ ...p, payPeriod: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Pay Date</label>
              <Input type="date" value={generateForm.payDate} onChange={(e) => setGenerateForm(p => ({ ...p, payDate: e.target.value }))} />
            </div>
            <p className="text-sm text-muted-foreground">This will calculate PAYE, NHIF/SHIF, NSSF, and Housing Levy for all active employees using Kenyan tax bands.</p>
            <Button className="w-full" disabled={!generateForm.payPeriod || !generateForm.payDate || generate.isPending} onClick={() => generate.mutate(generateForm)}>
              {generate.isPending ? <Spinner className="mr-2" /> : null} Generate Payslips
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Payslip?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deletePayslip.mutate({ id: deleteId })}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}
