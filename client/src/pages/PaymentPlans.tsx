import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Edit2, ChevronDown, Calendar } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

type PaymentPlan = {
  id: string;
  invoiceId: string;
  clientId: string;
  numInstallments: number;
  installmentAmount: number;
  frequencyDays: number;
  startDate: string;
  nextInstallmentDue: string;
  lastInstallmentDate: string | null;
  completedInstallments: number;
  totalPaid: number;
  status: "active" | "paused" | "completed" | "cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type Installment = {
  id: string;
  paymentPlanId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "overdue" | "skipped";
  paidDate: string | null;
  paidAmount: number | null;
  paymentId: string | null;
  notes: string | null;
  createdAt: string;
};

export function PaymentPlans() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    invoiceId: "",
    numInstallments: 3,
    frequencyDays: 30,
    notes: "",
  });

  // Fetch data
  const { data: paymentPlansList, refetch: refetchPlans } = trpc.paymentPlans.list.useQuery({});
  const { data: clients } = trpc.clients.list.useQuery(undefined);
  const { data: invoices } = trpc.invoices.list.useQuery({ limit: 500 });

  // Mutations
  const createMutation = trpc.paymentPlans.createFromInvoice.useMutation({
    onSuccess: async () => {
      toast.success("Payment plan created successfully");
      setIsOpen(false);
      resetForm();
      await refetchPlans();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create payment plan");
    },
  });

  const deleteMutation = trpc.paymentPlans.delete.useMutation({
    onSuccess: async () => {
      toast.success("Payment plan deleted");
      setDeleteId(null);
      await refetchPlans();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete payment plan");
    },
  });

  const updateMutation = trpc.paymentPlans.update.useMutation({
    onSuccess: async () => {
      toast.success("Payment plan updated");
      await refetchPlans();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update payment plan");
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      invoiceId: "",
      numInstallments: 3,
      frequencyDays: 30,
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoiceId) {
      toast.error("Please select an invoice");
      return;
    }

    createMutation.mutate({
      invoiceId: formData.invoiceId,
      numInstallments: formData.numInstallments,
      frequencyDays: formData.frequencyDays,
      startDate: new Date().toISOString(),
      notes: formData.notes || undefined,
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleToggleStatus = (plan: PaymentPlan) => {
    const newStatus = plan.status === "active" ? "paused" : "active";
    updateMutation.mutate({
      id: plan.id,
      status: newStatus as any,
    });
  };

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.companyName || clientId;
  };

  const getInvoiceNumber = (invoiceId: string) => {
    return invoices?.find((i) => i.id === invoiceId)?.invoiceNumber || invoiceId;
  };

  const getInvoiceTotal = (invoiceId: string) => {
    return invoices?.find((i) => i.id === invoiceId)?.total || 0;
  };

  const stats = useMemo(() => {
    if (!paymentPlansList) return { total: 0, active: 0, completed: 0, paused: 0 };
    return {
      total: paymentPlansList.length,
      active: paymentPlansList.filter((p: any) => p.status === "active").length,
      completed: paymentPlansList.filter((p: any) => p.status === "completed").length,
      paused: paymentPlansList.filter((p: any) => p.status === "paused").length,
    };
  }, [paymentPlansList]);

  return (
    <ModuleLayout
      title="Payment Plans"
      description="Split invoices into installments"
      icon={<Calendar className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Finance", href: "/accounting" },
        { label: "Payment Plans" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Payment Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Create Payment Plan</DialogTitle>
              <DialogDescription>
                Split an invoice into installments for easier payment
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invoice Selection */}
              <div className="space-y-2">
                <Label htmlFor="invoice">Invoice *</Label>
                <Select
                  value={formData.invoiceId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, invoiceId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices
                      ?.filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
                      .map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - Ksh{" "}
                          {(invoice.total / 100).toLocaleString()} ({invoice.status})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Installments */}
              <div className="space-y-2">
                <Label htmlFor="numInstallments">
                  Number of Installments *
                </Label>
                <Input
                  type="number"
                  min="2"
                  max="24"
                  value={formData.numInstallments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numInstallments: parseInt(e.target.value),
                    })
                  }
                />
                {formData.invoiceId && (
                  <p className="text-sm text-gray-600">
                    Each installment: Ksh{" "}
                    {formatCurrency(
                      Math.ceil(getInvoiceTotal(formData.invoiceId) / (100 * formData.numInstallments))
                    )}
                  </p>
                )}
              </div>

              {/* Frequency (Days) */}
              <div className="space-y-2">
                <Label htmlFor="frequencyDays">Days Between Installments *</Label>
                <Select
                  value={formData.frequencyDays.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, frequencyDays: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Weekly (7 days)</SelectItem>
                    <SelectItem value="14">Bi-weekly (14 days)</SelectItem>
                    <SelectItem value="30">Monthly (30 days)</SelectItem>
                    <SelectItem value="45">45 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">Quarterly (90 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="e.g., Payment terms, special instructions"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                Create Payment Plan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard label="Total Plans" value={stats.total} color="border-l-orange-500" />
        <StatsCard label="Active" value={stats.active} color="border-l-purple-500" />
        <StatsCard label="Completed" value={stats.completed} color="border-l-green-500" />
        <StatsCard label="Paused" value={stats.paused} color="border-l-blue-500" />
      </div>

      {/* Payment Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plans</CardTitle>
          <CardDescription>
            {paymentPlansList?.length || 0} payment plans configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!paymentPlansList || paymentPlansList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payment plans yet. Create one to split an invoice into installments.
            </div>
          ) : (
            <div className="space-y-4">
              {paymentPlansList.map((plan: any) => (
                <div
                  key={plan.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">
                          {getInvoiceNumber(plan.invoiceId)}
                        </span>
                        <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                          {plan.status}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {plan.completedInstallments} of {plan.numInstallments} paid
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Client:</span>
                          <p className="font-medium">{getClientName(plan.clientId)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Installment Amount:</span>
                          <p className="font-medium">
                            Ksh {(plan.installmentAmount / 100).toLocaleString("en-KE")}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Next Due:</span>
                          <p className="font-medium">{formatDate(plan.nextInstallmentDue)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Paid:</span>
                          <p className="font-medium">
                            Ksh {(plan.totalPaid / 100).toLocaleString("en-KE")}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(plan.completedInstallments / plan.numInstallments) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-4">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedPlan(plan.id)}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full max-w-2xl">
                          <SheetHeader>
                            <SheetTitle>
                              Payment Plan - {getInvoiceNumber(plan.invoiceId)}
                            </SheetTitle>
                            <SheetDescription>
                              Installment details and payment history
                            </SheetDescription>
                          </SheetHeader>
                          <InstallmentsDetail planId={plan.id} />
                        </SheetContent>
                      </Sheet>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(plan)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(plan.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Plan</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the payment plan and all its installment records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600"
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

/**
 * Detail view for installments
 */
function InstallmentsDetail({ planId }: { planId: string }) {
  const { data: plan } = trpc.paymentPlans.getById.useQuery(planId);
  const { data: invoices } = trpc.invoices.list.useQuery({ limit: 500 });

  if (!plan) {
    return <div className="text-center py-4">Loading...</div>;
  }

  const invoice = invoices?.find((i) => i.id === plan.invoiceId);

  return (
    <div className="space-y-4 mt-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Invoice:</span>
          <p className="font-semibold">{invoice?.invoiceNumber || "No invoice"}</p>
        </div>
        <div>
          <span className="text-gray-600">Invoice Total:</span>
          <p className="font-semibold">
            Ksh {(invoice?.total ? invoice.total / 100 : 0).toLocaleString("en-KE")}
          </p>
        </div>
        <div>
          <span className="text-gray-600">Status:</span>
          <Badge className="mt-1">{plan.status}</Badge>
        </div>
        <div>
          <span className="text-gray-600">Progress:</span>
          <p className="font-semibold">
            {plan.completedInstallments}/{plan.numInstallments} paid
          </p>
        </div>
      </div>

      {/* Installments Table */}
      <div>
        <h3 className="font-semibold mb-2">Installments</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Paid Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(plan.installments) && plan.installments.map((inst: Installment) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.installmentNumber}</TableCell>
                  <TableCell>{formatDate(inst.dueDate)}</TableCell>
                  <TableCell>
                    Ksh {(inst.amount / 100).toLocaleString("en-KE")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inst.status === "paid"
                          ? "default"
                          : inst.status === "overdue"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {inst.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inst.paidDate ? formatDate(inst.paidDate) : "-"}
                  </TableCell>
                  <TableCell>
                    {inst.paidAmount
                      ? `Ksh ${(inst.paidAmount / 100).toLocaleString("en-KE")}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Notes */}
      {plan.notes && (
        <div className="bg-blue-50 p-3 rounded text-sm">
          <strong>Notes:</strong> {plan.notes}
        </div>
      )}
    </div>
  );
}

export default PaymentPlans;
