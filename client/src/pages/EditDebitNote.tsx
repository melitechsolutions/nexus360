import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { FileMinus, Plus, Trash2 } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function EditDebitNote() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    debitNoteNumber: "",
    issueDate: "",
    supplierId: "",
    supplierName: "",
    reason: "" as string,
    notes: "",
    status: "draft" as "draft" | "approved" | "settled",
  });

  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);

  const { data: debitNote, isLoading } = trpc.debitNotes.get.useQuery(
    { id: id || "" },
    { enabled: !!id }
  );

  useEffect(() => {
    if (debitNote) {
      const dn = debitNote as any;
      setFormData({
        debitNoteNumber: dn.debitNoteNumber || "",
        issueDate: dn.issueDate ? new Date(dn.issueDate).toISOString().split("T")[0] : "",
        supplierId: dn.supplierId || "",
        supplierName: dn.supplierName || "",
        reason: dn.reason || "",
        notes: dn.notes || "",
        status: dn.status || "draft",
      });
      if (dn.items && dn.items.length > 0) {
        setItems(
          dn.items.map((item: any, i: number) => ({
            id: item.id || String(i),
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            total: item.total || 0,
          }))
        );
      }
    }
  }, [debitNote]);

  const updateMutation = trpc.debitNotes.update.useMutation({
    onSuccess: () => {
      toast.success("Debit note updated successfully!");
      setLocation("/debit-notes");
    },
    onError: (error: any) => {
      toast.error(`Failed to update debit note: ${error.message}`);
    },
  });

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
      return updated;
    });
  };

  const addItem = () =>
    setItems((prev) => [...prev, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, total: 0 }]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const total = items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierName || !formData.reason) {
      toast.error("Supplier and reason are required");
      return;
    }
    updateMutation.mutate({
      id: id!,
      debitNoteNumber: formData.debitNoteNumber,
      issueDate: new Date(formData.issueDate),
      supplierId: formData.supplierId || "unknown",
      supplierName: formData.supplierName,
      reason: formData.reason as any,
      items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
      total,
      notes: formData.notes || undefined,
      status: formData.status,
    });
  };

  const update = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  }

  return (
    <ModuleLayout
      title="Edit Debit Note"
      icon={<FileMinus className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Debit Notes", href: "/debit-notes" },
        { label: "Edit Debit Note" },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/debit-notes")}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Debit Note Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="debitNoteNumber">Debit Note Number</Label>
              <Input id="debitNoteNumber" value={formData.debitNoteNumber} onChange={(e) => update("debitNoteNumber", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input id="issueDate" type="date" value={formData.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input id="supplierName" value={formData.supplierName} onChange={(e) => update("supplierName", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Select value={formData.reason} onValueChange={(v) => update("reason", v)}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality-shortage">Quality Shortage</SelectItem>
                  <SelectItem value="price-adjustment">Price Adjustment</SelectItem>
                  <SelectItem value="damaged">Damaged Goods</SelectItem>
                  <SelectItem value="underdelivery">Under-delivery</SelectItem>
                  <SelectItem value="penalty">Penalty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Item description" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="w-20" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} step={0.01} value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} className="w-28" />
                    </TableCell>
                    <TableCell className="font-medium">{item.total.toFixed(2)}</TableCell>
                    <TableCell>
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-right mt-4 text-lg font-semibold">Total: {total.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Additional</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="notes">Notes</Label>
            <RichTextEditor value={formData.notes} onChange={(html) => update("notes", html)} minHeight="100px" />
          </CardContent>
        </Card>
      </form>
    </ModuleLayout>
  );
}
