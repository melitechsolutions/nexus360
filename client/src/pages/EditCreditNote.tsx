import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import ModuleLayout from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

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

export default function EditCreditNote() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [reason, setReason] = useState<string>("other");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "approved">("draft");
  const [items, setItems] = useState<LineItem[]>([createEmptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  const { data: creditNote, isLoading } = trpc.creditNotes.get.useQuery(
    { id: id || "" },
    { enabled: !!id }
  );

  const clientsQuery = trpc.clients.list.useQuery({ page: 1, limit: 500 } as any);
  const clients = (clientsQuery.data as any)?.clients || clientsQuery.data || [];

  useEffect(() => {
    if (creditNote) {
      const cn = creditNote as any;
      setCreditNoteNumber(cn.creditNoteNumber || "");
      setIssueDate(cn.issueDate ? cn.issueDate.split("T")[0] : "");
      setClientId(cn.clientId || "");
      setClientName(cn.clientName || "");
      setInvoiceId(cn.invoiceId || "");
      setReason(cn.reason || "other");
      setNotes(cn.notes || "");
      setStatus(cn.status || "draft");
      if (cn.items && cn.items.length > 0) {
        setItems(
          cn.items.map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            description: item.description || "",
            quantity: item.quantity || 1,
            rate: Number(item.rate) / 100,
            taxRate: item.taxRate || 0,
            amount: Number(item.amount) / 100,
            taxAmount: Number(item.taxAmount) / 100,
          }))
        );
      }
    }
  }, [creditNote]);

  const updateMut = trpc.creditNotes.update.useMutation({
    onSuccess: () => {
      toast.success("Credit note updated successfully");
      setLocation("/credit-notes");
    },
    onError: (err: any) => toast.error(err.message),
    onSettled: () => setSubmitting(false),
  });

  const updateItem = (itemId: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };
        updated.amount = updated.quantity * updated.rate;
        updated.taxAmount = Math.round(updated.amount * (updated.taxRate / 100) * 100) / 100;
        return updated;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);
  const removeItem = (itemId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
  const total = subtotal + totalTax;

  const handleSubmit = () => {
    if (!creditNoteNumber || !clientId || !clientName || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (items.some((i) => !i.description || i.rate <= 0)) {
      toast.error("Each line item must have a description and rate > 0");
      return;
    }
    setSubmitting(true);
    updateMut.mutate({
      id: id!,
      creditNoteNumber,
      issueDate: `${issueDate}T00:00:00`,
      clientId,
      clientName,
      invoiceId: invoiceId || undefined,
      reason: reason as any,
      items: items.map((i) => ({
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
      status,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  }

  return (
    <ModuleLayout
      title="Edit Credit Note"
      description="Update credit note details"
      icon={<FileText className="w-6 h-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/crm-home" },
        { label: "Accounting", href: "/accounting" },
        { label: "Credit Notes", href: "/credit-notes" },
        { label: "Edit" },
      ]}
    >
      <div className="max-w-5xl space-y-6">
        <Card className="p-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Client *</Label>
              <Select
                value={clientId}
                onValueChange={(v) => {
                  setClientId(v);
                  const c = (clients as any[]).find((c: any) => c.id === v);
                  if (c) setClientName(c.companyName || c.name || "");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>
                  {(clients as any[]).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.companyName || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Number *</Label>
              <Input value={creditNoteNumber} onChange={(e) => setCreditNoteNumber(e.target.value)} className="max-w-xs" />
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Issue Date *</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="max-w-xs" />
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
              <Label className="text-right text-sm">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-right text-sm">Invoice</Label>
              <Input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} placeholder="Related invoice (optional)" className="max-w-xs" />
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-[140px_1fr] items-start gap-3">
            <Label className="text-right text-sm pt-2">Notes</Label>
            <RichTextEditor value={notes} onChange={(html) => setNotes(html)} minHeight="100px" placeholder="Additional notes..." />
          </div>
        </Card>

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
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-4">
                  <Input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} placeholder="Description" />
                </div>
                <div className="col-span-1">
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <Input type="number" min={0} step={0.01} value={item.rate} onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))} />
                </div>
                <div className="col-span-1">
                  <Input type="number" min={0} max={100} value={item.taxRate} onChange={(e) => updateItem(item.id, "taxRate", Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <Input value={item.amount.toFixed(2)} readOnly className="bg-muted" />
                </div>
                <div className="col-span-1">
                  <Input value={item.taxAmount.toFixed(2)} readOnly className="bg-muted" />
                </div>
                <div className="col-span-1 flex items-center">
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Separator className="my-4" />
            <div className="space-y-1 text-right">
              <p className="text-sm">Subtotal: KES {subtotal.toFixed(2)}</p>
              <p className="text-sm">Tax: KES {totalTax.toFixed(2)}</p>
              <p className="text-lg font-bold">Total: KES {total.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setLocation("/credit-notes")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Spinner className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </ModuleLayout>
  );
}
