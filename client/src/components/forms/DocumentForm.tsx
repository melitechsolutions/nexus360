import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/const";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Save, Send, Printer, Loader2, ChevronDown, ChevronUp, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useCurrencySettings, formatAmount } from "@/lib/currency";

interface LineItem {
  id: string;
  sno: number;
  description: string;
  uom: string;
  qty: number;
  unitPrice: number;
  tax: number;
  discount: number; // discount percentage per line
  total: number;
}

interface DocumentFormProps {
  type: "invoice" | "estimate" | "receipt" | "payment";
  mode?: "create" | "edit";
  onSave?: (data: any) => void;
  onSend?: (data: any) => void;
  onDelete?: () => void;
  initialData?: any;
  isLoading?: boolean;
  isSaving?: boolean;
}

export default function DocumentForm({ 
  type, 
  mode = "create",
  onSave, 
  onSend, 
  initialData,
  isLoading = false,
  isSaving = false,
}: DocumentFormProps) {
  const [documentNumber, setDocumentNumber] = useState(initialData?.documentNumber || "");

  // Update document number when initialData changes (e.g. after async fetch)
  useEffect(() => {
    if (initialData?.documentNumber) {
      setDocumentNumber(initialData.documentNumber);
    }
  }, [initialData?.documentNumber]);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || "");
  const [dueDateMethod, setDueDateMethod] = useState<"auto" | "manual">(initialData?.dueDate ? "manual" : "auto");
  const [dueDays, setDueDays] = useState(initialData?.dueDays ?? 7);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState(initialData?.clientId || "");
  const [clientName, setClientName] = useState(initialData?.clientName || "");
  const [clientEmail, setClientEmail] = useState(initialData?.clientEmail || "");
  const [clientAddress, setClientAddress] = useState(initialData?.clientAddress || "");
  const [newClientFirstName, setNewClientFirstName] = useState("");
  const [newClientLastName, setNewClientLastName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [projectId, setProjectId] = useState(initialData?.projectId || "");
  const [category, setCategory] = useState(initialData?.category || "default");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [terms, setTerms] = useState(initialData?.terms || "");
  const [paymentDetails, setPaymentDetails] = useState(initialData?.paymentDetails || "");
  const [applyVAT, setApplyVAT] = useState(initialData?.applyVAT ?? true);
  const [taxType, setTaxType] = useState<"inclusive" | "exclusive">(initialData?.taxType || "exclusive");
  const [vatPercentage, setVatPercentage] = useState(initialData?.vatPercentage ?? 16);
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || "mpesa");
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [documentDiscount, setDocumentDiscount] = useState<number>(initialData?.documentDiscount ?? 0);
  const [lineItems, setLineItems] = useState<LineItem[]>(initialData?.lineItems || [
    { id: "1", sno: 1, description: "", uom: "Pcs", qty: 1, unitPrice: 0, tax: 0, discount: 0, total: 0 }
  ]);

  const { data: clientsData } = trpc.clients.list.useQuery();
  const clients = useMemo(() => clientsData || [], [clientsData]);
  const { data: projectsData } = trpc.projects.list.useQuery();
  const clientProjects = useMemo(() => {
    if (!projectsData || !clientId) return [];
    return (projectsData as any[]).filter((p: any) => p.clientId === clientId);
  }, [projectsData, clientId]);
  const { data: companyInfo } = trpc.settings.getCompanyInfo.useQuery();
  const { data: bankDetails } = trpc.settings.getBankDetails.useQuery();
  const { data: taxSettings } = trpc.settings.getByCategory.useQuery(
    { category: "tax_rates" },
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: invoiceSettings } = trpc.settings.getByCategory.useQuery(
    { category: "invoice_settings" },
    { staleTime: 5 * 60 * 1000 }
  );

  // Apply default VAT rate from settings on mount (only in create mode)
  useEffect(() => {
    if (mode === 'create' && taxSettings?.defaultRate) {
      setVatPercentage(parseFloat(taxSettings.defaultRate) || 16);
    }
  }, [taxSettings, mode]);

  // Apply invoice settings (due days, terms) on mount (only in create mode)
  useEffect(() => {
    if (mode === 'create' && invoiceSettings) {
      if (invoiceSettings.defaultDueDays) {
        setDueDays(parseInt(invoiceSettings.defaultDueDays) || 7);
      }
      if (invoiceSettings.termsAndConditions && !terms) {
        setTerms(invoiceSettings.termsAndConditions);
      }
    }
  }, [invoiceSettings, mode]);

  // Auto-calculate due date when date or dueDays changes
  useEffect(() => {
    if (dueDateMethod === "auto" && date) {
      const d = new Date(date);
      d.setDate(d.getDate() + dueDays);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [date, dueDays, dueDateMethod]);

  const { symbol: currencySymbol, position: currencyPosition } = useCurrencySettings();
  const cur = (amount: number, decimals = 2) => formatAmount(amount, currencySymbol, currencyPosition, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const selectedClient = clients.find((c: any) => c.id === clientId);
      if (selectedClient) {
        setClientName(selectedClient.companyName || "");
        setClientEmail(selectedClient.email || "");
        setClientAddress(selectedClient.address || "");
      }
    }
  }, [clientId, clients]);

  // Reset project when client changes
  useEffect(() => {
    if (clientId) {
      // Check if current project belongs to new client
      if (projectId && clientProjects.length > 0) {
        const belongsToClient = clientProjects.some((p: any) => p.id === projectId);
        if (!belongsToClient) setProjectId("");
      }
    } else {
      setProjectId("");
    }
  }, [clientId]);

  // Handle terms and payment details updates when company info or bank details load
  useEffect(() => {
    if (mode === 'create' && companyInfo && bankDetails) {
      if (!terms && initialData?.terms) {
        setTerms(initialData.terms);
      }
      if (!paymentDetails && initialData?.paymentDetails) {
        setPaymentDetails(initialData.paymentDetails);
      }
    }
  }, [mode, companyInfo, bankDetails, initialData?.terms, initialData?.paymentDetails]);

  const calculateLineTotal = useCallback((qty: number, unitPrice: number, taxPercent: number, discountPercent: number = 0): number => {
    const lineSubtotal = qty * unitPrice;
    const discountAmt = (lineSubtotal * discountPercent) / 100;
    const afterDiscount = lineSubtotal - discountAmt;
    const taxAmount = (afterDiscount * taxPercent) / 100;
    return afterDiscount + taxAmount;
  }, []);

  const { subtotal, lineDiscountTotal, vat, grandTotal } = useMemo(() => {
    const rawSubtotal = lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const lineDiscountTotal = lineItems.reduce((sum, item) => {
      const lineSub = item.qty * item.unitPrice;
      return sum + (lineSub * (item.discount || 0)) / 100;
    }, 0);
    const afterLineDiscounts = rawSubtotal - lineDiscountTotal;
    const docDiscountAmt = (afterLineDiscounts * documentDiscount) / 100;
    const afterAllDiscounts = afterLineDiscounts - docDiscountAmt;
    
    let subtotal = afterAllDiscounts;
    let vat = 0;
    let grandTotal = afterAllDiscounts;

    if (applyVAT) {
      if (taxType === "inclusive") {
        grandTotal = afterAllDiscounts;
        vat = afterAllDiscounts - (afterAllDiscounts / (1 + vatPercentage / 100));
        subtotal = grandTotal - vat;
      } else {
        subtotal = afterAllDiscounts;
        vat = (subtotal * vatPercentage) / 100;
        grandTotal = subtotal + vat;
      }
    }

    return { subtotal, lineDiscountTotal, vat, grandTotal };
  }, [lineItems, applyVAT, vatPercentage, taxType, documentDiscount]);

  const addLineItem = useCallback(() => {
    setLineItems(prev => [...prev, { id: Date.now().toString(), sno: prev.length + 1, description: "", uom: "Pcs", qty: 1, unitPrice: 0, tax: 0, discount: 0, total: 0 }]);
  }, []);

  const updateLineItem = useCallback((id: string, field: string, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'unitPrice' || field === 'tax' || field === 'discount') {
          updatedItem.total = calculateLineTotal(updatedItem.qty, updatedItem.unitPrice, updatedItem.tax, updatedItem.discount);
        }
        return updatedItem;
      }
      return item;
    }));
  }, [calculateLineTotal]);

  const getFormData = useCallback(() => ({
    id: initialData?.id, documentNumber, type, date, dueDate, clientId: clientMode === "new" ? undefined : clientId, clientName: clientMode === "new" ? `${newClientFirstName} ${newClientLastName}`.trim() : clientName, clientEmail: clientMode === "new" ? newClientEmail : clientEmail, clientAddress, projectId, category, lineItems, subtotal, vat, grandTotal, documentDiscount, lineDiscountTotal, notes, terms, paymentDetails, applyVAT, taxType, vatPercentage, paymentMethod,
    newClient: clientMode === "new" ? { firstName: newClientFirstName, lastName: newClientLastName, companyName: newClientCompany, email: newClientEmail } : undefined,
  }), [documentNumber, type, date, dueDate, clientId, clientMode, clientName, clientEmail, clientAddress, newClientFirstName, newClientLastName, newClientCompany, newClientEmail, projectId, category, lineItems, subtotal, vat, grandTotal, documentDiscount, lineDiscountTotal, notes, terms, paymentDetails, applyVAT, taxType, vatPercentage, paymentMethod, initialData?.id]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }
    const title = type.toUpperCase();
    
    const logoHtml = companyInfo?.companyLogo 
      ? `<img src="${companyInfo.companyLogo}" style="max-height: 80px; margin-bottom: 15px;" />` 
      : `<div class="document-title">${title}</div>`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} ${documentNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company-info { max-width: 50%; }
            .document-title { font-size: 24px; font-weight: bold; color: #2563eb; }
            .doc-details { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f3f4f6; text-align: left; padding: 12px; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .totals { width: 300px; margin-left: auto; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 8px; }
            .footer { margin-top: 60px; text-align: center; font-size: 0.8em; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
            .terms-section { margin-top: 40px; }
            .section-title { font-weight: bold; margin-bottom: 8px; font-size: 0.95em; }
            .section-content { white-space: pre-wrap; font-size: 0.9em; color: #444; margin-bottom: 20px; }
            .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .column-box { border: 1px solid #e5e7eb; padding: 12px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              ${logoHtml}
              <p style="font-size: 0.9em; margin-top: 10px;">
                ${companyInfo?.companyAddress || 'Nairobi, Kenya'}<br>
                ${companyInfo?.companyCity || ''} ${companyInfo?.companyCountry || ''}<br>
                Email: ${companyInfo?.companyEmail || ''}<br>
                Phone: ${companyInfo?.companyPhone || ''}
              </p>
            </div>
            <div class="doc-details">
              <div class="document-title">${title}</div>
              <p><strong>Number:</strong> ${documentNumber}</p>
              <p><strong>Date:</strong> ${date}</p>
              ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
            </div>
          </div>
          
          <div style="margin-bottom: 30px">
            <div class="section-title">Bill To:</div>
            <div class="section-content">${clientName}<br>${clientAddress}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Disc %</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td class="text-right">${item.qty}</td>
                  <td class="text-right">${currencySymbol} ${item.unitPrice.toLocaleString()}</td>
                  <td class="text-right">${item.discount || 0}%</td>
                  <td class="text-right">${currencySymbol} ${(item.qty * item.unitPrice * (1 - (item.discount || 0) / 100)).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row"><span>Subtotal:</span><span>${currencySymbol} ${lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            ${lineDiscountTotal > 0 ? `<div class="total-row"><span>Line Discounts:</span><span>-${currencySymbol} ${lineDiscountTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
            ${documentDiscount > 0 ? `<div class="total-row"><span>Discount (${documentDiscount}%):</span><span>-${currencySymbol} ${((lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0) - lineDiscountTotal) * documentDiscount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
            <div class="total-row"><span>Net Amount:</span><span>${currencySymbol} ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            ${applyVAT ? `<div class="total-row"><span>VAT (${vatPercentage}%) ${taxType === 'inclusive' ? '(Incl.)' : '(Excl.)'}:</span><span>${currencySymbol} ${vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
            <div class="total-row grand-total"><span>Grand Total:</span><span>${currencySymbol} ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          </div>
          
          <div class="terms-section">
            <div class="two-column">
              <div class="column-box">
                <div class="section-title">Terms & Conditions:</div>
                <div class="section-content">${terms}</div>
              </div>
              <div class="column-box">
                <div class="section-title">Payment Details:</div>
                <div class="section-content">${paymentDetails}</div>
              </div>
            </div>
            
            ${notes ? `<div class="section-title">Notes:</div><div class="section-content">${notes}</div>` : ''}
          </div>
          
          <div class="footer">
            This is a system generated ${type} from ${companyInfo?.companyName || APP_TITLE}.
          </div>
          
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  const typeLabel = type === "estimate" ? "Estimate" : type === "receipt" ? "Receipt" : type === "payment" ? "Payment" : "Invoice";
  const dateLabelMap: Record<string, string> = { invoice: "Invoice Date", estimate: "Estimate Date", receipt: "Receipt Date", payment: "Payment Date" };
  const dueDateLabelMap: Record<string, string> = { invoice: "Due Date", estimate: "Valid Until", receipt: "Date", payment: "Due Date" };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with company info */}
      <Card className="p-6">
        <div className="flex justify-between mb-6">
          <div className="flex flex-col gap-2">
            {companyInfo?.companyLogo ? (
              <img src={companyInfo.companyLogo} alt="Logo" className="h-16 w-auto object-contain" />
            ) : (
              <h1 className="text-3xl font-bold text-primary">{typeLabel}</h1>
            )}
            {companyInfo?.companyLogo && <h1 className="text-xl font-bold text-primary">{typeLabel}</h1>}
          </div>
          <div className="text-right">
            <p className="font-bold">{companyInfo?.companyName || APP_TITLE}</p>
            <p className="text-sm text-muted-foreground">
              {companyInfo?.companyAddress || 'Nairobi, Kenya'}<br />
              {companyInfo?.companyPhone || ''}
            </p>
          </div>
        </div>

        {/* Client Section - New/Existing toggle like crm.africa */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Client</Label>
            <div className="flex gap-1 text-sm">
              <button
                type="button"
                className={`px-3 py-1 rounded-l-md border text-xs font-medium transition-colors ${clientMode === "existing" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                onClick={() => setClientMode("existing")}
              >
                Existing Client
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded-r-md border text-xs font-medium transition-colors ${clientMode === "new" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                onClick={() => setClientMode("new")}
              >
                New Client
              </button>
            </div>
          </div>

          {clientMode === "existing" ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Client *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search or select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {c.companyName || c.name || "Unknown Client"}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Project</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={!clientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={clientId ? "Select project (optional)" : "Select a client first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {clientProjects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name || p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Company Name</Label>
                <Input value={newClientCompany} onChange={(e) => setNewClientCompany(e.target.value)} placeholder="Company name (optional)" />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">First Name *</Label>
                <Input value={newClientFirstName} onChange={(e) => setNewClientFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Last Name *</Label>
                <Input value={newClientLastName} onChange={(e) => setNewClientLastName(e.target.value)} placeholder="Last name" />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <Label className="text-right text-sm">Email *</Label>
                <Input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="Email address" />
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Date fields */}
        <div className="grid gap-4">
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <Label className="text-right text-sm">{dateLabelMap[type] || "Date"} *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
          </div>

          {type !== 'receipt' && (
            <div className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
              <Label className="text-right text-sm">{dueDateLabelMap[type] || "Due Date"} *</Label>
              {dueDateMethod === "auto" ? (
                <Input 
                  value={`${dateLabelMap[type] || "Date"} + ${dueDays} days`}
                  readOnly 
                  className="bg-muted cursor-not-allowed max-w-xs text-sm"
                />
              ) : (
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="max-w-xs" />
              )}
              <Select value={dueDateMethod} onValueChange={(v) => setDueDateMethod(v as "auto" | "manual")}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Set Automatically</SelectItem>
                  <SelectItem value="manual">Set Manually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'receipt' && (
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <Label className="text-right text-sm">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <Label className="text-right text-sm">Number</Label>
            <Input 
              value={documentNumber} 
              readOnly 
              className="bg-muted cursor-not-allowed font-mono max-w-xs" 
              placeholder="Generating..."
            />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Additional Information - Collapsible like crm.africa */}
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
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional notes..." />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <Label className="text-right text-sm pt-2">Terms</Label>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} placeholder="Terms and conditions..." />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <Label className="text-right text-sm pt-2">Payment Details</Label>
              <Textarea value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} rows={4} placeholder="Bank details, M-Pesa, etc..." />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Line Items */}
      <Card className="p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-semibold">Items</h2>
          <Button onClick={addLineItem} size="sm"><Plus className="h-4 w-4 mr-2" />Add Item</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-right w-24">Qty</th>
                <th className="p-2 text-right w-32">Rate</th>
                <th className="p-2 text-right w-24">Disc %</th>
                <th className="p-2 text-right w-32">Total</th>
                <th className="p-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 border"><Input value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} placeholder="Item description" /></td>
                  <td className="p-2 border"><Input type="number" value={item.qty} onChange={(e) => updateLineItem(item.id, 'qty', parseInt(e.target.value) || 0)} className="text-right" /></td>
                  <td className="p-2 border"><Input type="number" value={item.unitPrice} onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="text-right" /></td>
                  <td className="p-2 border"><Input type="number" value={item.discount} onChange={(e) => updateLineItem(item.id, 'discount', parseFloat(e.target.value) || 0)} className="text-right" min={0} max={100} placeholder="0" /></td>
                  <td className="p-2 border text-right font-mono">{cur(item.qty * item.unitPrice * (1 - (item.discount || 0) / 100))}</td>
                  <td className="p-2 border">
                    <Button variant="ghost" size="icon" onClick={() => setLineItems(lineItems.filter(li => li.id !== item.id))} className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-6">
          <div className="w-80 space-y-4">
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <Label className="text-sm font-medium">Tax Type</Label>
              <div className="flex gap-1">
                <Button 
                  variant={taxType === "exclusive" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setTaxType("exclusive")}
                  className="h-7 text-xs"
                >
                  Exclusive
                </Button>
                <Button 
                  variant={taxType === "inclusive" ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setTaxType("inclusive")}
                  className="h-7 text-xs"
                >
                  Inclusive
                </Button>
              </div>
            </div>
            <div className="space-y-2 px-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-mono">{cur(lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0))}</span>
              </div>
              {lineDiscountTotal > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Line Discounts:</span>
                  <span className="font-mono">-{cur(lineDiscountTotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  Discount %:
                  <Input
                    type="number"
                    value={documentDiscount}
                    onChange={(e) => setDocumentDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 h-7 text-right text-xs"
                    min={0}
                    max={100}
                    placeholder="0"
                  />
                </span>
                {documentDiscount > 0 && (
                  <span className="font-mono text-orange-600">
                    -{cur((lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0) - lineDiscountTotal) * documentDiscount / 100)}
                  </span>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span>Net Amount:</span>
                <span className="font-mono">{cur(subtotal)}</span>
              </div>
              {applyVAT && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>VAT ({vatPercentage}%) {taxType === 'inclusive' ? '(Incl.)' : '(Excl.)'}:</span>
                  <span className="font-mono">{cur(vat)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span className="font-mono">{cur(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          <strong>* Required</strong> &nbsp;|&nbsp; Recurring options available after creation
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
          <Button variant="outline" onClick={() => onSave?.({ ...getFormData(), status: 'draft' })} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />Save Draft
          </Button>
          <Button onClick={() => onSave?.(getFormData())} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
