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
import { Plus, Trash2, Edit2, Play, Clock } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { toast } from "sonner";
import { StatsCard } from "@/components/ui/stats-card";

type RecurringInvoice = {
  id: string;
  clientId: string;
  templateInvoiceId: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
  lastGeneratedDate: string | null;
  isActive: number;
  description: string | null;
  noteToInvoice: string | null;
  createdAt: string;
  updatedAt: string;
};

export function RecurringInvoices() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    templateInvoiceId: "",
    frequency: "monthly" as const,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    description: "",
    noteToInvoice: "",
  });

  // Fetch data
  const { data: recurringList, refetch: refetchRecurring } = trpc.recurringInvoices.list.useQuery({
    activeOnly: false,
  });
  const { data: clients } = trpc.clients.list.useQuery(undefined);
  const { data: invoices } = trpc.invoices.list.useQuery({ limit: 500 });

  // Mutations
  const createMutation = trpc.recurringInvoices.create.useMutation({
    onSuccess: async () => {
      toast.success("Recurring invoice created");
      setIsOpen(false);
      resetForm();
      await refetchRecurring();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create recurring invoice");
    },
  });

  const updateMutation = trpc.recurringInvoices.update.useMutation({
    onSuccess: async () => {
      toast.success("Recurring invoice updated");
      setIsOpen(false);
      setEditingId(null);
      resetForm();
      await refetchRecurring();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update recurring invoice");
    },
  });

  const deleteMutation = trpc.recurringInvoices.delete.useMutation({
    onSuccess: async () => {
      toast.success("Recurring invoice deleted");
      setDeleteId(null);
      await refetchRecurring();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete recurring invoice");
    },
  });

  const toggleActiveMutation = trpc.recurringInvoices.toggleActive.useMutation({
    onSuccess: async () => {
      toast.success("Status updated");
      await refetchRecurring();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const triggerMutation = trpc.recurringInvoices.triggerGeneration.useMutation({
    onSuccess: (result) => {
      toast.success(`Invoice ${result.invoiceNumber} generated`);
      refetchRecurring();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate invoice");
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      clientId: "",
      templateInvoiceId: "",
      frequency: "monthly" as const,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      description: "",
      noteToInvoice: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.templateInvoiceId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        frequency: formData.frequency,
        endDate: formData.endDate ? formData.endDate + "T00:00:00Z" : undefined,
        description: formData.description || undefined,
        noteToInvoice: formData.noteToInvoice || undefined,
      });
    } else {
      createMutation.mutate({
        clientId: formData.clientId,
        templateInvoiceId: formData.templateInvoiceId,
        frequency: formData.frequency,
        startDate: formData.startDate + "T00:00:00Z",
        endDate: formData.endDate ? formData.endDate + "T00:00:00Z" : undefined,
        description: formData.description || undefined,
        noteToInvoice: formData.noteToInvoice || undefined,
      });
    }
  };

  const handleEdit = (recurring: RecurringInvoice) => {
    setFormData({
      clientId: recurring.clientId,
      templateInvoiceId: recurring.templateInvoiceId,
      frequency: recurring.frequency,
      startDate: recurring.startDate.split("T")[0],
      endDate: recurring.endDate ? recurring.endDate.split("T")[0] : "",
      description: recurring.description || "",
      noteToInvoice: recurring.noteToInvoice || "",
    });
    setEditingId(recurring.id);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getClientName = (clientId: string) => {
    return clients?.find((c) => c.id === clientId)?.companyName || clientId;
  };

  const getInvoiceNumber = (invoiceId: string) => {
    return invoices?.find((i) => i.id === invoiceId)?.invoiceNumber || invoiceId;
  };

  const stats = useMemo(() => {
    if (!recurringList) return { total: 0, active: 0, inactive: 0 };
    return {
      total: recurringList.length,
      active: recurringList.filter((r: any) => r.isActive).length,
      inactive: recurringList.filter((r: any) => !r.isActive).length,
    };
  }, [recurringList]);

  return (
    <ModuleLayout
      title="Recurring Invoices"
      description="Manage automated invoice generation"
      icon={<Clock className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Invoices", href: "/invoices" },
        { label: "Recurring" },
      ]}
    >
      <div className="space-y-6">
      {/* Create/Edit Dialog */}
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingId(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Recurring Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Recurring Invoice</DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the recurring invoice settings"
                  : "Set up a new recurring invoice template"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, clientId: value })
                  }
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(clients) && clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Invoice Selection */}
              <div className="space-y-2">
                <Label htmlFor="template">Template Invoice *</Label>
                <Select
                  value={formData.templateInvoiceId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, templateInvoiceId: value })
                  }
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice template" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices
                      ?.filter(
                        (inv) =>
                          !editingId ||
                          inv.clientId === formData.clientId
                      )
                      .map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - Ksh{" "}
                          {(invoice.total / 100).toLocaleString()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, frequency: value })
                  }
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

              {/* Start Date */}
              {!editingId && (
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                  />
                </div>
              )}

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  placeholder="Leave empty for indefinite"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Monthly consulting fee"
                />
              </div>

              {/* Note to Invoice */}
              <div className="space-y-2">
                <Label htmlFor="noteToInvoice">Note to Invoice</Label>
                <Textarea
                  value={formData.noteToInvoice}
                  onChange={(e) =>
                    setFormData({ ...formData, noteToInvoice: e.target.value })
                  }
                  placeholder="Additional note to include in generated invoices"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "Update" : "Create"} Recurring Invoice
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard label="Total" value={stats.total} color="border-l-purple-500" />
        <StatsCard label="Active" value={stats.active} color="border-l-green-500" />
        <StatsCard label="Inactive" value={stats.inactive} color="border-l-blue-500" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Invoice List</CardTitle>
          <CardDescription>
            {Array.isArray(recurringList) ? recurringList.length : 0} recurring invoices configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!Array.isArray(recurringList) || recurringList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recurring invoices yet. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(recurringList) && recurringList.map((recurring: any) => (
                    <TableRow key={recurring.id}>
                      <TableCell className="font-medium">
                        {getClientName(recurring.clientId)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getInvoiceNumber(recurring.templateInvoiceId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {recurring.frequency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(recurring.nextDueDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {recurring.lastGeneratedDate
                          ? formatDate(recurring.lastGeneratedDate)
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={recurring.isActive ? "default" : "secondary"}
                        >
                          {recurring.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(recurring)}
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              toggleActiveMutation.mutate({
                                id: recurring.id,
                                isActive: !recurring.isActive,
                              })
                            }
                            title={recurring.isActive ? "Deactivate" : "Activate"}
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              triggerMutation.mutate(recurring.id)
                            }
                            disabled={triggerMutation.isPending}
                            title="Generate invoice now"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(recurring.id)}
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
            <AlertDialogTitle>Delete Recurring Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-red-600"
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

export default RecurringInvoices;
