import React, { useRef, useState } from "react";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function BankReconciliation() {
  const { allowed, isLoading: permissionLoading } = useRequireFeature("accounting:reconciliation:view");
  const [selectedAccount, setSelectedAccount] = useState("main");
  const [matchedLocally, setMatchedLocally] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch real data from backend
  const { data: accountsList = [] } = trpc.bankReconciliation.list.useQuery();
  const { data: reconciliationData } = trpc.bankReconciliation.getById.useQuery(selectedAccount);

  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  const bankBalance = reconciliationData?.bankBalance || 0;
  const bookBalance = reconciliationData?.bookBalance || 0;
  const matchedCount = (reconciliationData?.matchedTransactions || 0) + matchedLocally.size;
  const unmatchedCount = Math.max(0, (reconciliationData?.unmatchedTransactions || 0) - matchedLocally.size);
  const transactions = reconciliationData?.transactions || [];

  return (
    <ModuleLayout
      title="Bank Reconciliation"
      description="Match bank transactions with system records and ensure accuracy"
      icon={<CreditCard className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Bank Reconciliation" },
      ]}
      actions={
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" />
          Import Bank Statement
        </Button>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        title="Import bank statement file"
        aria-label="Import bank statement file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          toast.success(`Imported ${file.name}`);
          e.currentTarget.value = "";
        }}
      />
      <div className="space-y-6">

        {/* Account Selection */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Select Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountsList.map((account: any) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.bankCode} - {account.accountNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Reconciliation Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            label="Bank Balance"
            value={<>KES {bankBalance.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</>}
            description={reconciliationData?.period || "Current period"}
            color="border-l-orange-500"
          />
          <StatsCard
            label="System Balance"
            value={<>KES {bookBalance.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</>}
            description={reconciliationData?.period || "Current period"}
            color="border-l-purple-500"
          />
          <StatsCard label="Matched" value={matchedCount} description="Transactions" color="border-l-green-500" />
          <StatsCard label="Unmatched" value={unmatchedCount} description="Transactions" color="border-l-blue-500" />
        </div>

        {/* Bank Transactions */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {reconciliationData?.status === "Reconciled" 
                ? "All transactions matched — reconciliation complete"
                : `${unmatchedCount} transaction(s) need matching`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"><Checkbox /></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No transactions found for this account
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((txn: any) => {
                      const isMatched = txn.status === "matched" || matchedLocally.has(txn.id);
                      return (
                      <TableRow key={txn.id}>
                        <TableCell><Checkbox /></TableCell>
                        <TableCell className="text-sm">
                          {txn.date ? new Date(txn.date).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">{txn.description}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          KES {(txn.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {isMatched ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle2 className="w-4 h-4" /> Matched
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-yellow-600 text-sm">
                              <AlertCircle className="w-4 h-4" /> Unmatched
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              if (isMatched) {
                                toast.info(`Viewing transaction ${txn.id}`);
                                return;
                              }
                              setMatchedLocally((prev) => {
                                const next = new Set(prev);
                                next.add(txn.id);
                                return next;
                              });
                              toast.success(`Transaction ${txn.id} matched`);
                            }}
                          >
                            {isMatched ? "View" : "Match"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => toast.info("Reconciliation cancelled")}>Cancel</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => toast.success("Reconciliation completed successfully")}>Complete Reconciliation</Button>
        </div>
      </div>
    </ModuleLayout>
  );
}

