import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DollarSign, Printer, Loader2, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { APP_TITLE } from "@/const";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";

export default function CreatePayment() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("accounting:payments:create");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    paymentNumber: "",
    invoiceId: "",
    clientId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    referenceNumber: "",
    notes: "",
    status: "pending",
  });

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [isLoadingNumber, setIsLoadingNumber] = useState(true);
  const getNextNumberMutation = trpc.settings.getNextDocumentNumber.useMutation();

  // Generate payment number on component mount
  useEffect(() => {
    let isMounted = true;
    const generateNumber = () => {
      setIsLoadingNumber(true);
      getNextNumberMutation.mutate(
        { documentType: 'payment' },
        {
          onSuccess: (result) => {
            if (isMounted) setFormData(prev => ({ ...prev, paymentNumber: result.documentNumber || `PAY-${String(Math.random() * 1000000 | 0).padStart(6, '0')}` }));
          },
          onError: () => {
            if (isMounted) setFormData(prev => ({ ...prev, paymentNumber: `PAY-${String(Math.random() * 1000000 | 0).padStart(6, '0')}` }));
          },
          onSettled: () => {
            if (isMounted) setIsLoadingNumber(false);
          },
        }
      );
    };
    generateNumber();
    return () => { isMounted = false; };
  }, []);

  const { data: invoices = [] } = trpc.invoices.list.useQuery();
  const { data: clients = [] } = trpc.clients.list.useQuery();

  const createPaymentMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully!");
      utils.payments.list.invalidate();
      navigate("/payments");
    },
    onError: (error: any) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceId || !formData.clientId || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    createPaymentMutation.mutate({
      paymentNumber: formData.paymentNumber,
      invoiceId: formData.invoiceId,
      clientId: formData.clientId,
      amount: Math.round(parseFloat(formData.amount) * 100),
      paymentDate: new Date(formData.paymentDate).toISOString().split("T")[0],
      paymentMethod: formData.paymentMethod as any,
      referenceNumber: formData.referenceNumber || undefined,
      notes: formData.notes || undefined,
      status: formData.status as any,
    } as any);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const selectedClient = (clients as any[]).find((c: any) => c.id === formData.clientId);
    const selectedInvoice = (invoices as any[]).find((i: any) => i.id === formData.invoiceId);
    const html = `
      <html>
        <head><title>Receipt</title><style>body { font-family: sans-serif; padding: 40px; } .header { display: flex; justify-content: space-between; margin-bottom: 40px; } .document-title { font-size: 24px; font-weight: bold; }</style></head>
        <body>
          <div class="header"><div><div class="document-title">PAYMENT RECEIPT</div></div><div style="text-align: right"><strong>${APP_TITLE}</strong></div></div>
          <div style="margin-bottom: 20px"><strong>Client:</strong> ${selectedClient?.companyName || 'N/A'}<br><strong>Invoice:</strong> ${selectedInvoice?.invoiceNumber || 'N/A'}</div>
          <div style="font-size: 1.5em; font-weight: bold; margin: 20px 0; padding: 20px; background: #f0f7ff;">Amount Paid: KES ${parseFloat(formData.amount || '0').toLocaleString()}</div>
          <div><strong>Method:</strong> ${(formData.paymentMethod || 'unknown').toUpperCase()}<br><strong>Reference:</strong> ${formData.referenceNumber || 'N/A'}<br><strong>Date:</strong> ${formData.paymentDate}</div>
          <script>
            window.onload = () => { 
              setTimeout(() => {
                window.print();
              }, 100);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <ModuleLayout title="Record Payment" icon={<DollarSign className="w-6 h-6" />} breadcrumbs={[{ label: "Payments", href: "/payments" }, { label: "Record Payment" }]}>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Client Section */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Client</Label>
                <div className="flex gap-1 text-sm">
                  <button type="button" className={`px-3 py-1 rounded-l-md border text-xs font-medium transition-colors ${clientMode === "existing" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`} onClick={() => setClientMode("existing")}>Existing Client</button>
                  <button type="button" className={`px-3 py-1 rounded-r-md border text-xs font-medium transition-colors ${clientMode === "new" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`} onClick={() => setClientMode("new")}>New Client</button>
                </div>
              </div>

              {clientMode === "existing" ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <Label className="text-right text-sm">Client *</Label>
                    <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                      <SelectTrigger><SelectValue placeholder="Search or select client..." /></SelectTrigger>
                      <SelectContent>
                        {Array.isArray(clients) && clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2"><Building2 className="h-3 w-3 text-muted-foreground" />{c.companyName || c.name || "Unnamed Client"}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 p-4 bg-muted/30 rounded-lg border border-dashed">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <Label className="text-right text-sm">Name *</Label>
                    <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Client name" />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <Label className="text-right text-sm">Email</Label>
                    <Input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="Email address" />
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Payment Details */}
            <div className="grid gap-4">
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Number</Label>
                <Input value={formData.paymentNumber} readOnly className="bg-muted cursor-not-allowed font-mono max-w-xs" placeholder={isLoadingNumber ? "Generating..." : ""} />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Invoice *</Label>
                <Select value={formData.invoiceId} onValueChange={(v) => setFormData({ ...formData, invoiceId: v })}>
                  <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                  <SelectContent>
                    {Array.isArray(invoices) && invoices.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>{i.invoiceNumber || "Invoice"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Amount (KES) *</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} step="0.01" className="max-w-xs" />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Date *</Label>
                <Input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} className="max-w-xs" />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Method *</Label>
                <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
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
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Reference #</Label>
                <Input value={formData.referenceNumber} onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })} className="max-w-xs" />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Additional Information - Collapsible */}
            <Collapsible open={showAdditionalInfo} onOpenChange={setShowAdditionalInfo}>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <span>Additional Information</span>
                  {showAdditionalInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="grid grid-cols-[140px_1fr] items-start gap-3">
                  <Label className="text-right text-sm pt-2">Notes</Label>
                  <RichTextEditor value={formData.notes} onChange={(html) => setFormData({ ...formData, notes: html })} minHeight="100px" placeholder="Additional notes..." />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-4" />

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print Receipt</Button>
              <Button type="submit" disabled={createPaymentMutation.isPending}>
                {createPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </ModuleLayout>
  );
}
