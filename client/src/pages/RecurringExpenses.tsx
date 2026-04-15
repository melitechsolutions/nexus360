import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Edit2, Play, Clock, RefreshCw, Search } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

type RecurringExpense = {
  id: string;
  organizationId: string | null;
  category: string;
  vendor: string | null;
  amount: number;
  description: string | null;
  paymentMethod: string | null;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  dayOfMonth: number | null;
  reminderDaysBefore: number | null;
  lastGeneratedDate: string | null;
  isActive: number;
  chartOfAccountId: number | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const EXPENSE_CATEGORIES = [
  "Rent", "Utilities", "Internet", "Software Subscriptions", "Insurance",
  "Hosting & Cloud", "Marketing", "Office Supplies", "Salaries",
  "Telecommunications", "Maintenance", "Security", "Cleaning",
  "Transportation", "Professional Services", "Other",
];

export function RecurringExpenses() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formData, setFormData] = useState({
    category: "",
    vendor: "",
    amount: "",
    description: "",
    paymentMethod: "" as string,
    frequency: "monthly" as "weekly" | "biweekly" | "monthly" | "quarterly" | "annually",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    dayOfMonth: "1",
    reminderDaysBefore: "3",
  });

  // Fetch data
  const { data: recurringList, refetch } = trpc.expenses.listRecurringExpenses.useQuery();

  // Mutations
  const createMutation = trpc.expenses.createRecurringExpense.useMutation({
    onSuccess: async () => {
      toast.success("Recurring expense created");
      setIsOpen(false);
      resetForm();
      await refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to create recurring expense"),
  });

  const updateMutation = trpc.expenses.updateRecurringExpense.useMutation({
    onSuccess: async () => {
      toast.success("Recurring expense updated");
      setIsOpen(false);
      setEditingId(null);
      resetForm();
      await refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to update recurring expense"),
  });

  const deleteMutation = trpc.expenses.deleteRecurringExpense.useMutation({
    onSuccess: async () => {
      toast.success("Recurring expense deleted");
      setDeleteId(null);
      await refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to delete"),
  });

  const toggleActiveMutation = trpc.expenses.toggleRecurringExpenseActive.useMutation({
    onSuccess: async () => {
      toast.success("Status updated");
      await refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to update status"),
  });

  const triggerMutation = trpc.expenses.triggerRecurringExpenseGeneration.useMutation({
    onSuccess: (result) => {
      toast.success(`Expense ${result.expenseNumber} generated`);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Failed to generate expense"),
  });

  // Helpers
  const resetForm = () => {
    setFormData({
      category: "",
      vendor: "",
      amount: "",
      description: "",
      paymentMethod: "",
      frequency: "monthly",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      dayOfMonth: "1",
      reminderDaysBefore: "3",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountCents = Math.round(parseFloat(formData.amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        amount: amountCents,
        frequency: formData.frequency,
        endDate: formData.endDate ? formData.endDate + "T00:00:00Z" : undefined,
        reminderDaysBefore: parseInt(formData.reminderDaysBefore) || 3,
      });
    } else {
      createMutation.mutate({
        category: formData.category,
        vendor: formData.vendor || undefined,
        amount: amountCents,
        description: formData.description || undefined,
        paymentMethod: formData.paymentMethod as any || undefined,
        frequency: formData.frequency,
        startDate: formData.startDate + "T00:00:00Z",
        endDate: formData.endDate ? formData.endDate + "T00:00:00Z" : undefined,
        dayOfMonth: parseInt(formData.dayOfMonth) || 1,
        reminderDaysBefore: parseInt(formData.reminderDaysBefore) || 3,
      });
    }
  };

  const handleEdit = (rec: RecurringExpense) => {
    setFormData({
      category: rec.category,
      vendor: rec.vendor || "",
      amount: (rec.amount / 100).toString(),
      description: rec.description || "",
      paymentMethod: rec.paymentMethod || "",
      frequency: rec.frequency,
      startDate: rec.startDate?.split("T")[0] || rec.startDate?.split(" ")[0] || "",
      endDate: rec.endDate ? (rec.endDate.split("T")[0] || rec.endDate.split(" ")[0]) : "",
      dayOfMonth: String(rec.dayOfMonth ?? 1),
      reminderDaysBefore: String(rec.reminderDaysBefore ?? 3),
    });
    setEditingId(rec.id);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  // Filtered + searched data
  const filteredList = useMemo(() => {
    if (!recurringList) return [];
    return (recurringList as RecurringExpense[]).filter((rec) => {
      if (statusFilter === "active" && !rec.isActive) return false;
      if (statusFilter === "inactive" && rec.isActive) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          rec.category.toLowerCase().includes(term) ||
          (rec.vendor || "").toLowerCase().includes(term) ||
          (rec.description || "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [recurringList, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    if (!recurringList) return { total: 0, active: 0, inactive: 0, monthlyTotal: 0 };
    const list = recurringList as RecurringExpense[];
    const activeList = list.filter((r) => r.isActive);
    // Estimate monthly total from active recurring expenses
    const monthlyTotal = activeList.reduce((sum, r) => {
      const multiplier: Record<string, number> = {
        weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 0.33, annually: 0.083,
      };
      return sum + r.amount * (multiplier[r.frequency] || 1);
    }, 0);
    return {
      total: list.length,
      active: activeList.length,
      inactive: list.length - activeList.length,
      monthlyTotal,
    };
  }, [recurringList]);

  const isDueSoon = (nextDueDate: string) => {
    const due = new Date(nextDueDate);
    const now = new Date();
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 3 && diffDays >= 0;
  };

  const isOverdue = (nextDueDate: string) => {
    return new Date(nextDueDate) < new Date();
  };

  return (
    <ModuleLayout
      title="Recurring Expenses"
      description="Manage automated recurring expense generation"
      icon={<RefreshCw className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Expenses", href: "/expenses" },
        { label: "Recurring" },
      ]}
    >
      <div className="space-y-6">
        {/* Header with Create button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by category, vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) { setEditingId(null); resetForm(); }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Recurring Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "Create"} Recurring Expense</DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Update the recurring expense settings"
                    : "Set up a new recurring expense that auto-generates expenses on schedule"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category */}
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendor */}
                {!editingId && (
                  <div className="space-y-2">
                    <Label>Vendor</Label>
                    <Input
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      placeholder="e.g., Safaricom, Kenya Power"
                    />
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount (KES) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g., 5000"
                  />
                </div>

                {/* Payment Method */}
                {!editingId && (
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Frequency */}
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v: any) => setFormData({ ...formData, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  {!editingId && (
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                  )}

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Day of Month */}
                  {!editingId && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Input
                        type="number"
                        min="1"
                        max="28"
                        value={formData.dayOfMonth}
                        onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Reminder Days */}
                  <div className="space-y-2">
                    <Label>Reminder (days before)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={formData.reminderDaysBefore}
                      onChange={(e) => setFormData({ ...formData, reminderDaysBefore: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                {!editingId && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Monthly internet bill"
                      rows={2}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingId ? "Update" : "Create")} Recurring Expense
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="Total" value={stats.total} color="border-l-purple-500" />
          <StatsCard label="Active" value={stats.active} color="border-l-green-500" />
          <StatsCard label="Inactive" value={stats.inactive} color="border-l-gray-500" />
          <StatsCard
            label="Est. Monthly"
            value={formatCurrency(stats.monthlyTotal)}
            color="border-l-blue-500"
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recurring Expense List</CardTitle>
            <CardDescription>
              {filteredList.length} recurring expense{filteredList.length !== 1 ? "s" : ""} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {recurringList?.length ? "No matching results." : "No recurring expenses yet. Create one to get started."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Last Generated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((rec: RecurringExpense) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">{rec.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rec.vendor || "—"}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(rec.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {rec.frequency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={
                            isOverdue(rec.nextDueDate) ? "text-red-600 font-semibold" :
                            isDueSoon(rec.nextDueDate) ? "text-orange-600 font-medium" : ""
                          }>
                            {formatDate(rec.nextDueDate)}
                            {isOverdue(rec.nextDueDate) && (
                              <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                            )}
                            {!isOverdue(rec.nextDueDate) && isDueSoon(rec.nextDueDate) && (
                              <Badge variant="secondary" className="ml-2 text-xs">Due Soon</Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {rec.lastGeneratedDate ? formatDate(rec.lastGeneratedDate) : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rec.isActive ? "default" : "secondary"}>
                            {rec.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(rec)} title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleActiveMutation.mutate({ id: rec.id, isActive: !rec.isActive })}
                              title={rec.isActive ? "Deactivate" : "Activate"}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => triggerMutation.mutate(rec.id)}
                              disabled={triggerMutation.isPending}
                              title="Generate expense now"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteId(rec.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this recurring expense rule. Previously generated expenses will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModuleLayout>
  );
}

export default RecurringExpenses;
