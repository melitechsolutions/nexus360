import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { OrgLayout } from "@/components/OrgLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Smartphone, CreditCard, Building2, FileText, CheckCircle2,
  ShieldOff, Zap, AlertCircle, Plus, Trash2, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = "mpesa" | "card" | "bank" | "cheque";

interface MpesaConfig {
  phoneNumber: string;
  accountName: string;
}

interface CardConfig {
  cardholderName: string;
  last4: string;
  brand: string; // "visa" | "mastercard"
  expiryMonth: string;
  expiryYear: string;
  autopayEnabled: boolean;
}

interface BankConfig {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  swiftCode: string;
}

interface ChequeConfig {
  payableTo: string;
  deliveryAddress: string;
}

interface SavedMethod {
  id: string;
  type: PaymentMethod;
  isDefault: boolean;
  nickname?: string;
  mpesa?: MpesaConfig;
  card?: CardConfig;
  bank?: BankConfig;
  cheque?: ChequeConfig;
  createdAt: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function methodLabel(type: PaymentMethod) {
  return { mpesa: "M-Pesa", card: "Card (Visa/Mastercard)", bank: "Bank Transfer", cheque: "Cheque" }[type];
}

function methodIcon(type: PaymentMethod) {
  switch (type) {
    case "mpesa": return <Smartphone className="h-5 w-5 text-green-400" />;
    case "card": return <CreditCard className="h-5 w-5 text-blue-400" />;
    case "bank": return <Building2 className="h-5 w-5 text-indigo-400" />;
    case "cheque": return <FileText className="h-5 w-5 text-orange-400" />;
  }
}

function methodSummary(m: SavedMethod): string {
  if (m.type === "mpesa" && m.mpesa) return m.mpesa.phoneNumber;
  if (m.type === "card" && m.card) return `${m.card.brand.toUpperCase()} •••• ${m.card.last4}`;
  if (m.type === "bank" && m.bank) return `${m.bank.bankName} — ${m.bank.accountNumber}`;
  if (m.type === "cheque" && m.cheque) return `Payable to: ${m.cheque.payableTo}`;
  return "";
}

// ─── Add-Method Dialog ────────────────────────────────────────────────────────

interface AddMethodDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (method: Omit<SavedMethod, "id" | "createdAt">) => void;
  isSaving: boolean;
}

