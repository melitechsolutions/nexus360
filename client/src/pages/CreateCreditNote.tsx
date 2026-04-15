import ModuleLayout from "@/components/ModuleLayout";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { toast } from "sonner";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
  taxAmount: number;
}

function createEmptyItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, taxRate: 0, amount: 0, taxAmount: 0 };
}

export default function CreateCreditNote() {
  const [, setLocation] = useLocation();
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [reason, setReason] = useState<string>("other");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  const nextNumberQuery = trpc.creditNotes.getNextNumber.useQuery(undefined, {
    onSuccess: (num) => { if (!creditNoteNumber) setCreditNoteNumber(num); },
  });

  const clientsQuery = trpc.clients.list.useQuery({ page: 1, limit: 500 } as any);
  const clients = (clientsQuery.data as any)?.clients || clientsQuery.data || [];

  const createMut = trpc.creditNotes.create.useMutation({
    onSuccess: () => {
      toast.success("Credit note created successfully");
      setLocation("/credit-notes");
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setSubmitting(false),
  });

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.amount = updated.quantity * updated.rate;
      updated.taxAmount = Math.round(updated.amount * (updated.taxRate / 100));
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, createEmptyItem()]);
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const total = subtotal + totalTax;

  const handleSubmit = () => {
    if (!creditNoteNumber || !clientId || !clientName || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (items.some(i => !i.description || i.rate <= 0)) {
      toast.error("Each line item must have a description and rate > 0");
      return;
    }
    setSubmitting(true);
    createMut.mutate({
      creditNoteNumber,
      issueDate: `${issueDate}T00:00:00`,
      clientId,
      clientName,
      invoiceId: invoiceId || undefined,
      reason: reason as any,
      items: items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        rate: Math.round(i.rate * 100),
        amount: Math.round(i.amount * 100),
        taxRate: i.taxRate,
        taxAmount: Math.round(i.taxAmount * 100),
      })),
      subtotal: Math.round(subtotal * 100),
      taxAmount: Math.round(totalTax * 100),
      total: Math.round(total * 100),
      notes: notes || undefined,
      status: "draft",
    });
  };

  return (
    <ModuleLayout
      title="Create Credit Note"
      description="Issue a new credit note with line items"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Credit Notes", href: "/credit-notes" },
        { label: "Create" },
      ]}
    >
      <div className="max-w-5xl space-y-6">
        {/* Credit Note Details */}
        <Card className="p-6">
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
                  <Select value={clientId} onValueChange={v => {
                    setClientId(v);
                    const c = (clients as any[]).find((c: any) => c.id === v);
                    if (c) setClientName(c.companyName || c.name || "");
                  }}>
                    <SelectTrigger><SelectValue placeholder="Search or select client..." /></SelectTrigger>
                    <SelectContent>
                      {(clients as any[]).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2"><Building2 className="h-3 w-3 text-muted-foreground" />{c.companyName || c.name}</span>
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
                  <Input value={newClientName} onChange={(e) => { setNewClientName(e.target.value); setClientName(e.target.value); }} placeholder="Client or company name" />
                </div>
                <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                  <Label className="text-right text-sm">Email</Label>
                  <Input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="Email address" />
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Credit Note Fields */}
          <div className="grid gap-4">
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Number *</Label>
              <Input value={creditNoteNumber} onChange={e => setCreditNoteNumber(e.target.value)} placeholder="CN-00001" className="max-w-xs" />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Issue Date *</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="max-w-xs" />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="goods-returned">Goods Returned</SelectItem>
                  <SelectItem value="service-cancelled">Service Cancelled</SelectItem>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="quality-issue">Quality Issue</SelectItem>
                  <SelectItem value="error">Billing Error</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Invoice</Label>
              <Input value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="Related invoice (optional)" className="max-w-xs" />
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
                <RichTextEditor value={notes} onChange={(html) => setNotes(html)} minHeight="100px" placeholder="Additional notes..." />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2 mb-2 text-xs font-medium text-muted-foreground">
              <div className="col-span-4">Description</div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-2">Rate (KES)</div>
              <div className="col-span-1">Tax %</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-1">Tax</div>
              <div className="col-span-1"></div>
            </div>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 mb-2">
                <Input className="col-span-4" placeholder="Description" value={item.description}
                  onChange={e => updateItem(item.id, "description", e.target.value)} />
                <Input className="col-span-1" type="number" min="1" value={item.quantity}
                  onChange={e => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)} />
                <Input className="col-span-2" type="number" min="0" step="0.01" value={item.rate}
                  onChange={e => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)} />
                <Input className="col-span-1" type="number" min="0" max="100" value={item.taxRate}
                  onChange={e => updateItem(item.id, "taxRate", parseFloat(e.target.value) || 0)} />
                <div className="col-span-2 flex items-center text-sm font-medium">
                  KES {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 flex items-center text-sm text-muted-foreground">
                  {item.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 flex items-center">
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length <= 1}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="border-t pt-4 mt-4 space-y-1 text-right">
              <p className="text-sm">Subtotal: <span className="font-medium">KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
              <p className="text-sm">Tax: <span className="font-medium">KES {totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
              <p className="text-lg font-bold">Total: KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setLocation("/credit-notes")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Credit Note"}
          </Button>
        </div>
      </div>
    </ModuleLayout>
  );
}
