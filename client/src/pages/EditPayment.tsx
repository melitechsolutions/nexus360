import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DollarSign, ArrowLeft, Loader2, Trash2, Download, Save } from "lucide-react";
import { APP_TITLE } from "@/const";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

export default function EditPayment() {
  const { allowed, isLoading } = useRequireFeature("accounting:payments:edit");
  const companyInfo = useCompanyInfo();
  
  const params = useParams<{ id: string }>();
  const paymentId = params.id;
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [formData, setFormData] = useState({
    invoiceId: "",
    clientId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    referenceNumber: "",
    notes: "",
    status: "pending",
  });
  const [isLoadingPaymentData, setIsLoadingPaymentData] = useState(true);

  // Fetch payment data
  const { data: payment } = trpc.payments.getById.useQuery(paymentId || "", {
    enabled: !!paymentId,
  });

  // Fetch related data
  const { data: invoices = [] } = trpc.invoices.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();

  // Update form when payment data loads
  useEffect(() => {
    if (payment) {
      setFormData({
        invoiceId: payment.invoiceId || "",
        clientId: payment.clientId || "",
        amount: (payment.amount / 100).toString(),
        paymentDate: payment.paymentDate
          ? new Date(payment.paymentDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        paymentMethod: payment.paymentMethod || "cash",
        referenceNumber: payment.referenceNumber || "",
        notes: payment.notes || "",
        status: (payment as any).status || "pending",
      });
      setIsLoadingPaymentData(false);
    }
  }, [payment]);

  const updatePaymentMutation = trpc.payments.update.useMutation({
    onSuccess: () => {
      toast.success("Payment updated successfully!");
      utils.payments.list.invalidate();
      utils.payments.getById.invalidate(paymentId || "");
      navigate("/payments");
    },
    onError: (error: any) => {
      toast.error(`Failed to update payment: ${error.message}`);
    },
  });

  const deletePaymentMutation = trpc.payments.delete.useMutation({
    onSuccess: () => {
      toast.success("Payment deleted successfully!");
      utils.payments.list.invalidate();
      navigate("/payments");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete payment: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    updatePaymentMutation.mutate({
      id: paymentId || "",
      amount: Math.round(parseFloat(formData.amount) * 100),
      paymentDate: new Date(formData.paymentDate).toISOString().split("T")[0],
      paymentMethod: formData.paymentMethod as any,
      referenceNumber: formData.referenceNumber || undefined,
      notes: formData.notes || undefined,
      status: formData.status as any,
    } as any);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this payment? This action cannot be undone.")) {
      deletePaymentMutation.mutate(paymentId || "");
    }
  };

  const handleDownloadPDF = useCallback(async () => {
    setIsGeneratingPDF(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow popups to download PDF");
        setIsGeneratingPDF(false);
        return;
      }

      const selectedClient = (clients as any[]).find((c: any) => c.id === formData.clientId);
      const selectedInvoice = (invoices as any[]).find((i: any) => i.id === formData.invoiceId);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt - ${formData.referenceNumber || paymentId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company-info { text-align: right; font-size: 12px; }
            .document-title { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .info-section { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #6b7280; }
            .value { }
            .amount { font-size: 24px; font-weight: bold; color: #2563eb; text-align: center; padding: 20px; background: #eff6ff; border-radius: 8px; margin: 20px 0; }
            .notes { margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="document-title">PAYMENT RECEIPT</div>
              <div><strong>${formData.referenceNumber || paymentId}</strong></div>
            </div>
            <div class="company-info">
              <strong>${APP_TITLE}</strong><br>
              ${companyInfo.address ? companyInfo.address + '<br>' : ''}
              ${companyInfo.email ? companyInfo.email + '<br>' : ''}
              ${companyInfo.phone || ''}
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="label">Client:</span>
              <span class="value">${selectedClient?.companyName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Invoice:</span>
              <span class="value">${selectedInvoice?.invoiceNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Payment Date:</span>
              <span class="value">${formData.paymentDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Payment Method:</span>
              <span class="value">${formData.paymentMethod.replace('_', ' ').toUpperCase()}</span>
            </div>
            ${formData.referenceNumber ? `
            <div class="info-row">
              <span class="label">Reference Number:</span>
              <span class="value">${formData.referenceNumber}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="amount">
            Amount Paid: KES ${parseFloat(formData.amount || '0').toLocaleString()}
          </div>
          
          ${formData.notes ? `
            <div class="notes">
              <strong>Notes:</strong><br>
              ${formData.notes}
            </div>
          ` : ''}
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      toast.success("PDF download initiated");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [formData, clients, invoices, paymentId]);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  if (!allowed) return null;

  if (isLoadingPaymentData) {
    return (
      <ModuleLayout
        title="Edit Payment"
        description="Update payment details"
        icon={<DollarSign className="w-6 h-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/crm-home" },
          { label: "Accounting", href: "/accounting" },
          { label: "Payments", href: "/payments" },
          { label: "Edit Payment" },
        ]}
      >
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Edit Payment"
      description="Update payment details"
      icon={<DollarSign className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Payments", href: "/payments" },
        { label: "Edit Payment" },
      ]}
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Payment</CardTitle>
            <CardDescription>
              Update the payment details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client *</Label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clientId: value })
                    }
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(clients) && clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.companyName || client.contactPerson}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceId">Invoice *</Label>
                  <Select
                    value={formData.invoiceId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, invoiceId: value })
                    }
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(invoices) && invoices.map((invoice: any) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (Ksh) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    placeholder="e.g., TXN123456"
                    value={formData.referenceNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        referenceNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this payment"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-between">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deletePaymentMutation.isPending}
                  >
                    {deletePaymentMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/payments")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={updatePaymentMutation.isPending}
                  >
                    {updatePaymentMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Payment
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
