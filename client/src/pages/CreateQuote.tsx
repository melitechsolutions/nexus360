import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, AlertCircle, ChevronDown, ChevronUp, SaveIcon } from "lucide-react";
import { trpc } from "../utils/trpc";
import { z } from "zod";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const quoteLineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().positive("Unit price must be positive"),
  taxRate: z.number().min(0).max(100).optional(),
});

const createQuoteSchema = z.object({
  clientId: z.string().min(1, "Client required"),
  subject: z.string().min(1, "Subject required"),
  description: z.string().optional(),
  items: z.array(quoteLineItemSchema).min(1, "At least one line item required"),
  notes: z.string().optional(),
  expirationDays: z.number().int().positive("Expiration must be positive").default(30),
});

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface FormErrors {
  [key: string]: string;
}

export function CreateQuote() {
  const [, navigate] = useLocation();
  const [clientId, setClientId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [expirationDays, setExpirationDays] = useState(30);
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);

  // Get clients for dropdown
  const clientsQuery = trpc.clients.list.useQuery({ limit: 100 });
  
  useEffect(() => {
    if (clientsQuery.data) {
      setClients(clientsQuery.data);
    }
  }, [clientsQuery.data]);

  const createMutation = trpc.quotes.create.useMutation();

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;
      taxAmount += itemTotal * (item.taxRate / 100);
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  };

  const totals = calculateTotals();

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const data = {
        clientId,
        subject,
        description: description || undefined,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
        notes: notes || undefined,
        expirationDays,
      };

      createQuoteSchema.parse(data);

      setLoading(true);
      const result = await createMutation.mutateAsync(data);
      setLoading(false);

      toast.success(`Quote ${result.quoteNumber} created successfully`);
      navigate(`/quotes/${result.id}`);
    } catch (error: any) {
      setLoading(false);

      if (error instanceof z.ZodError) {
        const fieldErrors: FormErrors = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error(error.message || "Failed to create quote");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/quotes")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Quote</h1>
          <p className="text-gray-600 mt-1">Create a new quote for a client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quote Details Section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quote Details</h2>

          <div className="space-y-3">
            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm font-medium">Client <span className="text-red-500">*</span></Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.clientId && <p className="text-red-500 text-sm ml-[152px]">{errors.clientId}</p>}

            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm font-medium">Subject <span className="text-red-500">*</span></Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Quote subject"
              />
            </div>
            {errors.subject && <p className="text-red-500 text-sm ml-[152px]">{errors.subject}</p>}

            <div className="grid grid-cols-[140px_1fr] items-start gap-3">
              <Label className="text-sm font-medium pt-2">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Quote description (optional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-[140px_1fr] items-center gap-3">
              <Label className="text-sm font-medium">Expiration Days <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                min="1"
                className="max-w-[200px]"
              />
            </div>
            {errors.expirationDays && <p className="text-red-500 text-sm ml-[152px]">{errors.expirationDays}</p>}
          </div>

          <Separator className="my-4" />

          {/* Additional Information - Collapsible */}
          <Collapsible open={additionalInfoOpen} onOpenChange={setAdditionalInfoOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
              {additionalInfoOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Additional Information
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="grid grid-cols-[140px_1fr] items-start gap-3">
                <Label className="text-sm font-medium pt-2">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes"
                  rows={3}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Line Items Section */}
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>

          <Separator className="my-4" />

          {items.length === 0 && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <AlertCircle size={18} />
              <span>At least one line item is required</span>
            </div>
          )}

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border border-gray-200 rounded-lg"
              >
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, "description", e.target.value)
                    }
                    placeholder="Item description"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600">Qty</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", parseFloat(e.target.value))
                    }
                    min="1"
                    step="0.01"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600">Unit Price</Label>
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleItemChange(index, "unitPrice", parseFloat(e.target.value))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-600">Tax %</Label>
                  <Input
                    type="number"
                    value={item.taxRate}
                    onChange={(e) =>
                      handleItemChange(index, "taxRate", parseFloat(e.target.value))
                    }
                    min="0"
                    max="100"
                  />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <Label className="text-xs font-semibold text-gray-600">Total</Label>
                    <div className="text-sm font-semibold text-gray-900">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Totals Summary */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-gray-700">
              <span>Subtotal:</span>
              <span className="text-lg">${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-700">
              <span>Tax:</span>
              <span className="text-lg">${totals.taxAmount.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${totals.total.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/quotes")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={loading}
          >
            <SaveIcon className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Save & Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateQuote;
