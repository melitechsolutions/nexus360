import { ModuleLayout } from "@/components/ModuleLayout";
import DocumentForm from "@/components/forms/DocumentForm";
import { Edit } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

export default function EditInvoice() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("accounting:invoices:edit");
  const [, setLocation] = useLocation();
  const params = useParams();
  const invoiceId = params.id || "";

  // Fetch invoice data from backend with line items
  const { data: invoiceData, isLoading: isLoadingInvoiceData } = trpc.invoices.getWithItems.useQuery(invoiceId);
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const updateInvoiceMutation = trpc.invoices.update.useMutation({
    onSuccess: () => {
      toast.success("Invoice updated successfully");
      utils.invoices.list.invalidate();
      utils.invoices.getById.invalidate(invoiceId);
      setLocation("/invoices");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update invoice");
    },
  });

  const deleteInvoiceMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted successfully");
      utils.invoices.list.invalidate();
      setLocation("/invoices");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  // Get client info
  const client = invoiceData ? (clientsData as any[]).find((c: any) => c.id === (invoiceData as any).clientId) : null;

  // Transform backend data to form format
  const formData = useMemo(() => invoiceData ? {
    id: invoiceId,
    documentNumber: (invoiceData as any).invoiceNumber || `INV-${invoiceId.slice(0, 8)}`,
    clientId: (invoiceData as any).clientId || "",
    clientName: client?.companyName || "",
    clientEmail: client?.email || "",
    clientAddress: client?.address || "",
    date: (invoiceData as any).issueDate ? new Date((invoiceData as any).issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: (invoiceData as any).dueDate ? new Date((invoiceData as any).dueDate).toISOString().split('T')[0] : "",
    lineItems: ((invoiceData as any).lineItems || (invoiceData as any).items || []).map((item: any, index: number) => ({
      id: item.id || `${index}`,
      sno: index + 1,
      description: item.description || "",
      uom: "Pcs",
      qty: item.quantity || 1,
      unitPrice: (item.unitPrice || 0) / 100,
      tax: item.taxRate || 0,
      total: (item.total || 0) / 100
    })) || [
      { id: "1", sno: 1, description: "", uom: "Pcs", qty: 1, unitPrice: 0, tax: 0, total: 0 }
    ],
    notes: (invoiceData as any).notes || "",
    subtotal: ((invoiceData as any).subtotal || 0) / 100,
    vat: ((invoiceData as any).taxAmount || (invoiceData as any).tax || 0) / 100,
    grandTotal: ((invoiceData as any).total || 0) / 100,
    applyVAT: ((invoiceData as any).taxAmount || 0) > 0,
    vatPercentage: ((invoiceData as any).taxAmount || 0) > 0 && ((invoiceData as any).subtotal || 0) > 0 
      ? Math.round(((invoiceData as any).taxAmount / (invoiceData as any).subtotal) * 100) 
      : 16,
    status: (invoiceData as any).status || "draft",
  } : null, [invoiceData, invoiceId, client]);

  const handleSave = useCallback((data: any) => {
    const subtotal = data.subtotal || 0;
    const taxAmount = data.vat || 0;
    const total = data.grandTotal || (subtotal + taxAmount);

    updateInvoiceMutation.mutate({
      id: invoiceId,
      invoiceNumber: data.documentNumber,
      clientId: data.clientId || undefined,
      title: data.clientName ? `Invoice for ${data.clientName}` : undefined,
      issueDate: data.date ? new Date(data.date) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      subtotal: Math.round(subtotal * 100),
      taxAmount: Math.round(taxAmount * 100),
      discountAmount: 0,
      total: Math.round(total * 100),
      status: (data.status || "draft") as "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled",
      notes: data.notes || "",
      terms: "",
      lineItems: data.lineItems?.map((item: any) => ({
        itemType: 'custom',
        description: item.description,
        quantity: item.qty,
        unitPrice: Math.round(item.unitPrice * 100),
        taxRate: item.tax,
        discountPercent: 0,
        total: Math.round(item.total * 100),
      })),
    });
  }, [invoiceId]);

  const handleSend = useCallback((data: any) => {
    if (!data.clientEmail) {
      toast.error("Client email is required to send invoice");
      return;
    }

    const subtotal = data.subtotal || 0;
    const taxAmount = data.vat || 0;
    const total = data.grandTotal || (subtotal + taxAmount);

    updateInvoiceMutation.mutate({
      id: invoiceId,
      invoiceNumber: data.documentNumber,
      clientId: data.clientId || undefined,
      title: data.clientName ? `Invoice for ${data.clientName}` : undefined,
      issueDate: data.date ? new Date(data.date) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      subtotal: Math.round(subtotal * 100),
      taxAmount: Math.round(taxAmount * 100),
      discountAmount: 0,
      total: Math.round(total * 100),
      status: "sent" as const,
      notes: data.notes || "",
      terms: "",
      lineItems: data.lineItems?.map((item: any) => ({
        itemType: 'custom',
        description: item.description,
        quantity: item.qty,
        unitPrice: Math.round(item.unitPrice * 100),
        taxRate: item.tax,
        discountPercent: 0,
        total: Math.round(item.total * 100),
      })),
    });
    toast.info(`Invoice will be sent to ${data.clientEmail}`);
  }, [invoiceId]);

  const handleDelete = useCallback(() => {
    if (confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      deleteInvoiceMutation.mutate(invoiceId);
    }
  }, [invoiceId]);

  // NOW SAFE TO CHECK CONDITIONAL RETURNS (ALL HOOKS ALREADY CALLED)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  if (!invoiceId) {
    return (
      <ModuleLayout
        title="Edit Invoice"
        icon={<Edit className="w-5 h-5" />}
        backLink={{ label: "Invoices", href: "/invoices" }}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Invoices", href: "/invoices" },
          { label: "Edit" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Invalid invoice ID</p>
          <button onClick={() => setLocation("/invoices")} className="text-blue-500 hover:underline">
            Back to Invoices
          </button>
        </div>
      </ModuleLayout>
    );
  }

  if (!isLoadingInvoiceData && !formData) {
    return (
      <ModuleLayout
        title="Edit Invoice"
        icon={<Edit className="w-5 h-5" />}
        backLink={{ label: "Invoices", href: "/invoices" }}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Invoices", href: "/invoices" },
          { label: "Edit" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Invoice not found</p>
          <button onClick={() => setLocation("/invoices")} className="text-blue-500 hover:underline">
            Back to Invoices
          </button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Invoice"
      description="Modify invoice details"
      icon={<Edit className="w-5 h-5" />}
      backLink={{ label: "Invoices", href: "/invoices" }}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Invoices", href: "/invoices" },
        { label: "Edit" },
      ]}
    >
      <DocumentForm 
        type="invoice"
        mode="edit"
        initialData={formData}
        onSave={handleSave}
        onSend={handleSend}
        onDelete={handleDelete}
        isLoading={isLoadingInvoiceData}
        isSaving={updateInvoiceMutation.isPending || deleteInvoiceMutation.isPending}
      />
    </ModuleLayout>
  );
}
