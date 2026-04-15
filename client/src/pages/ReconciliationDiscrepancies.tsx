import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
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
import { AlertCircle, Download, CheckCircle2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatPercentage } from "@/utils/format";
import { useState } from "react";
import { BatchPaymentMatching } from "@/components/BatchPaymentMatching";
import { StatsCard } from "@/components/ui/stats-card";
import { exportToCsv } from "@/utils/exportCsv";

export default function ReconciliationDiscrepancies() {
  const [threshold, setThreshold] = useState(0.01);
  const { data: discrepancies } = trpc.paymentReconciliation.getDiscrepancies.useQuery({
    limit: 100,
    threshold,
  });

  if (!discrepancies) return <div>Loading...</div>;

  // Categorize discrepancies by severity
  const critical = discrepancies.discrepancies.filter((d: any) => Math.abs(parseFloat(d.variancePercent)) > 10);
  const major = discrepancies.discrepancies.filter((d: any) => {
    const pct = Math.abs(parseFloat(d.variancePercent));
    return pct > 5 && pct <= 10;
  });
  const minor = discrepancies.discrepancies.filter((d: any) => {
    const pct = Math.abs(parseFloat(d.variancePercent));
    return pct > 0 && pct <= 5;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reconciliation Discrepancies</h1>
        <p className="text-muted-foreground mt-2">
          Payment and invoice amount mismatches
        </p>
      </div>

      {/* Batch Matching Component */}
      <BatchPaymentMatching />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          label="Total Discrepancies"
          value={discrepancies.total}
          description={<>{discrepancies.discrepancies.length} shown on this page</>}
          color="border-l-orange-500"
        />

        <StatsCard label="Critical" value={critical.length} description={<>{">"} 10% difference</>} color="border-l-purple-500" />

        <StatsCard label="Major" value={major.length} description="5-10% difference" color="border-l-green-500" />

        <StatsCard
          label="Total Discrepancy Amount"
          value={formatCurrency(discrepancies.totalDiscrepancyAmount)}
          description={<>Avg: {formatCurrency(discrepancies.averageDiscrepancy)}</>}
          color="border-l-blue-500"
        />
      </div>

      {/* Alert */}
      {critical.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              Critical Discrepancies Require Investigation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-800">
            <p>
              {critical.length} discrepancies have variance over 10% and need immediate review.
              Total amount: <strong>{formatCurrency(critical.reduce((sum: number, d: any) => sum + Math.abs(d.difference), 0))}</strong>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Critical Discrepancies */}
      {critical.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Critical Discrepancies ({critical.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Invoice Amt</TableHead>
                    <TableHead className="text-right">Payment Amt</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                    <TableHead className="text-center">Resolution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {critical.map((d: any) => (
                    <TableRow key={d.paymentId} className="hover:bg-red-50">
                      <TableCell className="font-medium">{d.invoiceNumber}</TableCell>
                      <TableCell>{d.clientName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.invoiceAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.paymentAmount)}</TableCell>
                      <TableCell className="text-right">
                        <span className={d.difference > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                          {formatCurrency(d.difference)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-800 font-semibold">
                          {d.variancePercent}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" onClick={() => toast.info(`Reviewing discrepancy for ${d.invoiceNumber}`)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Major Discrepancies */}
      {major.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Major Discrepancies ({major.length})</CardTitle>
            <CardDescription>5-10% variance - review for accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Invoice Amt</TableHead>
                    <TableHead className="text-right">Payment Amt</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {major.slice(0, 10).map((d: any) => (
                    <TableRow key={d.paymentId} className="hover:bg-orange-50">
                      <TableCell className="font-medium">{d.invoiceNumber}</TableCell>
                      <TableCell>{d.clientName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.invoiceAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.paymentAmount)}</TableCell>
                      <TableCell className="text-right">
                        <span className={d.difference > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                          {formatCurrency(d.difference)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-block px-2 py-1 rounded bg-orange-100 text-orange-800 font-semibold text-sm">
                          {d.variancePercent}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" onClick={() => toast.success(`Marked ${d.invoiceNumber} as reviewed`)}>
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {major.length > 10 && (
              <p className="text-xs text-muted-foreground mt-4">
                Showing 10 of {major.length} major discrepancies
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Minor Discrepancies */}
      {minor.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Minor Discrepancies ({minor.length})</CardTitle>
            <CardDescription>Less than 5% variance - review if needed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Invoice Amt</TableHead>
                    <TableHead className="text-right">Payment Amt</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">Variance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {minor.slice(0, 10).map((d: any) => (
                    <TableRow key={d.paymentId} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-sm">{d.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{d.clientName}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(d.invoiceAmount)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(d.paymentAmount)}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={d.difference > 0 ? "text-green-600" : "text-gray-600"}>
                          {formatCurrency(d.difference)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-medium">
                          {d.variancePercent}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {minor.length > 10 && (
              <p className="text-xs text-muted-foreground mt-4">
                Showing 10 of {minor.length} minor discrepancies
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Discrepancies */}
      {discrepancies.total === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5" />
              All Payments Matched Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="text-green-800">
            <p>No discrepancies detected. All payments match their invoices perfectly.</p>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      <Button
        className="gap-2"
        size="lg"
        onClick={() => {
          const rows = (discrepancies.discrepancies || []).map((d: any) => ({
            invoiceNumber: d.invoiceNumber,
            clientName: d.clientName,
            invoiceAmount: d.invoiceAmount,
            paymentAmount: d.paymentAmount,
            difference: d.difference,
            variancePercent: d.variancePercent,
          }));
          if (!rows.length) {
            toast.info("No discrepancy data available to export");
            return;
          }
          exportToCsv("reconciliation-discrepancies", rows);
          toast.success("Discrepancy report exported");
        }}
      >
        <Download className="w-4 h-4" />
        Export Discrepancy Report
      </Button>
    </div>
  );
}
