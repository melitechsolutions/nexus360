import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Calendar, Download, Filter, RotateCcw, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * PaymentReports component
 * 
 * Displays payment reports with filters and export options
 * Features:
 * - Date range filtering
 * - Payment method filtering
 * - Client filtering
 * - Summary statistics
 * - Visual charts by method
 * - CSV export functionality
 */
export default function PaymentReports() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");

  const { data: reportData, isLoading, refetch } = trpc.invoices.payments.report.useQuery({
    startDate,
    endDate,
    paymentMethod: paymentMethod as any || undefined,
    clientId: clientId || undefined,
  });

  const { data: clientsData } = trpc.clients.list.useQuery();

  const handleResetFilters = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    setStartDate(date.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod("");
    setClientId("");
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.payments || reportData.payments.length === 0) {
      toast.warning("No payments to export");
      return;
    }

    const headers = [
      "Payment Date",
      "Invoice Number",
      "Amount (KES)",
      "Payment Method",
      "Reference",
      "Receipt ID",
    ];

    const rows = reportData.payments.map((p: any) => [
      new Date(p.paymentDate).toLocaleDateString(),
      p.invoiceNumber || "N/A",
      (p.paymentAmount / 100).toFixed(2),
      p.paymentMethod,
      p.reference || "",
      p.receiptId || "",
    ]);

    // Add summary section
    const summary = reportData.summary;
    rows.push([]);
    rows.push(["SUMMARY"]);
    rows.push(["Total Payments", summary.totalPayments]);
    rows.push(["Total Amount (KES)", (summary.totalAmount / 100).toFixed(2)]);
    if (summary.byMethod && Array.isArray(summary.byMethod)) {
      rows.push([]);
      rows.push(["By Payment Method"]);
      summary.byMethod.forEach((item: any) => {
        rows.push([item.method, item.count, (item.amount / 100).toFixed(2)]);
      });
    }

    // Create CSV string
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const summary = reportData?.summary || {};
  const payments = reportData?.payments || [];

  // Prepare chart data for payment methods
  const chartData = summary.byMethod
    ? summary.byMethod.map((item: any) => ({
      name: item.method,
      amount: item.amount / 100,
      count: item.count,
      label: `${item.method}: ${item.count} payment(s)`,
    }))
    : [];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Start Date */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                From Date
              </label>
              <div className="flex gap-2">
                <Calendar className="w-4 h-4 text-slate-400 mt-3" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                To Date
              </label>
              <div className="flex gap-2">
                <Calendar className="w-4 h-4 text-slate-400 mt-3" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Payment Method
              </label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Client
              </label>
              <Select value={clientId || "all"} onValueChange={(v) => setClientId(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientsData &&
                    clientsData.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name || "N/A"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={() => handleExportCSV()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Total Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {summary.totalPayments || 0}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.totalAmount
                  ? `KES ${(summary.totalAmount / 100).toLocaleString('en-KE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : "KES 0.00"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                total received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Average Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summary.averagePayment
                  ? `KES ${(summary.averagePayment / 100).toLocaleString('en-KE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                  : "KES 0.00"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                per transaction
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                {new Date(startDate).toLocaleDateString()}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                to {new Date(endDate).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {!isLoading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payment Methods - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Payments by Method (Count)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Number of Payments" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Methods - Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Payments by Method (Amount)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry: any) => (
                      <Cell key={entry.name} fill={COLORS[chartData.indexOf(entry) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => `KES ${(value / 100).toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Methods Detail */}
      {!isLoading && summary.byMethod && Array.isArray(summary.byMethod) && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.byMethod.map((method: any) => (
                <div
                  key={method.method}
                  className="p-4 border rounded-lg dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{method.method}</Badge>
                    <span className="text-sm font-medium">{method.count} transaction(s)</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    KES {(method.amount / 100).toLocaleString('en-KE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Avg: KES {((method.amount / method.count) / 100).toLocaleString('en-KE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${payments.length} payment(s) found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : payments.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/40 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200">
                      Invoice
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment: any) => (
                    <tr key={payment.id || payment.paymentDate} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                        {payment.invoiceNumber || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                        KES {(payment.paymentAmount / 100).toLocaleString('en-KE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="secondary">{payment.paymentMethod}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {payment.reference || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {payment.receiptId ? (
                          <Badge variant="outline">{payment.receiptId.substring(0, 8)}...</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p>No payments found for the selected date range and filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
