import { useState, useMemo, useCallback } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
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
import { trpc } from "@/lib/trpc";
import { useCurrencySettings } from "@/lib/currency";
import { Users, TrendingUp, DollarSign, Award } from "lucide-react";

export default function CustomerReports() {
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const { symbol, position } = useCurrencySettings();

  // Fetch customer data
  const { data: clients = [] } = trpc.clients.list.useQuery({});
  const { data: invoices = [] } = trpc.invoices.list.useQuery({});
  const { data: contacts = [] } = trpc.contacts.list.useQuery({});

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2].map(String);

  const fmt = useCallback((amount: number) => {
    const value = amount / 100;
    if (position === "prefix") return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
    return `${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K${symbol}`;
  }, [symbol, position]);

  // Filter invoices by year
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv: any) => {
      const date = new Date(inv.invoiceDate || inv.issueDate);
      return date.getFullYear() === Number(yearFilter);
    });
  }, [invoices, yearFilter]);

  const totalClients = clients.length;
  const activeClients = clients.filter((c: any) => c.status === "active").length;
  const totalRevenue = useMemo(
    () => filteredInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0),
    [filteredInvoices]
  );
  const avgClientValue = totalClients > 0 ? totalRevenue / totalClients : 0;

  // Top clients by revenue
  const topClients = useMemo(() => {
    const clientMap: Record<string, number> = {};
    filteredInvoices.forEach((inv: any) => {
      const clientId = inv.clientId || "unknown";
      clientMap[clientId] = (clientMap[clientId] || 0) + (inv.total || 0);
    });

    return Object.entries(clientMap)
      .map(([clientId, total]) => {
        const client = clients.find((c: any) => c.id === clientId);
        return {
          name: client?.companyName || "Unknown",
          value: total,
          id: clientId,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((item) => ({
        name: item.name.length > 20 ? item.name.substring(0, 17) + "..." : item.name,
        value: Math.round(item.value / 100),
      }));
  }, [clients, filteredInvoices]);

  // Clients by status
  const clientsByStatus = useMemo(() => {
    const statusMap: Record<string, number> = {};
    clients.forEach((c: any) => {
      const status = c.status || "unknown";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    return Object.entries(statusMap).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  }, [clients]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <ModuleLayout title="Customer Reports">
      <div className="max-w-7xl mx-auto">
        {/* Year Filter */}
        <div className="flex gap-4 mb-6">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Clients"
            value={totalClients.toString()}
            icon={<Users className="h-4 w-4" />}
            trend={5}
            trendLabel="vs last year"
          />
          <StatsCard
            title="Active Clients"
            value={activeClients.toString()}
            icon={<TrendingUp className="h-4 w-4" />}
            trend={8}
            trendLabel="client retention"
          />
          <StatsCard
            title="Total Revenue"
            value={fmt(totalRevenue)}
            icon={<DollarSign className="h-4 w-4" />}
            trend={12}
            trendLabel="vs last year"
          />
          <StatsCard
            title="Avg Client Value"
            value={fmt(avgClientValue)}
            icon={<Award className="h-4 w-4" />}
            trend={3}
            trendLabel="growth rate"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Revenue</CardTitle>
              <CardDescription>Top 10 clients in {yearFilter}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClients}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => `$${value}K`}
                    contentStyle={{ backgroundColor: "rgba(0, 0, 0, 0.8)", border: "none", borderRadius: "8px" }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Clients by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Clients by Status</CardTitle>
              <CardDescription>Client distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={clientsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {clientsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Client Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Client Summary</CardTitle>
            <CardDescription>All clients in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Invoiced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.slice(0, 20).map((client: any) => {
                    const clientRevenue = filteredInvoices
                      .filter((inv: any) => inv.clientId === client.id)
                      .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.companyName}</TableCell>
                        <TableCell>{client.contactName}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            client.status === "active"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                          }`}>
                            {client.status || "unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(clientRevenue / 100).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
