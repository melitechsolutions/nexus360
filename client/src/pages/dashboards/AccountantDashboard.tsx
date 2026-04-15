import { useAuthWithPersistence } from "@/_core/hooks/useAuthWithPersistence";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  FileText,
  TrendingUp,
  CreditCard,
  BarChart3,
  CheckCircle,
  FolderKanban,
  Users,
  Receipt,
  Package,
  Briefcase,
  UserCog,
  ArrowRight,
  Mail,
  Settings,
  Calculator,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

export default function AccountantDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuthWithPersistence({
    redirectOnUnauthenticated: true,
  });
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Fetch dashboard metrics and data
  const { data: metrics, isLoading: metricsLoading } = trpc.dashboard.metrics.useQuery();
  const { data: recentInvoices } = trpc.invoices.list.useQuery({ limit: 5 });
  const { data: recentExpenses } = trpc.expenses.list.useQuery({ limit: 5 });
  const { data: recentPayments } = trpc.payments.list.useQuery({ limit: 5 });
  const { data: reconciliationData } = trpc.settings.getBankReconciliation.useQuery();
  const { data: pendingApprovals } = trpc.approvals.getPendingApprovals.useQuery();
  
  const { data: allInvoices = [] } = trpc.invoices.list.useQuery();
  const { data: allExpenses = [] } = trpc.expenses.list.useQuery();

  // Convert frozen Drizzle objects to plain objects to avoid React error #306
  const metricsPlain = metrics ? JSON.parse(JSON.stringify(metrics)) : null;
  const recentInvoicesPlain = recentInvoices ? JSON.parse(JSON.stringify(recentInvoices)) : [];
  const recentExpensesPlain = recentExpenses ? JSON.parse(JSON.stringify(recentExpenses)) : [];
  const recentPaymentsPlain = recentPayments ? JSON.parse(JSON.stringify(recentPayments)) : [];
  const reconciliationDataPlain = reconciliationData ? JSON.parse(JSON.stringify(reconciliationData)) : null;
  const pendingApprovalsPlain = pendingApprovals ? JSON.parse(JSON.stringify(pendingApprovals)) : [];
  const allInvoicesPlain = allInvoices ? JSON.parse(JSON.stringify(allInvoices)) : [];
  const allExpensesPlain = allExpenses ? JSON.parse(JSON.stringify(allExpenses)) : [];

  // Mutations for approvals
  const approveInvoice = trpc.approvals.approveInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice approved");
      utils.approvals.getPendingApprovals.invalidate();
      utils.invoices.list.invalidate();
    }
  });

  const approveExpense = trpc.approvals.approveExpense.useMutation({
    onSuccess: () => {
      toast.success("Expense approved");
      utils.approvals.getPendingApprovals.invalidate();
      utils.expenses.list.invalidate();
    }
  });

  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== "accountant" && user?.role !== "super_admin") {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalRevenue = Array.isArray(allInvoicesPlain) 
    ? allInvoicesPlain.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) / 100 
    : 0;
  
  const totalExpenses = Array.isArray(allExpensesPlain) 
    ? allExpensesPlain.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) / 100 
    : 0;
  
  const netProfit = totalRevenue - totalExpenses;

  const recentTransactions = [
    ...(Array.isArray(recentInvoicesPlain) ? recentInvoicesPlain.map((inv: any) => ({
      type: 'invoice',
      description: `Invoice ${inv.invoiceNumber || inv.id}`,
      subtext: inv.clientName || 'Client Payment',
      amount: (inv.total || 0) / 100,
      date: inv.createdAt,
      isPositive: true,
    })) : []),
    ...(Array.isArray(recentExpensesPlain) ? recentExpensesPlain.map((exp: any) => ({
      type: 'expense',
      description: exp.description || exp.category || 'Expense',
      subtext: exp.category || 'Business Expense',
      amount: (exp.amount || 0) / 100,
      date: exp.date || exp.createdAt,
      isPositive: false,
    })) : []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Module features for navigation
  const features = [
    {
      title: "Projects",
      description: "Manage and track all your projects",
      icon: FolderKanban,
      href: "/projects",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Clients",
      description: "Client relationship management",
      icon: Users,
      href: "/clients",
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Invoices",
      description: "Create and manage invoices",
      icon: FileText,
      href: "/invoices",
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Estimates",
      description: "Generate quotations and estimates",
      icon: Receipt,
      href: "/estimates",
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: "Payments",
      description: "Track payments and transactions",
      icon: DollarSign,
      href: "/payments",
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Products",
      description: "Product catalog management",
      icon: Package,
      href: "/products",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
    },
    {
      title: "Services",
      description: "Service offerings catalog",
      icon: Briefcase,
      href: "/services",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
    },
    {
      title: "Accounting",
      description: "Financial management and reports",
      icon: CreditCard,
      href: "/accounting",
      color: "text-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-950",
    },
    {
      title: "Reports",
      description: "Analytics and insights",
      icon: BarChart3,
      href: "/reports",
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "HR",
      description: "Human resources management",
      icon: UserCog,
      href: "/hr",
      color: "text-rose-500",
      bgColor: "bg-rose-50 dark:bg-rose-950",
    },
    {
      title: "Communications",
      description: "Email, SMS, and messaging",
      icon: Mail,
      href: "/communications",
      color: "text-teal-500",
      bgColor: "bg-teal-50 dark:bg-teal-950",
    },
  ];

  return (
    <ModuleLayout
      title="Accountant Dashboard"
      description="Manage invoices, expenses, financial records, and approve transactions"
      icon={<Calculator className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting" }]}
      actions={
        <div className="flex gap-2">
          <Button onClick={() => setLocation("/accounting/management")} variant="secondary" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Accounting Management
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLocation("/crm-home")}>
            Go to Main Dashboard
          </Button>
        </div>
      }
    >
      <div className="space-y-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="Total Revenue" value={<>KES {((totalRevenue) || 0).toLocaleString()}</>} color="border-l-orange-500" />
          <StatsCard
            label="Pending Approvals"
            value={(pendingApprovalsPlain?.invoices?.length || 0) + (pendingApprovalsPlain?.expenses?.length || 0)}
            color="border-l-purple-500"
          />
          <StatsCard label="Total Expenses" value={<>KES {((totalExpenses) || 0).toLocaleString()}</>} color="border-l-green-500" />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Net Profit</CardTitle></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>KES {((netProfit) || 0).toLocaleString()}</div></CardContent>
          </Card>
        </div>

        {/* Module Features Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.href}
                className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all group hover:scale-105 border-2 hover:border-primary/50"
                onClick={() => setLocation(feature.href)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full group-hover:bg-accent">
                    View {feature.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="approvals"><CheckCircle className="w-4 h-4 mr-2" />Approvals</TabsTrigger>
            <TabsTrigger value="reconciliation"><CreditCard className="w-4 h-4 mr-2" />Bank Reconciliation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-slate-900 dark:text-slate-50">Recent Transactions</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {recentTransactions.map((t, i) => (
                    <div key={t.id || `trans-${i}`} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div><p className="text-sm font-medium text-slate-900 dark:text-slate-50">{t.description}</p><p className="text-xs text-slate-500 dark:text-slate-400">{t.subtext}</p></div>
                      <p className={`text-sm font-bold ${t.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{t.isPositive ? '+' : '-'}KES {(((t.amount) || 0)).toLocaleString()}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-slate-900 dark:text-slate-50">Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" onClick={() => setLocation("/invoices/create")}>Create Invoice</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/expenses/create")}>Record Expense</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/payments/create")}>Record Payment</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-slate-900 dark:text-slate-50">Pending Approvals</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50">Invoices</h3>
                  {Array.isArray(pendingApprovalsPlain?.invoices) && pendingApprovalsPlain.invoices.map((inv: any) => (
                    <div key={inv.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div><p className="font-medium text-slate-900 dark:text-slate-50">{inv.invoiceNumber}</p><p className="text-sm text-slate-500 dark:text-slate-400">KES {((((inv.total || 0)/100)) || 0).toLocaleString()}</p></div>
                      <Button size="sm" onClick={() => approveInvoice.mutate({ id: inv.id })}>Approve</Button>
                    </div>
                  ))}
                  <h3 className="font-semibold mt-4 text-slate-900 dark:text-slate-50">Expenses</h3>
                  {Array.isArray(pendingApprovalsPlain?.expenses) && pendingApprovalsPlain.expenses.map((exp: any) => (
                    <div key={exp.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div><p className="font-medium text-slate-900 dark:text-slate-50">{exp.category}</p><p className="text-sm text-slate-500 dark:text-slate-400">KES {((((exp.amount || 0)/100)) || 0).toLocaleString()}</p></div>
                      <Button size="sm" onClick={() => approveExpense.mutate({ id: exp.id })}>Approve</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-4">
            <StatsCard
              label="Bank Reconciliation"
              value={<>KES {(((reconciliationDataPlain?.revenue) || 0)).toLocaleString()}</>}
              color="border-l-blue-500"
            />
          </TabsContent>
        </Tabs>
      </div>
    </ModuleLayout>
  );
}
