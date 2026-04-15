import { ModuleLayout } from "@/components/ModuleLayout";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { buildCommunicationComposePath } from "@/lib/communications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DollarSign, Plus, Search, Eye, Edit, Trash2, Receipt, TrendingUp, Loader2, Check, BarChart3, Copy, Mail, ArrowUpDown, Link } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/export-utils";
import { ListPageToolbar } from "@/components/list-page/ListPageToolbar";
import { RowActionsMenu, actionIcons, type RowAction } from "@/components/list-page/RowActionsMenu";
import { TableColumnSettings, useColumnVisibility, type ColumnConfig } from "@/components/list-page/TableColumnSettings";
import { EnhancedBulkActions, bulkExportAction, bulkCopyIdsAction, bulkDeleteAction, bulkApproveAction, bulkEmailAction } from "@/components/list-page/EnhancedBulkActions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExpenseBudgetReport } from "@/components/ExpenseBudgetReport";
import { StatsCard } from "@/components/ui/stats-card";

export default function Expenses() {
  // All hooks must be called at the top, before any conditional returns
  const { allowed, isLoading } = useRequireFeature("accounting:expenses:view");
  const [location, navigate] = useLocation();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "budget">("list");
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  const expenseColumns: ColumnConfig[] = [
    { key: "date", label: "Date" },
    { key: "category", label: "Category" },
    { key: "vendor", label: "Vendor" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "status", label: "Status" },
    { key: "receipt", label: "Receipt" },
  ];
  const { visibleColumns, toggleColumn, isVisible, pageSize, updatePageSize, reset } = useColumnVisibility(expenseColumns, "expenses");

  // Fetch real data from backend
  const { data: expensesData = [], isLoading: isLoadingExpenses } = trpc.expenses.list.useQuery();
  const utils = trpc.useUtils();
  
  // Delete mutation
  const deleteExpenseMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      utils.expenses.list.invalidate();
      setDeleteDialogOpen(false);
      setSelectedExpenseId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete expense");
    },
  });

  // Approve mutation (using centralized approvals system)
  const approveExpenseMutation = trpc.approvals.approveExpense.useMutation({
    onSuccess: () => {
      toast.success("Expense approved successfully");
      utils.expenses.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve expense");
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = trpc.expenses.bulkApprove.useMutation({
    onSuccess: () => {
      toast.success("Expenses approved successfully");
      utils.expenses.list.invalidate();
      setSelectedExpenses(new Set());
    },
    onError: (error) => {
      toast.error(error.message || "Failed to bulk approve expenses");
    },
  });

  // Early returns after all hooks are declared
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  // Safely convert frozen Drizzle objects to plain JS objects
  const plainExpensesData = (() => {
    if (!Array.isArray(expensesData)) return [];
    return expensesData.map(exp => {
      try {
        return JSON.parse(JSON.stringify(exp));
      } catch {
        return exp;
      }
    });
  })();

  // Transform backend data to display format
  const expenses = (() => {
    if (!Array.isArray(plainExpensesData)) return [];
    return (plainExpensesData as any[]).map((expense: any) => ({
      id: expense.id,
      date: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: expense.category || "General",
      description: expense.description || "",
      amount: (expense.amount || 0) / 100,
      vendor: expense.vendor || "Unknown",
      paymentMethod: expense.paymentMethod || "cash",
      status: expense.status || "pending",
      receipt: expense.receiptUrl || null,
    }));
  })();

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      paid: "bg-blue-100 text-blue-700",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-700"}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const filteredExpenses = (() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  })();

  const summary = (() => {
    return {
      total: expenses.reduce((sum, e) => sum + e.amount, 0),
      approved: expenses.filter(e => e.status === "approved").reduce((sum, e) => sum + e.amount, 0),
      pending: expenses.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0),
      categories: new Set(expenses.map(e => e.category)).size,
    };
  })();

  const handleDeleteClick = (id: string) => {
    setSelectedExpenseId(id);
    setDeleteDialogOpen(true);
  };

  const toggleSelectExpense = (id: string) => {
    setSelectedExpenses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedExpenses.size === filteredExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(filteredExpenses.map((e) => e.id)));
    }
  };

  return (
    <ModuleLayout
      title="Expenses"
      description="Track and manage business expenses"
      icon={<DollarSign className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Finance", href: "/accounting" },
        { label: "Expenses" },
      ]}
      actions={
        <Button onClick={() => navigate("/expenses/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Record Expense
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b">
          <Button 
            variant={activeTab === "list" ? "default" : "ghost"}
            onClick={() => setActiveTab("list")}
            className="rounded-none border-b-2 border-b-transparent data-[active=true]:border-b-blue-500"
            data-active={activeTab === "list"}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Expense List
          </Button>
          <Button 
            variant={activeTab === "budget" ? "default" : "ghost"}
            onClick={() => setActiveTab("budget")}
            className="rounded-none border-b-2 border-b-transparent data-[active=true]:border-b-blue-500"
            data-active={activeTab === "budget"}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Budget Report
          </Button>
        </div>

        {/* Expense List Tab */}
        {activeTab === "list" && (
          <>
        <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            label="Total Expenses"
            value={<>Ksh {(summary.total || 0).toLocaleString()}</>}
            description="All time"
            icon={<DollarSign className="h-5 w-5" />}
            color="border-l-red-500"
          />

          <StatsCard
            label="Approved"
            value={<>Ksh {(summary.approved || 0).toLocaleString()}</>}
            description={<>{expenses.filter(e => e.status === "approved").length} expenses</>}
            icon={<TrendingUp className="h-5 w-5" />}
            color="border-l-green-500"
          />

          <StatsCard
            label="Pending Approval"
            value={<>Ksh {(summary.pending || 0).toLocaleString()}</>}
            description={<>{expenses.filter(e => e.status === "pending").length} expenses</>}
            icon={<Receipt className="h-5 w-5" />}
            color="border-l-yellow-500"
          />

          <StatsCard
            label="Categories"
            value={summary.categories}
            description="Expense categories"
            icon={<Receipt className="h-5 w-5" />}
            color="border-l-blue-500"
          />
        </div>

        {/* Toolbar */}
        <ListPageToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search expenses..."
          onCreateClick={() => navigate("/expenses/create")}
          createLabel="Record Expense"
          onExportClick={() => downloadCSV(expenses.map(e => ({ Date: e.date, Category: e.category, Vendor: e.vendor, Description: e.description, Amount: e.amount, "Payment Method": e.paymentMethod, Status: e.status })), "expenses")}
          onImportClick={() => toast.info("CSV import is available in Settings > Data Management")}
          onPrintClick={() => window.print()}
          filterContent={
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Array.from(new Set(expenses.map(e => e.category))).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Bulk Actions Bar */}
        <EnhancedBulkActions
          selectedCount={selectedExpenses.size}
          onClear={() => setSelectedExpenses(new Set())}
          actions={[
            bulkApproveAction(selectedExpenses, (ids) => bulkApproveMutation.mutate({ ids })),
            bulkExportAction(selectedExpenses, expenses, expenseColumns, "expenses"),
            bulkCopyIdsAction(selectedExpenses),
            bulkEmailAction(navigate),
            bulkDeleteAction(selectedExpenses, (ids) => ids.forEach(id => deleteExpenseMutation.mutate(id))),
          ]}
        />

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm text-muted-foreground">{filteredExpenses.length} expenses</span>
              <TableColumnSettings columns={expenseColumns} visibleColumns={visibleColumns} onToggleColumn={toggleColumn} onReset={reset} pageSize={pageSize} onPageSizeChange={updatePageSize} />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={selectedExpenses.size === filteredExpenses.length && filteredExpenses.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    {isVisible("date") && <TableHead>Date</TableHead>}
                    {isVisible("category") && <TableHead>Category</TableHead>}
                    {isVisible("vendor") && <TableHead>Vendor</TableHead>}
                    {isVisible("description") && <TableHead>Description</TableHead>}
                    {isVisible("amount") && <TableHead>Amount</TableHead>}
                    {isVisible("status") && <TableHead>Status</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingExpenses ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        Loading expenses...
                      </TableCell>
                    </TableRow>
                  ) : filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className={selectedExpenses.has(expense.id) ? "bg-primary/5" : ""}>
                        <TableCell><Checkbox checked={selectedExpenses.has(expense.id)} onCheckedChange={() => toggleSelectExpense(expense.id)} /></TableCell>
                        {isVisible("date") && <TableCell>{expense.date ? new Date(expense.date).toLocaleDateString() : "-"}</TableCell>}
                        {isVisible("category") && <TableCell>{expense.category}</TableCell>}
                        {isVisible("vendor") && <TableCell>{expense.vendor}</TableCell>}
                        {isVisible("description") && <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>}
                        {isVisible("amount") && <TableCell className="font-mono">Ksh {(expense.amount || 0).toLocaleString()}</TableCell>}
                        {isVisible("status") && <TableCell>{getStatusBadge(expense.status)}</TableCell>}
                        <TableCell className="text-right">
                          <RowActionsMenu
                            primaryActions={[
                              { label: "View", icon: actionIcons.view, onClick: () => navigate(`/expenses/${expense.id}`) },
                              { label: "Edit", icon: actionIcons.edit, onClick: () => navigate(`/expenses/${expense.id}/edit`) },
                              { label: "Delete", icon: actionIcons.delete, onClick: () => handleDeleteClick(expense.id), variant: "destructive" },
                            ]}
                            menuActions={[
                              ...(expense.status === "pending" ? [{ label: "Approve Expense", icon: <Check className="h-4 w-4" />, onClick: () => approveExpenseMutation.mutate({ id: expense.id }) }] : []),
                              { label: "Duplicate Expense", icon: actionIcons.copy, onClick: () => navigate(`/expenses/create?clone=${expense.id}`) },
                              { label: "Email Receipt", icon: actionIcons.email, onClick: () => navigate(buildCommunicationComposePath(location, expense.vendorEmail || "", `Expense Receipt ${expense.id}`)) },
                              { label: "Attach to Project", icon: <Link className="h-4 w-4" />, onClick: () => navigate(`/expenses/${expense.id}/edit`), separator: true },
                              { label: "Download Receipt", icon: actionIcons.download, onClick: () => { navigate(`/expenses/${expense.id}`); setTimeout(() => window.print(), 500); } },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense record? This action cannot be undone.
            </AlertDialogDescription>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedExpenseId && deleteExpenseMutation.mutate(selectedExpenseId)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteExpenseMutation.isPending}
              >
                {deleteExpenseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
        </div>
        </>
        )}

        {/* Budget Report Tab */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            <ExpenseBudgetReport />
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
