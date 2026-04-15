import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Download, Send, DollarSign } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import mutateAsync from '@/lib/mutationHelpers';
import { format } from "date-fns";
import { generateReceiptPDF } from "@/lib/pdfGenerator";

export default function PaymentDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch payment from backend
  const { data: paymentData, isLoading } = trpc.payments.getById.useQuery(id || "");
  const { data: clientsData = [] } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const deletePaymentMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("Payment deleted successfully");
      utils.payments.list.invalidate();
      navigate("/payments");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete payment");
    },
  });

  // Get client info
  const client = paymentData && Array.isArray(clientsData) ? clientsData.find((c: any) => c.id === (paymentData as any).clientId) : null;

  const payment = paymentData ? {
    id: paymentData.id || id || "1",
    referenceNumber: (paymentData as any).receiptNumber || `PAY-${id?.slice(0, 8)}`,
    client: client?.companyName || "Unknown Client",
    amount: ((paymentData as any).amount || 0) / 100,
    status: (paymentData as any).status || "pending",
    paymentMethod: (paymentData as any).paymentMethod || "cash",
    date: (paymentData as any).date ? format(new Date((paymentData as any).date), "yyyy-MM-dd") : new Date().toISOString().split('T')[0],
    reference: (paymentData as any).reference || "",
    notes: (paymentData as any).notes || "",
  } : null;

  const handleEdit = () => {
    navigate(`/payments/${id}/edit`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await mutateAsync(deletePaymentMutation, id || "");
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout title="Payment Details" icon={<DollarSign className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Payments", href: "/payments"}, {label: "Details"}]} backLink={{label: "Payments", href: "/payments"}}>
        <div className="flex items-center justify-center h-64">
          <p>Loading payment...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (!payment) {
    return (
      <ModuleLayout title="Payment Details" icon={<DollarSign className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Payments", href: "/payments"}, {label: "Details"}]} backLink={{label: "Payments", href: "/payments"}}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Payment not found</p>
          <Button onClick={() => navigate("/payments")}>Back to Payments</Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title="Payment Details" icon={<DollarSign className="h-5 w-5" />} breadcrumbs={[{label: "Dashboard", href: "/"}, {label: "Payments", href: "/payments"}, {label: "Details"}]} backLink={{label: "Payments", href: "/payments"}}>
      <div className="space-y-6">
        <div className="flex gap-2">
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button variant="outline" onClick={() => {
            const doc = generateReceiptPDF({
              receiptNumber: payment.referenceNumber,
              date: payment.date,
              client: {
                name: payment.client,
                email: client?.email || "",
              },
              amount: payment.amount,
              paymentMethod: payment.paymentMethod.replace("_", " ").toUpperCase(),
              notes: payment.notes || undefined,
            });
            doc.save(`Receipt-${payment.referenceNumber}.pdf`);
            toast.success("PDF downloaded");
          }}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const subject = encodeURIComponent(`Payment Receipt ${payment.referenceNumber}`);
              const body = encodeURIComponent(`Receipt for ${payment.client}\nAmount: Ksh ${payment.amount.toLocaleString()}\nDate: ${payment.date}`);
              window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>View payment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Reference</label>
                <p className="text-muted-foreground">{payment?.referenceNumber || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Badge variant={payment?.status === "completed" ? "default" : payment?.status === "pending" ? "secondary" : "destructive"}>
                  {(payment?.status || "pending").charAt(0).toUpperCase() + (payment?.status || "pending").slice(1)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <p className="text-muted-foreground">Ksh {(payment?.amount || 0).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Method</label>
                <p className="text-muted-foreground">{(payment?.paymentMethod || "N/A").replace("_", " ").toUpperCase()}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <p className="text-muted-foreground">{payment?.date ? new Date(payment.date).toLocaleDateString() : "N/A"}</p>
              </div>
              {payment.reference && (
                <div>
                  <label className="text-sm font-medium">Transaction Reference</label>
                  <p className="text-muted-foreground">{payment.reference}</p>
                </div>
              )}
              {payment.notes && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Notes</label>
                  <p className="text-muted-foreground">{payment.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This action cannot be undone."
      />
    </ModuleLayout>
  );
}
