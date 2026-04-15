import React, { useState, useMemo } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, Users, Layers } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";

const SalesReportsPage: React.FC = () => {
  const [from, setFrom] = useState<string>(format(new Date(), "yyyy-MM-01"));
  const [to, setTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const range = useMemo(() => ({ from: new Date(from), to: new Date(to) }), [from, to]);

  const revenueByClient = trpc.salesReports.getRevenueByClient.useQuery(range, { enabled: !!from && !!to });
  const revenueByService = trpc.salesReports.getRevenueByService.useQuery(range, { enabled: !!from && !!to });
  const trends = trpc.salesReports.getSalesTrends.useQuery(range, { enabled: !!from && !!to });
  const invoiceAging = trpc.salesReports.getInvoiceAging.useQuery(undefined, { enabled: !!from && !!to });
  const paymentCol = trpc.salesReports.getPaymentCollection.useQuery(range, { enabled: !!from && !!to });

  const isLoading =
    revenueByClient.isLoading ||
    revenueByService.isLoading ||
    trends.isLoading ||
    invoiceAging.isLoading ||
    paymentCol.isLoading;

  return (
    <ModuleLayout title="Sales Reports" breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Sales Reports" }]}>
      <div className="space-y-6">
        {/* date range controls */}
        <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Button
            onClick={() => {
              revenueByClient.refetch();
              revenueByService.refetch();
              trends.refetch();
              invoiceAging.refetch();
              paymentCol.refetch();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Invoiced"
          value={<>Ksh {(paymentCol.data?.totalInvoiced || 0).toLocaleString()}</>}
          icon={<DollarSign className="h-5 w-5" />}
          color="border-l-green-500"
        />
        <StatsCard
          label="Total Paid"
          value={<>Ksh {(paymentCol.data?.totalPaid || 0).toLocaleString()}</>}
          icon={<DollarSign className="h-5 w-5" />}
          color="border-l-blue-500"
        />
        <StatsCard
          label="Collection Rate"
          value={<>{(paymentCol.data?.collectionRate || 0).toFixed(1)}%</>}
          icon={<Users className="h-5 w-5" />}
          color="border-l-purple-500"
        />
        <StatsCard
          label="Top Client"
          value={revenueByClient.data && revenueByClient.data[0]?.clientName ? revenueByClient.data[0].clientName : "-"}
          icon={<Layers className="h-5 w-5" />}
          color="border-l-amber-500"
        />
      </div>

      {/* Sales Trend chart */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Monthly Sales Trend</h2>
        {trends.data && trends.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `Ksh ${v.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Invoiced" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">No data available</p>
        )}
      </div>

      {/* Top clients table */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Revenue by Client</h2>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell className="text-right">Total</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(revenueByClient.data) && revenueByClient.data.map((row) => (
                <TableRow key={row.clientId}>
                  <TableCell>{row.clientName}</TableCell>
                  <TableCell className="text-right">
                    Ksh {((row.total) || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Revenue by service table */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Revenue by Service</h2>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell className="text-right">Total</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueByService.data?.map((row) => (
                <TableRow key={row.serviceId}>
                  <TableCell>{row.serviceName}</TableCell>
                  <TableCell className="text-right">
                    Ksh {((row.total) || 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      </div>
    </ModuleLayout>
  );
};

export default SalesReportsPage;
