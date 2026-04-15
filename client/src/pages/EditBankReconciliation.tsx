import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building, ArrowLeft, Loader2 } from "lucide-react";

export default function EditBankReconciliation() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    bankAccount: "",
    statementDate: new Date().toISOString().split("T")[0],
    openingBalance: "",
    closingBalance: "",
    deposits: "",
    withdrawals: "",
    reconciliationStatus: "pending",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const { data: bankReconciliation } = trpc.bankReconciliation.getById.useQuery(
    id || "",
    { enabled: !!id }
  );

  useEffect(() => {
    if (bankReconciliation) {
      setFormData({
        bankAccount: bankReconciliation.bankAccount || "",
        statementDate: bankReconciliation.statementDate
          ? new Date(bankReconciliation.statementDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        openingBalance: bankReconciliation.openingBalance ? (bankReconciliation.openingBalance / 100).toString() : "",
        closingBalance: bankReconciliation.closingBalance ? (bankReconciliation.closingBalance / 100).toString() : "",
        deposits: bankReconciliation.deposits ? (bankReconciliation.deposits / 100).toString() : "",
        withdrawals: bankReconciliation.withdrawals ? (bankReconciliation.withdrawals / 100).toString() : "",
        reconciliationStatus: bankReconciliation.reconciliationStatus || "pending",
        notes: bankReconciliation.notes || "",
      });
      setIsLoading(false);
    }
  }, [bankReconciliation]);

  const updateBankReconciliationMutation = trpc.bankReconciliation.update.useMutation({
    onSuccess: () => {
      toast.success("Bank reconciliation updated successfully!");
      utils.bankReconciliation.list.invalidate();
      utils.bankReconciliation.getById.invalidate(id || "");
      navigate("/bank-reconciliation");
    },
    onError: (error: any) => {
      toast.error(`Failed to update bank reconciliation: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bankAccount || !formData.statementDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    updateBankReconciliationMutation.mutate({
      id: id || "",
      bankAccount: formData.bankAccount,
      statementDate: new Date(formData.statementDate).toISOString().split("T")[0],
      openingBalance: formData.openingBalance ? Math.round(parseFloat(formData.openingBalance) * 100) : undefined,
      closingBalance: formData.closingBalance ? Math.round(parseFloat(formData.closingBalance) * 100) : undefined,
      deposits: formData.deposits ? Math.round(parseFloat(formData.deposits) * 100) : undefined,
      withdrawals: formData.withdrawals ? Math.round(parseFloat(formData.withdrawals) * 100) : undefined,
      reconciliationStatus: formData.reconciliationStatus as any,
      notes: formData.notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <ModuleLayout
        title="Edit Bank Reconciliation"
        description="Update bank reconciliation record"
        icon={<Building className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Accounting", href: "/accounting" },
          { label: "Bank Reconciliation", href: "/bank-reconciliation" },
          { label: "Edit Bank Reconciliation" },
        ]}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Bank Reconciliation"
      description="Update bank reconciliation record"
      icon={<Building className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Bank Reconciliation", href: "/bank-reconciliation" },
        { label: "Edit Bank Reconciliation" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Bank Reconciliation</CardTitle>
            <CardDescription>
              Update the bank reconciliation details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Bank Account *</Label>
                  <Input
                    id="bankAccount"
                    placeholder="e.g., Checking Account"
                    value={formData.bankAccount}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccount: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statementDate">Statement Date *</Label>
                  <Input
                    id="statementDate"
                    type="date"
                    value={formData.statementDate}
                    onChange={(e) =>
                      setFormData({ ...formData, statementDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance (Ksh)</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    placeholder="0.00"
                    value={formData.openingBalance}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBalance: e.target.value })
                    }
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closingBalance">Closing Balance (Ksh)</Label>
                  <Input
                    id="closingBalance"
                    type="number"
                    placeholder="0.00"
                    value={formData.closingBalance}
                    onChange={(e) =>
                      setFormData({ ...formData, closingBalance: e.target.value })
                    }
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deposits">Total Deposits (Ksh)</Label>
                  <Input
                    id="deposits"
                    type="number"
                    placeholder="0.00"
                    value={formData.deposits}
                    onChange={(e) =>
                      setFormData({ ...formData, deposits: e.target.value })
                    }
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="withdrawals">Total Withdrawals (Ksh)</Label>
                  <Input
                    id="withdrawals"
                    type="number"
                    placeholder="0.00"
                    value={formData.withdrawals}
                    onChange={(e) =>
                      setFormData({ ...formData, withdrawals: e.target.value })
                    }
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reconciliationStatus">Reconciliation Status</Label>
                <Select
                  value={formData.reconciliationStatus}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reconciliationStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                    <SelectItem value="discrepancy">Discrepancy Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updateBankReconciliationMutation.isPending}
                >
                  {updateBankReconciliationMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Bank Reconciliation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/bank-reconciliation")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}

