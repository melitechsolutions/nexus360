import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, DollarSign, Users, FileText, Download, FileSpreadsheet, Clock, FolderKanban, Printer,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";
import { useCurrencySettings } from "@/lib/currency";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export default function Reports() {
  const { allowed, isLoading } = useRequireFeature("reports:view");
  const [mainTab, setMainTab] = useState("invoices");
  const [subTab, setSubTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  const { code: currencyCode } = useCurrencySettings();

  // Fetch real data
  const { data: invoices = [] } = trpc.invoices.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();
  const { data: payments = [] } = trpc.payments.list.useQuery();
  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: estimates = [] } = trpc.estimates.list.useQuery();
  const { data: projectsRaw = [] } = trpc.projects.list.useQuery({});
  const { data: timeEntriesRaw = [] } = trpc.timeEntries.list.useQuery();
  const { data: employeesRaw = [] } = trpc.employees.list.useQuery();

  // Unwrap to prevent React #306
  const inv = useMemo(() => JSON.parse(JSON.stringify(invoices)) as any[], [invoices]);
  const est = useMemo(() => JSON.parse(JSON.stringify(estimates)) as any[], [estimates]);
  const cli = useMemo(() => JSON.parse(JSON.stringify(clients)) as any[], [clients]);
  const pay = useMemo(() => JSON.parse(JSON.stringify(payments)) as any[], [payments]);
  const exp = useMemo(() => JSON.parse(JSON.stringify(expenses)) as any[], [expenses]);
  const proj = useMemo(() => JSON.parse(JSON.stringify(projectsRaw)) as any[], [projectsRaw]);
  const te = useMemo(() => JSON.parse(JSON.stringify(timeEntriesRaw)) as any[], [timeEntriesRaw]);
  const emps = useMemo(() => JSON.parse(JSON.stringify(employeesRaw)) as any[], [employeesRaw]);

  const fmt = useCallback(
    (amount: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: currencyCode }).format(amount / 100),
    [currencyCode],
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2].map(String);

  const handleMainTabChange = (val: string) => {
    setMainTab(val);
    setSubTab(val === "timesheets" ? "team" : val === "financial" ? "income-expenses" : "overview");
    setStatusFilter("all");
  };

  // ───────────── INVOICES ─────────────
  const filteredInv = useMemo(() => {
    let items = inv;
    if (yearFilter !== "all")
      items = items.filter((i: any) => new Date(i.invoiceDate || i.issueDate || i.createdAt).getFullYear() === Number(yearFilter));
    if (statusFilter !== "all") items = items.filter((i: any) => i.status === statusFilter);
    return items;
  }, [inv, yearFilter, statusFilter]);

  const invTotalAmount = useMemo(() => filteredInv.reduce((s: number, i: any) => s + (i.total || 0), 0), [filteredInv]);
  const invPaid = useMemo(() => filteredInv.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.total || 0), 0), [filteredInv]);
  const invDue = useMemo(() => filteredInv.filter((i: any) => i.status === "sent" || i.status === "due").reduce((s: number, i: any) => s + (i.total || 0), 0), [filteredInv]);
  const invOverdue = useMemo(() => filteredInv.filter((i: any) => i.status === "overdue").reduce((s: number, i: any) => s + (i.total || 0), 0), [filteredInv]);

  const invMonthly = useMemo(() => {
    const map: Record<string, { total: number; count: number; paid: number }> = {};
    filteredInv.forEach((i: any) => {
      const key = new Date(i.invoiceDate || i.issueDate || i.createdAt).toLocaleString("en-US", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { total: 0, count: 0, paid: 0 };
      map[key].total += i.total || 0;
      map[key].count += 1;
      if (i.status === "paid") map[key].paid += i.total || 0;
    });
    return Object.entries(map).map(([month, d]) => ({ month, ...d }));
  }, [filteredInv]);

  const invByClient = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number; paid: number }> = {};
    filteredInv.forEach((i: any) => {
      const cid = i.clientId || "unknown";
      if (!map[cid]) {
        const c = cli.find((c: any) => c.id === cid);
        map[cid] = { name: c?.companyName || i.clientName || "Unknown", total: 0, count: 0, paid: 0 };
      }
      map[cid].total += i.total || 0;
      map[cid].count += 1;
      if (i.status === "paid") map[cid].paid += i.total || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredInv, cli]);

  const invByCategory = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredInv.forEach((i: any) => {
      const cat = i.category || "General";
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += i.total || 0;
      map[cat].count += 1;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total);
  }, [filteredInv]);

  // ───────────── ESTIMATES ─────────────
  const filteredEst = useMemo(() => {
    let items = est;
    if (yearFilter !== "all")
      items = items.filter((e: any) => new Date(e.date || e.createdAt).getFullYear() === Number(yearFilter));
    if (statusFilter !== "all") items = items.filter((e: any) => e.status === statusFilter);
    return items;
  }, [est, yearFilter, statusFilter]);

  const estTotal = useMemo(() => filteredEst.reduce((s: number, e: any) => s + (e.total || 0), 0), [filteredEst]);

  const estMonthly = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredEst.forEach((e: any) => {
      const key = new Date(e.date || e.createdAt).toLocaleString("en-US", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { total: 0, count: 0 };
      map[key].total += e.total || 0;
      map[key].count += 1;
    });
    return Object.entries(map).map(([month, d]) => ({ month, ...d }));
  }, [filteredEst]);

  const estByClient = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    filteredEst.forEach((e: any) => {
      const cid = e.clientId || "unknown";
      if (!map[cid]) {
        const c = cli.find((c: any) => c.id === cid);
        map[cid] = { name: c?.companyName || e.clientName || "Unknown", total: 0, count: 0 };
      }
      map[cid].total += e.total || 0;
      map[cid].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredEst, cli]);

  const estByCategory = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredEst.forEach((e: any) => {
      const cat = e.category || "General";
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += e.total || 0;
      map[cat].count += 1;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total);
  }, [filteredEst]);

  // ───────────── PROJECTS ─────────────
  const filteredProj = useMemo(() => {
    let items = proj;
    if (yearFilter !== "all")
      items = items.filter((p: any) => new Date(p.startDate || p.createdAt).getFullYear() === Number(yearFilter));
    if (statusFilter !== "all") items = items.filter((p: any) => p.status === statusFilter);
    return items;
  }, [proj, yearFilter, statusFilter]);

  const projByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProj.forEach((p: any) => { const s = p.status || "not_started"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [filteredProj]);

  const projByClient = useMemo(() => {
    const map: Record<string, { name: string; count: number; budget: number }> = {};
    filteredProj.forEach((p: any) => {
      const cid = p.clientId || "unknown";
      if (!map[cid]) {
        const c = cli.find((c: any) => c.id === cid);
        map[cid] = { name: c?.companyName || "Unknown", count: 0, budget: 0 };
      }
      map[cid].count += 1;
      map[cid].budget += p.budget || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredProj, cli]);

  const projByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProj.forEach((p: any) => { const cat = p.category || "General"; map[cat] = (map[cat] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredProj]);

  // ───────────── CLIENTS ─────────────
  const clientOverview = useMemo(() => {
    return cli.map((c: any) => {
      const cInv = inv.filter((i: any) => i.clientId === c.id);
      const cPay = pay.filter((p: any) => p.clientId === c.id);
      const cProj = proj.filter((p: any) => p.clientId === c.id);
      return {
        id: c.id,
        name: c.companyName || c.name || "Unknown",
        invoices: cInv.length,
        invoiceTotal: cInv.reduce((s: number, i: any) => s + (i.total || 0), 0),
        payments: cPay.reduce((s: number, p: any) => s + (p.amount || 0), 0),
        projects: cProj.length,
        status: c.status || "active",
      };
    }).sort((a, b) => b.invoiceTotal - a.invoiceTotal);
  }, [cli, inv, pay, proj]);

  // ───────────── TIME SHEETS ─────────────
  const tsByTeamMember = useMemo(() => {
    const map: Record<string, { name: string; totalMinutes: number; entries: number }> = {};
    te.forEach((t: any) => {
      const uid = t.userId || t.employeeId || "unknown";
      if (!map[uid]) {
        const emp = emps.find((e: any) => e.userId === uid || e.id === uid);
        map[uid] = { name: emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : t.userName || "Unknown", totalMinutes: 0, entries: 0 };
      }
      map[uid].totalMinutes += t.durationMinutes || 0;
      map[uid].entries += 1;
    });
    return Object.values(map).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [te, emps]);

  const tsByClient = useMemo(() => {
    const map: Record<string, { name: string; totalMinutes: number; entries: number }> = {};
    te.forEach((t: any) => {
      const cid = t.clientId || "unknown";
      if (!map[cid]) {
        const c = cli.find((c: any) => c.id === cid);
        map[cid] = { name: c?.companyName || "Unassigned", totalMinutes: 0, entries: 0 };
      }
      map[cid].totalMinutes += t.durationMinutes || 0;
      map[cid].entries += 1;
    });
    return Object.values(map).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [te, cli]);

  const tsByProject = useMemo(() => {
    const map: Record<string, { name: string; totalMinutes: number; entries: number }> = {};
    te.forEach((t: any) => {
      const pid = t.projectId || "unknown";
      if (!map[pid]) {
        const p = proj.find((p: any) => p.id === pid);
        map[pid] = { name: p?.name || "Unassigned", totalMinutes: 0, entries: 0 };
      }
      map[pid].totalMinutes += t.durationMinutes || 0;
      map[pid].entries += 1;
    });
    return Object.values(map).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [te, proj]);

  // ───────────── FINANCIAL ─────────────
  const monthlyFinancial = useMemo(() => {
    const yr = yearFilter !== "all" ? Number(yearFilter) : currentYear;
    const map: Record<string, { income: number; expense: number; invoiceCount: number; expenseCount: number }> = {};
    for (let m = 0; m < 12; m++) {
      const key = new Date(yr, m).toLocaleString("en-US", { month: "short" });
      map[key] = { income: 0, expense: 0, invoiceCount: 0, expenseCount: 0 };
    }
    inv.forEach((i: any) => {
      const d = new Date(i.invoiceDate || i.issueDate || i.createdAt);
      if (d.getFullYear() === yr) {
        const key = d.toLocaleString("en-US", { month: "short" });
        if (map[key]) { map[key].income += (i.total || 0) / 100; map[key].invoiceCount += 1; }
      }
    });
    exp.forEach((e: any) => {
      const d = new Date(e.date || e.createdAt);
      if (d.getFullYear() === yr) {
        const key = d.toLocaleString("en-US", { month: "short" });
        if (map[key]) { map[key].expense += (e.amount || 0) / 100; map[key].expenseCount += 1; }
      }
    });
    return Object.entries(map).map(([month, d]) => ({ month, ...d }));
  }, [inv, exp, yearFilter, currentYear]);

  const totalIncome = useMemo(() => monthlyFinancial.reduce((s, d) => s + d.income, 0), [monthlyFinancial]);
  const totalExpense = useMemo(() => monthlyFinancial.reduce((s, d) => s + d.expense, 0), [monthlyFinancial]);

  // ───────────── EXPORT ─────────────
  const exportCSV = useCallback(() => {
    try {
      let rows: string[][] = [];
      if (mainTab === "invoices") {
        rows = [["Invoice #", "Client", "Amount", "Status", "Date"],
          ...filteredInv.map((i: any) => [i.invoiceNumber || "", i.clientName || "", String((i.total || 0) / 100), i.status || "", i.invoiceDate || ""])];
      } else if (mainTab === "estimates") {
        rows = [["Estimate #", "Client", "Amount", "Status", "Date"],
          ...filteredEst.map((e: any) => [e.estimateNumber || "", e.clientName || "", String((e.total || 0) / 100), e.status || "", e.date || ""])];
      } else if (mainTab === "projects") {
        rows = [["Project", "Status", "Budget", "Progress"],
          ...filteredProj.map((p: any) => [p.name || "", p.status || "", String((p.budget || 0) / 100), `${p.progress || 0}%`])];
      } else if (mainTab === "clients") {
        rows = [["Client", "Invoices", "Total", "Payments", "Projects"],
          ...clientOverview.map(c => [c.name, String(c.invoices), String(c.invoiceTotal / 100), String(c.payments / 100), String(c.projects)])];
      } else if (mainTab === "timesheets") {
        rows = [["Name", "Hours", "Entries"], ...tsByTeamMember.map(t => [t.name, String((t.totalMinutes / 60).toFixed(1)), String(t.entries)])];
      } else if (mainTab === "financial") {
        rows = [["Month", "Income", "Expenses"], ...monthlyFinancial.map(d => [d.month, d.income.toFixed(2), d.expense.toFixed(2)])];
      }
      const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
      const el = document.createElement("a");
      el.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
      el.setAttribute("download", `report-${mainTab}-${new Date().toISOString().split("T")[0]}.csv`);
      el.style.display = "none";
      document.body.appendChild(el);
      el.click();
      document.body.removeChild(el);
      toast.success("Exported as CSV");
    } catch { toast.error("Export failed"); }
  }, [mainTab, filteredInv, filteredEst, filteredProj, clientOverview, tsByTeamMember, monthlyFinancial]);

  const printReport = useCallback(() => { window.print(); }, []);

  // ───────────── SUB TAB DEFINITIONS ─────────────
  const subTabDefs: Record<string, { label: string; value: string }[]> = {
    invoices: [
      { label: "Overview", value: "overview" },
      { label: "Monthly", value: "monthly" },
      { label: "Client Invoices", value: "client" },
      { label: "Invoice Category", value: "category" },
    ],
    estimates: [
      { label: "Overview", value: "overview" },
      { label: "Monthly", value: "monthly" },
      { label: "Client Estimates", value: "client" },
      { label: "Estimate Category", value: "category" },
    ],
    projects: [
      { label: "Overview", value: "overview" },
      { label: "Client Projects", value: "client" },
      { label: "Project Category", value: "category" },
    ],
    clients: [
      { label: "Overview", value: "overview" },
    ],
    timesheets: [
      { label: "Team Member", value: "team" },
      { label: "Client", value: "client" },
      { label: "Project", value: "project" },
    ],
    financial: [
      { label: "Income vs Expenses", value: "income-expenses" },
      { label: "Invoices - Expenses - Orders", value: "summary" },
    ],
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  const renderTable = (headers: string[], rows: (string | number)[][]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>{headers.map(h => <TableHead key={h} className={h !== headers[0] ? "text-right" : ""}>{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={headers.length} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
          ) : rows.map((row, i) => (
            <TableRow key={i}>{row.map((cell, j) => <TableCell key={j} className={j > 0 ? "text-right" : "font-medium"}>{cell}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderSubContent = () => {
    // ═══════ INVOICES ═══════
    if (mainTab === "invoices") {
      if (subTab === "overview") return (
        <Card>
          <CardHeader><CardTitle>Invoices Overview</CardTitle><CardDescription>Summary of all invoices for the selected period</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatsCard label="Total Invoiced" value={fmt(invTotalAmount)} description={`${filteredInv.length} invoices`} icon={<FileText className="h-5 w-5" />} color="border-l-blue-500" />
              <StatsCard label="Paid" value={fmt(invPaid)} description="Collected" icon={<DollarSign className="h-5 w-5" />} color="border-l-green-500" />
              <StatsCard label="Due" value={fmt(invDue)} description="Awaiting payment" icon={<Clock className="h-5 w-5" />} color="border-l-orange-500" />
              <StatsCard label="Overdue" value={fmt(invOverdue)} description="Past due date" icon={<FileText className="h-5 w-5" />} color="border-l-red-500" />
            </div>
            {renderTable(
              ["Invoice #", "Client", "Amount", "Paid", "Status", "Date"],
              filteredInv.slice(0, 50).map((i: any) => [
                i.invoiceNumber || `INV-${i.id}`, i.clientName || "—", fmt(i.total || 0), fmt(i.amountPaid || 0), i.status || "draft",
                i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString() : "—",
              ])
            )}
          </CardContent>
        </Card>
      );
      if (subTab === "monthly") return (
        <Card><CardHeader><CardTitle>Monthly Invoice Report</CardTitle></CardHeader>
          <CardContent>{renderTable(["Month", "Invoices", "Total Amount", "Paid Amount"], invMonthly.map(m => [m.month, m.count, fmt(m.total), fmt(m.paid)]))}</CardContent></Card>
      );
      if (subTab === "client") return (
        <Card><CardHeader><CardTitle>Client Invoices</CardTitle><CardDescription>Invoice totals by client</CardDescription></CardHeader>
          <CardContent>{renderTable(["Client", "# Invoices", "Total Amount", "Paid"], invByClient.map(c => [c.name, c.count, fmt(c.total), fmt(c.paid)]))}</CardContent></Card>
      );
      if (subTab === "category") return (
        <Card><CardHeader><CardTitle>Invoice Category</CardTitle></CardHeader>
          <CardContent>{renderTable(["Category", "# Invoices", "Total Amount"], invByCategory.map(c => [c.name, c.count, fmt(c.total)]))}</CardContent></Card>
      );
    }

    // ═══════ ESTIMATES ═══════
    if (mainTab === "estimates") {
      if (subTab === "overview") return (
        <Card>
          <CardHeader><CardTitle>Estimates Overview</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatsCard label="Total Estimates" value={filteredEst.length} description="All estimates" icon={<FileSpreadsheet className="h-5 w-5" />} color="border-l-blue-500" />
              <StatsCard label="Total Value" value={fmt(estTotal)} description="Combined value" icon={<DollarSign className="h-5 w-5" />} color="border-l-green-500" />
              <StatsCard label="Avg Value" value={fmt(filteredEst.length > 0 ? Math.round(estTotal / filteredEst.length) : 0)} description="Per estimate" icon={<TrendingUp className="h-5 w-5" />} color="border-l-purple-500" />
            </div>
            {renderTable(
              ["Estimate #", "Client", "Amount", "Status", "Date"],
              filteredEst.slice(0, 50).map((e: any) => [
                e.estimateNumber || `EST-${e.id}`, e.clientName || "—", fmt(e.total || 0), e.status || "draft",
                e.date ? new Date(e.date).toLocaleDateString() : "—",
              ])
            )}
          </CardContent>
        </Card>
      );
      if (subTab === "monthly") return (
        <Card><CardHeader><CardTitle>Monthly Estimates</CardTitle></CardHeader>
          <CardContent>{renderTable(["Month", "# Estimates", "Total Value"], estMonthly.map(m => [m.month, m.count, fmt(m.total)]))}</CardContent></Card>
      );
      if (subTab === "client") return (
        <Card><CardHeader><CardTitle>Client Estimates</CardTitle></CardHeader>
          <CardContent>{renderTable(["Client", "# Estimates", "Total Value"], estByClient.map(c => [c.name, c.count, fmt(c.total)]))}</CardContent></Card>
      );
      if (subTab === "category") return (
        <Card><CardHeader><CardTitle>Estimate Category</CardTitle></CardHeader>
          <CardContent>{renderTable(["Category", "# Estimates", "Total Value"], estByCategory.map(c => [c.name, c.count, fmt(c.total)]))}</CardContent></Card>
      );
    }

    // ═══════ PROJECTS ═══════
    if (mainTab === "projects") {
      if (subTab === "overview") return (
        <Card>
          <CardHeader><CardTitle>Projects Overview</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatsCard label="Total Projects" value={filteredProj.length} description="All projects" icon={<FolderKanban className="h-5 w-5" />} color="border-l-blue-500" />
              {projByStatus.slice(0, 3).map(ps => (
                <StatsCard key={ps.status} label={ps.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} value={ps.count} description="Projects" icon={<FolderKanban className="h-5 w-5" />} color="border-l-cyan-500" />
              ))}
            </div>
            {renderTable(
              ["Project", "Status", "Budget", "Progress", "Start Date"],
              filteredProj.slice(0, 50).map((p: any) => [
                p.name || "—", (p.status || "not_started").replace(/_/g, " "), fmt(p.budget || 0),
                `${p.progress || 0}%`, p.startDate ? new Date(p.startDate).toLocaleDateString() : "—",
              ])
            )}
          </CardContent>
        </Card>
      );
      if (subTab === "client") return (
        <Card><CardHeader><CardTitle>Client Projects</CardTitle></CardHeader>
          <CardContent>{renderTable(["Client", "# Projects", "Total Budget"], projByClient.map(c => [c.name, c.count, fmt(c.budget)]))}</CardContent></Card>
      );
      if (subTab === "category") return (
        <Card><CardHeader><CardTitle>Project Category</CardTitle></CardHeader>
          <CardContent>{renderTable(["Category", "# Projects"], projByCategory.map(c => [c.name, c.count]))}</CardContent></Card>
      );
    }

    // ═══════ CLIENTS ═══════
    if (mainTab === "clients") {
      return (
        <Card>
          <CardHeader><CardTitle>Clients Overview</CardTitle><CardDescription>Revenue and project summary per client</CardDescription></CardHeader>
          <CardContent>
            {renderTable(
              ["Client", "# Invoices", "Invoice Total", "Payments", "# Projects", "Status"],
              clientOverview.map(c => [c.name, c.invoices, fmt(c.invoiceTotal), fmt(c.payments), c.projects, c.status])
            )}
          </CardContent>
        </Card>
      );
    }

    // ═══════ TIME SHEETS ═══════
    if (mainTab === "timesheets") {
      const fmtHrs = (mins: number) => `${(mins / 60).toFixed(1)} hrs`;
      if (subTab === "team") return (
        <Card><CardHeader><CardTitle>Time Sheets by Team Member</CardTitle></CardHeader>
          <CardContent>{renderTable(["Team Member", "Total Hours", "# Entries"], tsByTeamMember.map(t => [t.name, fmtHrs(t.totalMinutes), t.entries]))}</CardContent></Card>
      );
      if (subTab === "client") return (
        <Card><CardHeader><CardTitle>Time Sheets by Client</CardTitle></CardHeader>
          <CardContent>{renderTable(["Client", "Total Hours", "# Entries"], tsByClient.map(t => [t.name, fmtHrs(t.totalMinutes), t.entries]))}</CardContent></Card>
      );
      if (subTab === "project") return (
        <Card><CardHeader><CardTitle>Time Sheets by Project</CardTitle></CardHeader>
          <CardContent>{renderTable(["Project", "Total Hours", "# Entries"], tsByProject.map(t => [t.name, fmtHrs(t.totalMinutes), t.entries]))}</CardContent></Card>
      );
    }

    // ═══════ FINANCIAL ═══════
    if (mainTab === "financial") {
      if (subTab === "income-expenses") return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle>Income vs Expenses</CardTitle><CardDescription>Monthly comparison</CardDescription></div>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatsCard label="Total Income" value={`${currencyCode} ${totalIncome.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} description="Revenue" icon={<TrendingUp className="h-5 w-5" />} color="border-l-green-500" />
              <StatsCard label="Total Expenses" value={`${currencyCode} ${totalExpense.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} description="Costs" icon={<DollarSign className="h-5 w-5" />} color="border-l-red-500" />
              <StatsCard label="Net Profit" value={`${currencyCode} ${(totalIncome - totalExpense).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} description="Income - Expenses" icon={<TrendingUp className="h-5 w-5" />} color="border-l-blue-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyFinancial} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                <Tooltip formatter={(value: number, name: string) => [`${currencyCode} ${value.toLocaleString()}`, name]} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
      if (subTab === "summary") return (
        <Card>
          <CardHeader><CardTitle>Invoices - Expenses - Orders Summary</CardTitle></CardHeader>
          <CardContent>
            {renderTable(
              ["Month", "Invoices", "Invoice Total", "Expenses", "Expense Total", "Net"],
              monthlyFinancial.map(d => [
                d.month, d.invoiceCount,
                `${currencyCode} ${d.income.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`,
                d.expenseCount,
                `${currencyCode} ${d.expense.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`,
                `${currencyCode} ${(d.income - d.expense).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`,
              ])
            )}
          </CardContent>
        </Card>
      );
    }

    return <div className="flex items-center justify-center py-12 text-muted-foreground">Select a section above to get started</div>;
  };

  return (
    <ModuleLayout
      title="Reports"
      description="Comprehensive business reports and analytics"
      icon={<TrendingUp className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Reports" },
        ...(mainTab ? [{ label: mainTab.charAt(0).toUpperCase() + mainTab.slice(1) }] : []),
        ...(subTab && subTabDefs[mainTab]?.find(s => s.value === subTab) ? [{ label: subTabDefs[mainTab].find(s => s.value === subTab)!.label }] : []),
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={printReport}><Printer className="h-4 w-4 mr-1" />Print</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Main Tabs - matching crm.africa */}
        <Tabs value={mainTab} onValueChange={handleMainTabChange}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="estimates">Estimates</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="timesheets">Time Sheets</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sub Tabs */}
        {subTabDefs[mainTab] && subTabDefs[mainTab].length > 1 && (
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList>
              {subTabDefs[mainTab].map(st => (
                <TabsTrigger key={st.value} value={st.value}>{st.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Filters */}
        {mainTab !== "financial" && (
          <div className="flex gap-3 items-center">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {(mainTab === "invoices" || mainTab === "estimates" || mainTab === "projects") && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {mainTab === "invoices" && <>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="sent">Due</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </>}
                  {mainTab === "estimates" && <>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </>}
                  {mainTab === "projects" && <>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </>}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={() => { setStatusFilter("all"); setYearFilter(String(currentYear)); }}>
              Reset
            </Button>
          </div>
        )}

        {/* Content */}
        {renderSubContent()}
      </div>
    </ModuleLayout>
  );
}
