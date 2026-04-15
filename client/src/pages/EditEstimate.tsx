import { ModuleLayout } from "@/components/ModuleLayout";
import DocumentForm from "@/components/forms/DocumentForm";
import { Edit } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

export default function EditEstimate() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const estimateId = params.id || "";

  // Fetch estimate data from backend
  const { data: estimateData, isLoading } = trpc.estimates.getWithItems.useQuery(estimateId, {
    enabled: !!estimateId,
  });
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const updateEstimateMutation = trpc.estimates.update.useMutation({
    onSuccess: () => {
      toast.success("Estimate updated successfully");
      utils.estimates.list.invalidate();
      utils.estimates.getById.invalidate(estimateId);
      setLocation("/estimates");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update estimate");
    },
  });

  const deleteEstimateMutation = trpc.estimates.delete.useMutation({
    onSuccess: () => {
      toast.success("Estimate deleted successfully");
      utils.estimates.list.invalidate();
      setLocation("/estimates");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete estimate");
    },
  });

  // Get client info
  const client = estimateData ? (clientsData as any[]).find((c: any) => c.id === (estimateData as any).clientId) : null;

  // Transform backend data to form format
  const formData = useMemo(() => estimateData ? {
    id: estimateId,
    documentNumber: (estimateData as any).estimateNumber || `EST-${estimateId.slice(0, 8)}`,
    clientId: (estimateData as any).clientId || "",
    clientName: client?.companyName || "",
    clientEmail: client?.email || "",
    clientAddress: client?.address || "",
    date: (estimateData as any).issueDate ? new Date((estimateData as any).issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: (estimateData as any).expiryDate ? new Date((estimateData as any).expiryDate).toISOString().split('T')[0] : "",
    lineItems: ((estimateData as any).lineItems || (estimateData as any).items || []).map((item: any, index: number) => ({
      id: item.id || `${index}`,
      sno: index + 1,
      description: item.description || "",
      uom: "Pcs",
      qty: item.quantity || 1,
      unitPrice: (item.rate || item.unitPrice || 0) / 100,
      tax: item.taxRate || 0,
      total: (item.amount || item.total || 0) / 100
    })) || [
      { id: "1", sno: 1, description: "", uom: "Pcs", qty: 1, unitPrice: 0, tax: 0, total: 0 }
    ],
    notes: (estimateData as any).notes || "",
    subtotal: ((estimateData as any).subtotal || 0) / 100,
    vat: ((estimateData as any).taxAmount || 0) / 100,
    grandTotal: ((estimateData as any).total || 0) / 100,
    applyVAT: ((estimateData as any).taxAmount || 0) > 0,
    vatPercentage: ((estimateData as any).taxAmount || 0) > 0 && ((estimateData as any).subtotal || 0) > 0 
      ? Math.round(((estimateData as any).taxAmount / (estimateData as any).subtotal) * 100) 
      : 16,
    status: (estimateData as any).status || "draft",
  } : null, [estimateData, estimateId, client]);

  const handleSave = useCallback((data: any) => {
    const subtotal = data.subtotal || 0;
    const taxAmount = data.vat || 0;
    const total = data.grandTotal || (subtotal + taxAmount);

    updateEstimateMutation.mutate({
      id: estimateId,
      estimateNumber: data.documentNumber,
      clientId: data.clientId || undefined,
      title: data.clientName ? `Quotation for ${data.clientName}` : undefined,
      issueDate: data.date ? new Date(data.date) : undefined,
      expiryDate: data.dueDate ? new Date(data.dueDate) : undefined,
      subtotal: Math.round(subtotal * 100),
      taxAmount: Math.round(taxAmount * 100),
      discountAmount: 0,
      total: Math.round(total * 100),
      status: (data.status || "draft") as "draft" | "sent" | "accepted" | "rejected" | "expired",
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
  }, [estimateId]);

  const handleSend = useCallback((data: any) => {
    if (!data.clientEmail) {
      toast.error("Client email is required to send estimate");
      return;
    }

    const subtotal = data.subtotal || 0;
    const taxAmount = data.vat || 0;
    const total = data.grandTotal || (subtotal + taxAmount);

    updateEstimateMutation.mutate({
      id: estimateId,
      estimateNumber: data.documentNumber,
      clientId: data.clientId || undefined,
      title: data.clientName ? `Quotation for ${data.clientName}` : undefined,
      issueDate: data.date ? new Date(data.date) : undefined,
      expiryDate: data.dueDate ? new Date(data.dueDate) : undefined,
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
    toast.info(`Estimate will be sent to ${data.clientEmail}`);
  }, [estimateId]);

  const handleDelete = useCallback(() => {
    if (confirm("Are you sure you want to delete this estimate? This action cannot be undone.")) {
      deleteEstimateMutation.mutate(estimateId);
    }
  }, [estimateId]);

  if (!estimateId) {
    return (
      <ModuleLayout
        title="Edit Estimate"
        icon={<Edit className="w-5 h-5" />}
        backLink={{ label: "Estimates", href: "/estimates" }}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Estimates", href: "/estimates" },
          { label: "Edit" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Invalid estimate ID</p>
          <button onClick={() => setLocation("/estimates")} className="text-blue-500 hover:underline">
            Back to Estimates
          </button>
        </div>
      </ModuleLayout>
    );
  }

  if (!isLoading && !formData) {
    return (
      <ModuleLayout
        title="Edit Estimate"
        icon={<Edit className="w-5 h-5" />}
        backLink={{ label: "Estimates", href: "/estimates" }}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Estimates", href: "/estimates" },
          { label: "Edit" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Estimate not found</p>
          <button onClick={() => setLocation("/estimates")} className="text-blue-500 hover:underline">
            Back to Estimates
          </button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Estimate"
      description="Modify estimate details"
      icon={<Edit className="w-5 h-5" />}
      backLink={{ label: "Estimates", href: "/estimates" }}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Estimates", href: "/estimates" },
        { label: "Edit" },
      ]}
    >
      <DocumentForm 
        type="estimate"
        mode="edit"
        initialData={formData}
        onSave={handleSave}
        onSend={handleSend}
        onDelete={handleDelete}
        isLoading={isLoading}
        isSaving={updateEstimateMutation.isPending || deleteEstimateMutation.isPending}
      />
    </ModuleLayout>
  );
}
