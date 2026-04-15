import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePermissions } from "@/_core/hooks/usePermissions";
import DashboardLayout from "@/components/DashboardLayout";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  FileText,
  Receipt,
  BarChart3,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  PiggyBank,
  Wallet,
  CreditCard,
} from "lucide-react";

/**
 * Accounting Management Page
 * Comprehensive accounting and financial management with role-based access control
 * Filters visible items and actions based on user permissions
 */
export default function AccountingManagement() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions(user?.id);

  // Fetch accounting data
  const { data: invoices = [] } = trpc.invoices.list.useQuery();
  const { data: payments = [] } = trpc.payments.list.useQuery();
  const { data: expenses = [] } = trpc.expenses.list.useQuery();
  const { data: budgets = [] } = trpc.budgets.list.useQuery();
  const { data: receipts = [] } = trpc.receipts.list.useQuery();

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    const totalInvoices = (invoices || []).length;
    const totalPayments = (payments || []).length;
    const totalExpenses = (expenses || []).length;
    const totalBudgets = (budgets || []).length;
    const totalReceipts = (receipts || []).length;

    const invoiceRevenue = (invoices as any[]).reduce((sum, inv) => sum + (inv.total || 0), 0) / 100;
    const expenseAmount = (expenses as any[]).reduce((sum, exp) => sum + (exp.amount || 0), 0) / 100;
    const paymentsProcessed = (payments as any[]).reduce((sum, pmt) => sum + (pmt.amount || 0), 0) / 100;

    return {
      totalInvoices,
      totalPayments,
      totalExpenses,
      totalBudgets,
      totalReceipts,
      invoiceRevenue,
      expenseAmount,
      paymentsProcessed,
      netProfit: invoiceRevenue - expenseAmount,
    };
  }, [invoices, payments, expenses, budgets, receipts]);

  // Management modules based on permissions
  const managementModules = useMemo(() => {
    const modules = [];

    // Invoicing Module
    if (hasPermission("invoices_view") || ["super_admin", "admin", "accountant"].includes(user?.role || "")) {
      modules.push({
        title: "Invoice Management",
        description: "Create and manage client invoices",
        icon: FileText,
        href: "/invoices",
        capability: "invoices_create",
        stats: {
          label: "Total Invoices",
          value: financialMetrics.totalInvoices.toString(),
          trend: "up",
        },
        canCreate: hasPermission("invoices_create") || ["super_admin", "admin", "accountant"].includes(user?.role || ""),
        canEdit: hasPermission("invoices_edit") || ["super_admin", "admin"].includes(user?.role || ""),
        canDelete: hasPermission("invoices_delete") || ["super_admin"].includes(user?.role || ""),
      });
    }

    // Payments Module
    if (hasPermission("payments_view") || ["super_admin", "admin", "accountant"].includes(user?.role || "")) {
      modules.push({
        title: "Payment Management",
        description: "Track incoming and outgoing payments",
        icon: DollarSign,
        href: "/payments",
        capability: "payments_create",
        stats: {
          label: "Total Payments",
          value: financialMetrics.totalPayments.toString(),
          trend: "up",
        },
        canCreate: hasPermission("payments_create") || ["super_admin", "admin", "accountant"].includes(user?.role || ""),
        canEdit: hasPermission("payments_edit") || ["super_admin", "admin"].includes(user?.role || ""),
        canDelete: hasPermission("payments_delete") || ["super_admin"].includes(user?.role || ""),
      });
    }

    // Expenses Module
    if (hasPermission("expenses_view") || ["super_admin", "admin", "accountant", "staff"].includes(user?.role || "")) {
      modules.push({
        title: "Expense Management",
        description: "Record and manage business expenses",
        icon: Receipt,
        href: "/expenses",
        capability: "expenses_create",
        stats: {
          label: "Total Expenses",
          value: financialMetrics.totalExpenses.toString(),
          trend: "down",
        },
        canCreate: hasPermission("expenses_create") || ["super_admin", "admin", "accountant"].includes(user?.role || ""),
        canEdit: hasPermission("expenses_edit") || ["super_admin", "admin", "accountant"].includes(user?.role || ""),
        canDelete: hasPermission("expenses_delete") || ["super_admin", "admin"].includes(user?.role || ""),
      });
    }

    // Chart of Accounts Module
    if (["super_admin", "admin", "accountant"].includes(user?.role || "")) {
      modules.push({
        title: "Chart of Accounts",
        description: "Manage your accounting structure",
        icon: BarChart3,
        href: "/chart-of-accounts",
        capability: "chart_of_accounts_manage",
        stats: {
          label: "Accounts",
          value: "N/A",
        },
        canCreate: hasPermission("chart_of_accounts_create") || ["super_admin", "admin"].includes(user?.role || ""),
        canEdit: hasPermission("chart_of_accounts_edit") || ["super_admin", "admin"].includes(user?.role || ""),
        canDelete: hasPermission("chart_of_accounts_delete") || ["super_admin"].includes(user?.role || ""),
      });
    }

    // Budgets Module
    if (hasPermission("budgets_view") || ["super_admin", "admin", "accountant", "project_manager"].includes(user?.role || "")) {
      modules.push({
        title: "Budget Management",
        description: "Plan and monitor departmental budgets",
        icon: PiggyBank,
        href: "/budgets",
        capability: "budgets_create",
        stats: {
          label: "Total Budgets",
          value: financialMetrics.totalBudgets.toString(),
        },
        canCreate: hasPermission("budgets_create") || ["super_admin", "admin", "accountant"].includes(user?.role || ""),
        canEdit: hasPermission("budgets_edit") || ["super_admin", "admin"].includes(user?.role || ""),
        canDelete: hasPermission("budgets_delete") || ["super_admin"].includes(user?.role || ""),
      });
    }

    // Receipts Module
    if (hasPermission("receipts_view") || ["super_admin", "admin", "accountant"].includes(user?.role || "")) {
      modules.push({
        title: "Receipt Management",
        description: "Track and approve financial receipts",
        icon: Wallet,
        href: "/receipts",
        capability: "receipts_create",
        stats: {
          label: "Total Receipts",
          value: financialMetrics.totalReceipts.toString(),
        },
        canCreate: hasPermission("receipts_create") || ["super_admin", "admin", "accountant"].includes(user?.role || ""),
        canEdit: hasPermission("receipts_edit") || ["super_admin", "admin"].includes(user?.role || ""),
        canDelete: hasPermission("receipts_delete") || ["super_admin"].includes(user?.role || ""),
      });
    }

    // Payment Reconciliation
    if (["super_admin", "admin", "accountant"].includes(user?.role || "")) {
      modules.push({
        title: "Payment Reconciliation",
        description: "Reconcile bank statements and payments",
        icon: CreditCard,
        href: "/payment-reconciliation",
        capability: "payments_reconcile",
        canCreate: false,
        canEdit: true,
        canDelete: false,
      });
    }

    return modules;
  }, [user?.role, hasPermission, financialMetrics]);

  // Financial Dashboard
  const canViewFinancialReports =
    hasPermission("financial_reports_view") || ["super_admin", "admin", "accountant"].includes(user?.role || "");

  return (
    <ModuleLayout
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Accounting", href: "/accounting" },
          { label: "Management", href: "/accounting/management" },
        ]}
        title="Accounting Management"
        description="Manage financial operations with role-based access control"
      >
        {/* Financial Summary Cards */}
        {canViewFinancialReports && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${financialMetrics.invoiceRevenue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">From {financialMetrics.totalInvoices} invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${financialMetrics.expenseAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">From {financialMetrics.totalExpenses} expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${financialMetrics.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${financialMetrics.netProfit.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  {financialMetrics.netProfit >= 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Revenue - Expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Payments Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ${financialMetrics.paymentsProcessed.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{financialMetrics.totalPayments} transactions</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Management Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {managementModules.map((module) => (
            <Card key={module.title} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                    <CardDescription className="text-xs">{module.description}</CardDescription>
                  </div>
                  <module.icon className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                {module.stats && (
                  <div className="mb-3 p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">{module.stats.label}</p>
                    <p className="text-lg font-semibold">{module.stats.value}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(module.href)}
                    className="flex-1"
                  >
                    Open
                  </Button>
                  {module.canCreate && (
                    <Button size="sm" variant="ghost" title="Create new" onClick={() => navigate(`${module.href}/create`)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {hasPermission("invoices_create") && (
              <Button onClick={() => navigate("/invoices/create")} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            )}
            {hasPermission("payments_create") && (
              <Button onClick={() => navigate("/payments/create")} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            )}
            {hasPermission("expenses_create") && (
              <Button onClick={() => navigate("/expenses/create")} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            )}
            {hasPermission("budgets_create") && (
              <Button onClick={() => navigate("/budgets/create")} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Budget
              </Button>
            )}
            {canViewFinancialReports && (
              <Button variant="outline" onClick={() => navigate("/finance/reports")} size="sm">
                View Financial Reports
              </Button>
            )}
          </CardContent>
        </Card>
      </ModuleLayout>
  );
}
