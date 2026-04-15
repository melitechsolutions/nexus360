import React, { useState } from 'react';
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Undo2,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { StatsCard } from "@/components/ui/stats-card";

export default function PaymentReconciliation() {
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0]
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState('__all__');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);

  // Fetch payments within date range
  const { data: payments, isLoading, refetch } = trpc.payments.list.useQuery({
    filters: {
      status: 'completed',
    },
  });

  const reversalMutation = trpc.enhancedPayments.reversePayment.useMutation({
    onSuccess: async () => {
      toast.success('Payment reversed successfully');
      setReverseDialogOpen(false);
      setSelectedPayment(null);
      await refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reverse payment: ${error.message}`);
    },
  });

  // Filter payments by date and method
  const filteredPayments = payments?.filter(payment => {
    if (!payment.paymentDate) return false;
    
    const paymentDate = new Date(payment.paymentDate).toISOString().split('T')[0];
    
    let dateMatch = true;
    if (dateFrom && paymentDate < dateFrom) dateMatch = false;
    if (dateTo && paymentDate > dateTo) dateMatch = false;
    
    let methodMatch = true;
    if (paymentMethod && paymentMethod !== '__all__' && payment.paymentMethod !== paymentMethod) methodMatch = false;
    
    return dateMatch && methodMatch;
  }) || [];

  // Calculate statistics
  const stats = {
    totalPayments: filteredPayments.length,
    totalAmount: filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    avgAmount: filteredPayments.length > 0 
      ? filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / filteredPayments.length 
      : 0,
  };

  // Breakdown by payment method
  const methodBreakdown = Object.groupBy(filteredPayments, p => p.paymentMethod || 'Other');

  const handleReversal = async () => {
    if (!selectedPayment) return;
    
    try {
      await reversalMutation.mutateAsync({ paymentId: selectedPayment });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Payment Date', 'Invoice', 'Client', 'Amount', 'Method', 'Reference', 'Account', 'Status'].join(','),
      ...filteredPayments.map(p =>
        [
          p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '',
          p.invoiceId || '',
          p.clientName || '',
          `KES ${(p.amount / 100).toLocaleString()}`,
          p.paymentMethod || '',
          p.reference || '',
          p.chartOfAccountName || '',
          p.status || 'completed',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-reconciliation-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Payment reconciliation exported');
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      'Cash': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      'Bank Transfer': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      'Cheque': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      'MPesa': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      'Card': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
    };
    return colors[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
  };

  const currentPayment = payments?.find(p => p.id === selectedPayment);

  return (
    <ModuleLayout>
      <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Reconciliation</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View, reconcile, and reverse payments with Chart of Accounts tracking
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="method">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All methods</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="MPesa">MPesa</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={exportCSV} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <StatsCard label="Total Payments" value={stats.totalPayments} color="border-l-purple-500" />
        <StatsCard label="Total Amount" value={<>KES {(stats.totalAmount / 100).toLocaleString()}</>} color="border-l-green-500" />
        <StatsCard label="Average Payment" value={<>KES {(stats.avgAmount / 100).toLocaleString()}</>} color="border-l-blue-500" />
      </div>

      {/* Payment Method Breakdown */}
      {Object.keys(methodBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(methodBreakdown).map(([method, items]) => (
                <div key={method} className="flex items-center justify-between pb-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge className={getPaymentMethodColor(method)}>
                      {method}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {items.length} payment{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="font-semibold">
                    KES {(items.reduce((sum, p) => sum + (p.amount || 0), 0) / 100).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} in selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>COA Account</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.paymentDate
                          ? new Date(payment.paymentDate).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.invoiceId || '-'}
                      </TableCell>
                      <TableCell>{payment.clientName || '-'}</TableCell>
                      <TableCell className="font-semibold">
                        KES {((payment.amount || 0) / 100).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentMethodColor(payment.paymentMethod || '')}>
                          {payment.paymentMethod || 'Other'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{payment.chartOfAccountName || '-'}</p>
                          <p className="text-xs text-gray-500">
                            {payment.chartOfAccountCode || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {payment.reference || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(payment.id);
                            setReverseDialogOpen(true);
                          }}
                        >
                          <Undo2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">No payments found in selected period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reversal Dialog */}
      <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Payment</DialogTitle>
            <DialogDescription>
              This action will reverse the payment and credit the COA account
            </DialogDescription>
          </DialogHeader>

          {currentPayment && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Payment ID: {currentPayment.id}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="font-semibold">{currentPayment.clientName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="font-semibold">
                    KES {((currentPayment.amount || 0) / 100).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="font-semibold">{currentPayment.paymentMethod || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">COA Account</p>
                  <p className="font-semibold">{currentPayment.chartOfAccountName || '-'}</p>
                </div>
              </div>

              <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-900 dark:border-orange-800">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-100">
                  Reversing this payment will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Credit the COA account balance</li>
                    <li>Update invoice payment status</li>
                    <li>Mark this payment as cancelled</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReverseDialogOpen(false)}
              disabled={reversalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReversal}
              disabled={reversalMutation.isPending}
            >
              {reversalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reversing...
                </>
              ) : (
                <>
                  <Undo2 className="mr-2 h-4 w-4" />
                  Reverse Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </ModuleLayout>
  );
}