function AddMethodDialog({ open, onOpenChange, onSave, isSaving }: AddMethodDialogProps) {
  const [type, setType] = useState<PaymentMethod | "">("");
  const [mpesa, setMpesa] = useState<MpesaConfig>({ phoneNumber: "", accountName: "" });
  const [card, setCard] = useState<CardConfig>({
    cardholderName: "", last4: "", brand: "visa",
    expiryMonth: "", expiryYear: "", autopayEnabled: false,
  });
  const [bank, setBank] = useState<BankConfig>({
    bankName: "", accountName: "", accountNumber: "", branchCode: "", swiftCode: "",
  });
  const [cheque, setCheque] = useState<ChequeConfig>({ payableTo: "", deliveryAddress: "" });
  const [nickname, setNickname] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const reset = () => {
    setType(""); setNickname(""); setIsDefault(false);
    setMpesa({ phoneNumber: "", accountName: "" });
    setCard({ cardholderName: "", last4: "", brand: "visa", expiryMonth: "", expiryYear: "", autopayEnabled: false });
    setBank({ bankName: "", accountName: "", accountNumber: "", branchCode: "", swiftCode: "" });
    setCheque({ payableTo: "", deliveryAddress: "" });
  };

  const handleSave = () => {
    if (!type) { toast.error("Please select a payment method type"); return; }
    const base = { type: type as PaymentMethod, isDefault, nickname };
    if (type === "mpesa") {
      if (!mpesa.phoneNumber) { toast.error("Phone number is required"); return; }
      onSave({ ...base, mpesa });
    } else if (type === "card") {
      if (!card.last4 || card.last4.length !== 4) { toast.error("Enter the last 4 digits of the card"); return; }
      if (!card.cardholderName) { toast.error("Cardholder name is required"); return; }
      onSave({ ...base, card });
    } else if (type === "bank") {
      if (!bank.bankName || !bank.accountNumber) { toast.error("Bank name and account number are required"); return; }
      onSave({ ...base, bank });
    } else if (type === "cheque") {
      if (!cheque.payableTo) { toast.error("Payable To is required"); return; }
      onSave({ ...base, cheque });
    }
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>Choose a payment method type and enter the details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <Label>Payment Method Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="card">Visa / Mastercard</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nickname */}
          {type && (
            <div className="space-y-1.5">
              <Label>Nickname (optional)</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Main Business Account" />
            </div>
          )}

          {/* M-Pesa fields */}
          {type === "mpesa" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>M-Pesa Phone Number</Label>
                <Input value={mpesa.phoneNumber} onChange={(e) => setMpesa((p) => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="+254 7XX XXX XXX" />
              </div>
              <div className="space-y-1.5">
                <Label>Account Name</Label>
                <Input value={mpesa.accountName} onChange={(e) => setMpesa((p) => ({ ...p, accountName: e.target.value }))}
                  placeholder="Name on M-Pesa account" />
              </div>
            </div>
          )}

          {/* Card fields */}
          {type === "card" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Card Brand</Label>
                <Select value={card.brand} onValueChange={(v) => setCard((c) => ({ ...c, brand: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cardholder Name</Label>
                <Input value={card.cardholderName} onChange={(e) => setCard((c) => ({ ...c, cardholderName: e.target.value }))}
                  placeholder="Exactly as on card" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1.5">
                  <Label>Last 4 Digits</Label>
                  <Input maxLength={4} value={card.last4}
                    onChange={(e) => setCard((c) => ({ ...c, last4: e.target.value.replace(/\D/g, "") }))}
                    placeholder="1234" />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry MM</Label>
                  <Input maxLength={2} value={card.expiryMonth}
                    onChange={(e) => setCard((c) => ({ ...c, expiryMonth: e.target.value.replace(/\D/g, "") }))}
                    placeholder="MM" />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry YY</Label>
                  <Input maxLength={2} value={card.expiryYear}
                    onChange={(e) => setCard((c) => ({ ...c, expiryYear: e.target.value.replace(/\D/g, "") }))}
                    placeholder="YY" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-600/10 p-3">
                <div>
                  <p className="text-sm font-medium text-white/90">Enable Autopayment</p>
                  <p className="text-xs text-white/50">Automatically charge this card for upcoming invoices when set as default.</p>
                </div>
                <Switch checked={card.autopayEnabled}
                  onCheckedChange={(v) => setCard((c) => ({ ...c, autopayEnabled: v }))} />
              </div>
            </div>
          )}

          {/* Bank fields */}
          {type === "bank" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input value={bank.bankName} onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))}
                  placeholder="e.g. KCB, Equity, NCBA" />
              </div>
              <div className="space-y-1.5">
                <Label>Account Name</Label>
                <Input value={bank.accountName} onChange={(e) => setBank((b) => ({ ...b, accountName: e.target.value }))}
                  placeholder="Account holder name" />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input value={bank.accountNumber} onChange={(e) => setBank((b) => ({ ...b, accountNumber: e.target.value }))}
                  placeholder="1234567890" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Branch Code</Label>
                  <Input value={bank.branchCode} onChange={(e) => setBank((b) => ({ ...b, branchCode: e.target.value }))}
                    placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>SWIFT / BIC</Label>
                  <Input value={bank.swiftCode} onChange={(e) => setBank((b) => ({ ...b, swiftCode: e.target.value }))}
                    placeholder="Optional" />
                </div>
              </div>
            </div>
          )}

          {/* Cheque fields */}
          {type === "cheque" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Payable To</Label>
                <Input value={cheque.payableTo} onChange={(e) => setCheque((c) => ({ ...c, payableTo: e.target.value }))}
                  placeholder="Name on cheque" />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Address</Label>
                <Input value={cheque.deliveryAddress} onChange={(e) => setCheque((c) => ({ ...c, deliveryAddress: e.target.value }))}
                  placeholder="Address to mail cheques" />
              </div>
            </div>
          )}

          {/* Set as default */}
          {type && (
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-sm text-white/80">Set as default payment method</p>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !type}>
            {isSaving ? "Saving…" : "Add Method"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrgBilling() {
  const { user } = useAuth();
  const { data: myOrgData, refetch } = trpc.multiTenancy.getMyOrg.useQuery(undefined, {
    enabled: !!user?.organizationId,
  });
  const org = myOrgData?.organization as any;

  const [methods, setMethods] = useState<SavedMethod[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  // Load saved methods from org settings
  useEffect(() => {
    if (org?.settings?.paymentMethods) {
      setMethods(org.settings.paymentMethods);
    }
  }, [org]);

  const updateMutation = trpc.multiTenancy.saveOrgPaymentMethods.useMutation({
    onSuccess: () => {
      toast.success("Payment methods updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const persistMethods = (updated: SavedMethod[]) => {
    setMethods(updated);
    updateMutation.mutate({ paymentMethods: updated });
  };

  const handleAdd = (newMethod: Omit<SavedMethod, "id" | "createdAt">) => {
    const id = `pm_${Date.now()}_${crypto.randomUUID().slice(0, 7)}`;
    const entry: SavedMethod = { ...newMethod, id, createdAt: new Date().toISOString() };
    let updated: SavedMethod[];
    if (entry.isDefault) {
      updated = [...methods.map((m) => ({ ...m, isDefault: false })), entry];
    } else {
      updated = [...methods, entry];
    }
    persistMethods(updated);
    setAddOpen(false);
  };

  const handleSetDefault = (id: string) => {
    persistMethods(methods.map((m) => ({ ...m, isDefault: m.id === id })));
  };

  const handleRemove = (id: string) => {
    persistMethods(methods.filter((m) => m.id !== id));
  };

  const handleToggleAutopay = (id: string, enabled: boolean) => {
    persistMethods(
      methods.map((m) =>
        m.id === id && m.card ? { ...m, card: { ...m.card, autopayEnabled: enabled } } : m
      )
    );
  };

  // Access guard
  if (user?.role !== "super_admin" && user?.role !== "admin") {
    return (
      <OrgLayout title="Billing & Payments">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldOff className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-sm">Only organization administrators can manage payment methods.</p>
        </div>
      </OrgLayout>
    );
  }

  const defaultMethod = methods.find((m) => m.isDefault);

  return (
    <OrgLayout title="Billing & Payments" description="Manage your organization's payment methods">
      <div className="space-y-6 max-w-3xl">

        {/* Current Subscription */}
        <Card className="border-blue-500/20 bg-blue-600/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Current Subscription</CardTitle>
            <CardDescription>Your active plan and billing status</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-white/50">Plan</p>
              <p className="font-semibold text-white capitalize mt-0.5">{org?.plan || "Starter"}</p>
            </div>
            <div>
              <p className="text-white/50">Status</p>
              <p className="mt-0.5">
                {org?.isActive
                  ? <span className="text-green-400 font-semibold">Active</span>
                  : <span className="text-red-400 font-semibold">Inactive</span>}
              </p>
            </div>
            <div>
              <p className="text-white/50">Default Method</p>
              <p className="font-semibold text-white mt-0.5">
                {defaultMethod ? methodLabel(defaultMethod.type) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Autopayment notice */}
        {defaultMethod?.type === "card" && defaultMethod.card?.autopayEnabled && (
          <div className="flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-600/10 p-4">
            <Zap className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-300">Autopayment Enabled</p>
              <p className="text-sm text-white/60 mt-0.5">
                Subscription invoices will be charged automatically to your{" "}
                {defaultMethod.card.brand.toUpperCase()} •••• {defaultMethod.card.last4}.
              </p>
            </div>
          </div>
        )}

        {/* Payment Methods List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Saved Payment Methods</h3>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Method
            </Button>
          </div>

          {methods.length === 0 && (
            <Card className="border-dashed border-white/10 bg-white/3">
              <CardContent className="py-12 text-center text-white/40">
                <CreditCard className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm">No payment methods added yet.</p>
                <p className="text-xs mt-1">Add M-Pesa, a bank account, or a card to get started.</p>
              </CardContent>
            </Card>
          )}

          {methods.map((m) => (
            <Card key={m.id} className={`border-white/10 bg-white/5 ${m.isDefault ? "ring-1 ring-blue-500/40" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 flex-shrink-0">
                    {methodIcon(m.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{methodLabel(m.type)}</span>
                      {m.nickname && <span className="text-xs text-white/40">· {m.nickname}</span>}
                      {m.isDefault && (
                        <Badge className="border-blue-500/20 bg-blue-600/20 text-blue-300 border text-xs gap-1">
                          <Star className="h-3 w-3" /> Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{methodSummary(m)}</p>

                    {/* Autopay toggle for cards */}
                    {m.type === "card" && m.card && m.isDefault && (
                      <div className="flex items-center gap-2 mt-3 rounded-md border border-white/10 bg-white/5 p-2">
                        <Zap className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                        <span className="text-xs text-white/70 flex-1">Autopayment</span>
                        <Switch
                          checked={m.card.autopayEnabled}
                          onCheckedChange={(v) => handleToggleAutopay(m.id, v)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {!m.isDefault && (
                      <Button size="sm" variant="outline" className="text-xs border-white/10 h-7 px-2"
                        onClick={() => handleSetDefault(m.id)}>
                        Set Default
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-xs text-red-400 hover:text-red-300 hover:bg-red-600/10 h-7 px-2"
                      onClick={() => handleRemove(m.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-white/50">
              <p className="font-medium text-white/70 mb-1">Payment & Security</p>
              <p>Card numbers are never stored in full — only the last 4 digits and cardholder name are saved for reference.
                Autopayment for cards enables Nexus360 to charge your subscription invoices automatically on the due date.
                M-Pesa and bank transfer payments require manual confirmation via STK push or bank notification.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddMethodDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
        isSaving={updateMutation.isPending}
      />
    </OrgLayout>
  );
}
