import { ModuleLayout } from "@/components/ModuleLayout";
import DocumentForm from "@/components/forms/DocumentForm";
import { Edit } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export default function EditReceipt() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("accounting:receipts:edit");
  const [, setLocation] = useLocation();
  const params = useParams();
  const receiptId = params.id || "";

  // Fetch receipt data from backend
  const { data: receiptData, isLoading: isLoadingReceiptData } = trpc.receipts.getWithItems.useQuery(receiptId, {
    enabled: !!receiptId,
  });
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const updateReceiptMutation = trpc.receipts.update.useMutation({
    onSuccess: () => {
      toast.success("Receipt updated successfully");
      utils.receipts.list.invalidate();
      utils.receipts.getById.invalidate(receiptId);
      setLocation("/receipts");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update receipt");
    },
  });

  const deleteReceiptMutation = trpc.receipts.delete.useMutation({
    onSuccess: () => {
      toast.success("Receipt deleted successfully");
      utils.receipts.list.invalidate();
      setLocation("/receipts");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete receipt");
    },
  });

  // Get client info
  const client = receiptData ? (clientsData as any[]).find((c: any) => c.id === (receiptData as any).clientId) : null;

  // Transform backend data to form format
  const formData = receiptData ? {
    id: receiptId,
    documentNumber: (receiptData as any).receiptNumber || `RCP-${receiptId.slice(0, 8)}`,
    clientId: (receiptData as any).clientId || "",
    clientName: client?.companyName || "",
    clientEmail: client?.email || "",
    clientAddress: client?.address || "",
    date: (receiptData as any).receiptDate ? new Date((receiptData as any).receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    paymentMethod: (receiptData as any).paymentMethod || "cash",
    lineItems: ((receiptData as any).lineItems || (receiptData as any).items || []).map((item: any, index: number) => ({
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
    notes: (receiptData as any).notes || "",
    subtotal: ((receiptData as any).amount || 0) / 100,
    vat: 0,
    grandTotal: ((receiptData as any).amount || 0) / 100,
    applyVAT: false,
    vatPercentage: 16,
  } : null;

  const handleSave = useCallback((data: any) => {
    const amount = data.grandTotal || 0;

    updateReceiptMutation.mutate({
      id: receiptId,
      receiptNumber: data.documentNumber,
      clientId: data.clientId || undefined,
      amount: Math.round(amount * 100),
      paymentMethod: (data.paymentMethod || "cash") as "cash" | "bank_transfer" | "cheque" | "mpesa" | "card" | "other",
      receiptDate: data.date ? new Date(data.date) : undefined,
      notes: data.notes || "",
      lineItems: data.lineItems?.map((item: any) => ({
        description: item.description,
        quantity: item.qty,
        unitPrice: Math.round(item.unitPrice * 100),
        taxRate: item.tax,
        total: Math.round(item.total * 100),
      })),
    });
  }, [receiptId, updateReceiptMutation]);

  const handleSend = useCallback((data: any) => {
    if (!data.clientEmail) {
      toast.error("Client email is required to send receipt");
      return;
    }

    const amount = data.grandTotal || 0;

    updateReceiptMutation.mutate({
      id: receiptId,
      receiptNumber: data.documentNumber,
      clientId: data.clientId || undefined,
      amount: Math.round(amount * 100),
      paymentMethod: (data.paymentMethod || "cash") as "cash" | "bank_transfer" | "cheque" | "mpesa" | "card" | "other",
      receiptDate: data.date ? new Date(data.date) : undefined,
      notes: data.notes || "",
      lineItems: data.lineItems?.map((item: any) => ({
        description: item.description,
        quantity: item.qty,
        unitPrice: Math.round(item.unitPrice * 100),
        taxRate: item.tax,
        total: Math.round(item.total * 100),
      })),
    });
    toast.info(`Receipt will be sent to ${data.clientEmail}`);
  }, [receiptId, updateReceiptMutation]);

  const handleDelete = useCallback(() => {
    if (confirm("Are you sure you want to delete this receipt? This action cannot be undone.")) {
      deleteReceiptMutation.mutate(receiptId);
    }
  }, [receiptId, deleteReceiptMutation]);

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

  if (!receiptId) {
    return (
      <ModuleLayout
        title="Edit Receipt"
        icon={<Edit className="w-5 h-5" />}
        backLink={{ label: "Receipts", href: "/receipts" }}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Receipts", href: "/receipts" },
          { label: "Edit" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Invalid receipt ID</p>
          <button onClick={() => setLocation("/receipts")} className="text-blue-500 hover:underline">
            Back to Receipts
          </button>
        </div>
      </ModuleLayout>
    );
  }

  if (!isLoadingReceiptData && !formData) {
    return (
      <ModuleLayout
        title="Edit Receipt"
        icon={<Edit className="w-5 h-5" />}
        backLink={{ label: "Receipts", href: "/receipts" }}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Receipts", href: "/receipts" },
          { label: "Edit" },
        ]}
      >
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Receipt not found</p>
          <button onClick={() => setLocation("/receipts")} className="text-blue-500 hover:underline">
            Back to Receipts
          </button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Receipt"
      description="Modify receipt details"
      icon={<Edit className="w-5 h-5" />}
      backLink={{ label: "Receipts", href: "/receipts" }}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Receipts", href: "/receipts" },
        { label: "Edit" },
      ]}
    >
      <DocumentForm 
        type="receipt"
        mode="edit"
        initialData={formData}
        onSave={handleSave}
        onSend={handleSend}
        onDelete={handleDelete}
        isLoading={isLoading}
        isSaving={updateReceiptMutation.isPending || deleteReceiptMutation.isPending}
      />
    </ModuleLayout>
  );
}
