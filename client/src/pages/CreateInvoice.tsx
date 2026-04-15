import { ModuleLayout } from "@/components/ModuleLayout";
import { Plus, RefreshCw } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import DocumentForm from "@/components/forms/DocumentForm";
import { useLocation } from "wouter";
import { useRequireFeature } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CreateInvoice() {
  // CALL ALL HOOKS UNCONDITIONALLY AT TOP LEVEL
  const { allowed, isLoading } = useRequireFeature("accounting:invoices:create");
  const companyInfo = useCompanyInfo();
  const { data: bankData } = trpc.settings.getByCategory.useQuery({ category: "payment_bank" });
  const { data: mpesaData } = trpc.settings.getByCategory.useQuery({ category: "payment_mpesa" });
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [isLoadingNumber, setIsLoadingNumber] = useState(true);
  const getNextNumberMutation = trpc.settings.getNextDocumentNumber.useMutation();

  // Recurring invoice state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<string>("monthly");
  const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringNoEnd, setRecurringNoEnd] = useState(true);

  // Recurring invoice creation mutation
  const createRecurringMutation = trpc.communications.createRecurringInvoice.useMutation({
    onSuccess: () => {
      toast.success("Recurring schedule created!");
    },
    onError: (e: any) => toast.error(`Failed to create recurring schedule: ${e.message}`),
  });

  // Generate invoice number on component mount
  useEffect(() => {
    let isMounted = true;

    const generateNumber = () => {
      setIsLoadingNumber(true);
      getNextNumberMutation.mutate(
        { documentType: 'invoice' },
        {
          onSuccess: (result) => {
            if (isMounted) setInvoiceNumber(result.documentNumber || `INV-${String(Math.random() * 1000000 | 0).padStart(6, '0')}`);
          },
          onError: () => {
            if (isMounted) {
              console.error('Failed to generate invoice number');
              setInvoiceNumber(`INV-${String(Math.random() * 1000000 | 0).padStart(6, '0')}`);
            }
          },
          onSettled: () => {
            if (isMounted) setIsLoadingNumber(false);
          },
        }
      );
    };

    generateNumber();

    return () => {
      isMounted = false;
    };
  }, []);

  const createInvoiceMutation = trpc.invoices.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Invoice created successfully!");
      utils.invoices.list.invalidate();
      // If recurring, create the recurring schedule
      if (isRecurring && data?.id) {
        createRecurringMutation.mutate({
          baseInvoiceId: data.id,
          frequency: recurringFrequency as any,
          startDate: recurringStartDate,
          endDate: recurringNoEnd ? undefined : recurringEndDate || undefined,
          isActive: true,
        });
      }
      setLocation("/invoices");
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  const handleSave = useCallback((data: any) => {
    if (!data.documentNumber) {
      toast.error("Invoice number is required");
      return;
    }

    const subtotal = data.subtotal || 0;
    const taxAmount = data.vat || 0;
    const total = data.grandTotal || (subtotal + taxAmount);

    const invoiceData = {
      invoiceNumber: data.documentNumber,
      clientId: data.clientId || `guest_${Date.now()}`,
      title: data.clientName ? `Invoice for ${data.clientName}` : undefined,
      issueDate: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: Math.round(subtotal * 100),
      taxAmount: Math.round(taxAmount * 100),
      discountAmount: 0,
      total: Math.round(total * 100),
      paidAmount: 0,
      status: (data.status || "draft") as "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled",
      notes: data.notes || "",
      terms: data.terms || "",
      lineItems: data.lineItems?.map((item: any) => ({
        itemType: 'custom' as const,
        description: item.description,
        quantity: item.qty,
        unitPrice: Math.round(item.unitPrice * 100),
        taxRate: item.tax || 0,
        discountPercent: 0,
        total: Math.round(item.total * 100),
      })),
    };
    
    createInvoiceMutation.mutate(invoiceData);
  }, [createInvoiceMutation]);

  const handleSend = useCallback((data: any) => {
    if (!data.documentNumber) {
      toast.error("Invoice number is required");
      return;
    }

    if (!data.clientEmail) {
      toast.error("Client email is required to send invoice");
      return;
    }

    const subtotal = data.subtotal || 0;
    const taxAmount = data.vat || 0;
    const total = data.grandTotal || (subtotal + taxAmount);

    const invoiceData = {
      invoiceNumber: data.documentNumber,
      clientId: data.clientId || `guest_${Date.now()}`,
      title: data.clientName ? `Invoice for ${data.clientName}` : undefined,
      issueDate: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: Math.round(subtotal * 100),
      taxAmount: Math.round(taxAmount * 100),
      discountAmount: 0,
      total: Math.round(total * 100),
      paidAmount: 0,
      status: "sent" as const,
      notes: data.notes || "",
      terms: data.terms || "",
      lineItems: data.lineItems?.map((item: any) => ({
        itemType: 'custom' as const,
        description: item.description,
        quantity: item.qty,
        unitPrice: Math.round(item.unitPrice * 100),
        taxRate: item.tax || 0,
        discountPercent: 0,
        total: Math.round(item.total * 100),
      })),
    };
    
    createInvoiceMutation.mutate(invoiceData);
    toast.info(`Invoice will be sent to ${data.clientEmail}`);
  }, [createInvoiceMutation]);

  const defaultTerms = `1. All prices are in Kenya shillings (KSHs)
2. VAT is charged where applicable.
3. Invoice is valid for 7 days from date of generation.
4. Late invoices will attract a penalty or suspension of service.`;

  const bankMap: Record<string, string> = {};
  if (Array.isArray(bankData)) bankData.forEach((r: any) => { if (r.key) bankMap[r.key] = r.value ?? ''; });
  else if (bankData && typeof bankData === 'object') Object.assign(bankMap, bankData);
  const mpesaMap: Record<string, string> = {};
  if (Array.isArray(mpesaData)) mpesaData.forEach((r: any) => { if (r.key) mpesaMap[r.key] = r.value ?? ''; });
  else if (mpesaData && typeof mpesaData === 'object') Object.assign(mpesaMap, mpesaData);

  const defaultPaymentDetails = [
    bankMap.bankName && `Bank: ${bankMap.bankName}`,
    bankMap.branch && `Branch: ${bankMap.branch}`,
    bankMap.accountNumber && `Acc.: ${bankMap.accountNumber}`,
    bankMap.accountName && `Acc. Name: ${bankMap.accountName}`,
    mpesaMap.paybillNumber && `\nor\n\nMpesa Paybill: ${mpesaMap.paybillNumber}`,
    mpesaMap.accountNumber && `Acc. Number: ${mpesaMap.accountNumber}`,
  ].filter(Boolean).join('\n') || 'Payment details not configured';

  const initialData = useMemo(() => ({ 
    documentNumber: invoiceNumber,
    terms: defaultTerms,
    paymentDetails: defaultPaymentDetails
  }), [invoiceNumber, defaultTerms, defaultPaymentDetails]);

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

  return (
    <ModuleLayout
      title="Create Invoice"
      description="Create a new invoice for a client"
      icon={<Plus className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Invoices", href: "/invoices" },
        { label: "Create" },
      ]}
      backLink={{ label: "Invoices", href: "/invoices" }}
    >
      {/* Recurring Invoice Options */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Recurring Options
            </CardTitle>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
          <p className="text-sm text-muted-foreground">Enable to automatically generate this invoice on a schedule</p>
        </CardHeader>
        {isRecurring && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={recurringStartDate} onChange={(e) => setRecurringStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  End Date
                  <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    <Switch checked={recurringNoEnd} onCheckedChange={setRecurringNoEnd} className="scale-75" />
                    No end date
                  </span>
                </Label>
                <Input type="date" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} disabled={recurringNoEnd} className={recurringNoEnd ? "opacity-50" : ""} />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <DocumentForm 
        type="invoice"
        mode="create"
        initialData={initialData}
        onSave={handleSave}
        onSend={handleSend}
        isLoading={isLoadingNumber}
        isSaving={createInvoiceMutation.isPending}
      />
    </ModuleLayout>
  );
}
