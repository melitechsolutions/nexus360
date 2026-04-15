import React, { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ShieldOff, Plus, Save, Layers, DollarSign, Users, Edit2, X,
  CheckCircle2, Trash2, Check, Minus, LayoutGrid, TableProperties,
} from "lucide-react";

// ─── Module list (mirrors ORG_MODULES on server) ─────────────────────────────

const ORG_MODULES = [
  { key: "crm", label: "CRM" },
  { key: "projects", label: "Projects & Tasks" },
  { key: "hr", label: "HR Management" },
  { key: "payroll", label: "Payroll" },
  { key: "leave", label: "Leave Management" },
  { key: "attendance", label: "Attendance" },
  { key: "invoicing", label: "Invoicing & Billing" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "procurement", label: "Procurement" },
  { key: "accounting", label: "Accounting" },
  { key: "budgets", label: "Budgets" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "ai_hub", label: "AI Hub" },
  { key: "communications", label: "Communications" },
  { key: "tickets", label: "Support Tickets" },
  { key: "contracts", label: "Contracts & Assets" },
  { key: "work_orders", label: "Work Orders" },
];

const PLAN_ORDER = ["trial", "starter", "professional", "enterprise", "custom"];

function planBadgeClass(key: string) {
  switch (key) {
    case "trial": return "border-gray-500/40 bg-gray-500/10 text-gray-700 dark:text-gray-400";
    case "starter": return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "professional": return "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "enterprise": return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    default: return "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400";
  }
}

function planHeaderColor(key: string) {
  switch (key) {
    case "trial": return "from-gray-200/60 to-gray-100/30 dark:from-gray-600/30 dark:to-gray-700/10 border-gray-400/30 dark:border-gray-500/30";
    case "starter": return "from-blue-200/60 to-blue-100/30 dark:from-blue-600/30 dark:to-blue-700/10 border-blue-400/30 dark:border-blue-500/30";
    case "professional": return "from-purple-200/60 to-purple-100/30 dark:from-purple-600/30 dark:to-purple-700/10 border-purple-400/30 dark:border-purple-500/30";
    case "enterprise": return "from-amber-200/60 to-amber-100/30 dark:from-amber-600/30 dark:to-amber-700/10 border-amber-400/30 dark:border-amber-500/30";
    default: return "from-green-200/60 to-green-100/30 dark:from-green-600/30 dark:to-green-700/10 border-green-400/30 dark:border-green-500/30";
  }
}

// ─── Create Tier Dialog ───────────────────────────────────────────────────────

interface CreateTierDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

function CreateTierDialog({ open, onOpenChange, onCreated }: CreateTierDialogProps) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyKes, setMonthlyKes] = useState(0);
  const [annualKes, setAnnualKes] = useState(0);
  const [maxUsers, setMaxUsers] = useState(10);
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(ORG_MODULES.map((m) => [m.key, false]))
  );

  const createMutation = trpc.multiTenancy.createPricingTier.useMutation({
    onSuccess: () => {
      toast.success("Pricing tier created", { description: `Tier "${label}" has been added.` });
      onCreated();
      onOpenChange(false);
      reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const reset = () => {
    setKey(""); setLabel(""); setDescription("");
    setMonthlyKes(0); setAnnualKes(0); setMaxUsers(10);
    setFeatures(Object.fromEntries(ORG_MODULES.map((m) => [m.key, false])));
  };

  const handleCreate = () => {
    if (!key || !label) { toast.error("Tier key and label are required"); return; }
    if (!/^[a-z0-9_]+$/.test(key)) { toast.error("Key must be lowercase letters, numbers, underscores only"); return; }
    createMutation.mutate({ key, label, description, monthlyKes, annualKes, maxUsers, features });
  };

  const toggleAll = (enabled: boolean) => {
    setFeatures(Object.fromEntries(ORG_MODULES.map((m) => [m.key, enabled])));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Pricing Tier</DialogTitle>
          <DialogDescription>Define a new plan with pricing and module access.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tier Key <span className="text-red-400">*</span></Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="e.g. growth_plan"
              />
              <p className="text-xs text-muted-foreground">lowercase, underscores only</p>
            </div>
            <div className="space-y-1.5">
              <Label>Display Label <span className="text-red-400">*</span></Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Growth Plan" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this plan" rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Monthly Price (KES)</Label>
              <Input type="number" min={0} value={monthlyKes} onChange={(e) => {
                const val = Number(e.target.value);
                setMonthlyKes(val);
                // Auto-calculate annual: 10 months (2 months free / ~17% discount)
                if (val > 0) setAnnualKes(Math.round(val * 10));
              }} />
            </div>
            <div className="space-y-1.5">
              <Label>Annual Price (KES) <span className="text-xs text-muted-foreground ml-1">auto: 10× monthly</span></Label>
              <Input type="number" min={0} value={annualKes} onChange={(e) => setAnnualKes(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Users</Label>
              <Input type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Included Modules</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(true)}>All</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(false)}>None</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ORG_MODULES.map((mod) => (
                <div key={mod.key} className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                  <span className="text-sm text-foreground/80">{mod.label}</span>
                  <Switch checked={features[mod.key] ?? false} onCheckedChange={(v) => setFeatures((f) => ({ ...f, [mod.key]: v }))} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            <X className="mr-2 h-4 w-4" />Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Creating…" : "Create Tier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Tier Dialog (full: name, description, pricing, features) ────────────

interface EditTierDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tierKey: string;
  tierLabel: string;
  priceData: PriceEntry;
  currentFeatures: Record<string, boolean>;
  onSaved: () => void;
}

function EditTierDialog({ open, onOpenChange, tierKey, tierLabel, priceData, currentFeatures, onSaved }: EditTierDialogProps) {
  const [label, setLabel] = useState(tierLabel);
  const [description, setDescription] = useState(priceData.description);
  const [monthlyKes, setMonthlyKes] = useState(priceData.monthlyKes);
  const [annualKes, setAnnualKes] = useState(priceData.annualKes);
  const [maxUsers, setMaxUsers] = useState(priceData.maxUsers);
  const [features, setFeatures] = useState<Record<string, boolean>>(currentFeatures);

  React.useEffect(() => {
    if (open) {
      setLabel(tierLabel);
      setDescription(priceData.description);
      setMonthlyKes(priceData.monthlyKes);
      setAnnualKes(priceData.annualKes);
      setMaxUsers(priceData.maxUsers);
      setFeatures(currentFeatures);
    }
  }, [open, tierKey, tierLabel, priceData, currentFeatures]);

  const updateMutation = trpc.multiTenancy.updatePricingTier.useMutation({
    onSuccess: () => {
      toast.success("Tier updated", { description: `"${label}" has been saved.` });
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleAll = (enabled: boolean) => {
    setFeatures(Object.fromEntries(ORG_MODULES.map((m) => [m.key, enabled])));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tier — {tierLabel}</DialogTitle>
          <DialogDescription>Modify pricing, limits, and module access for this plan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tier Key</Label>
              <Input value={tierKey} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Cannot be changed after creation</p>
            </div>
            <div className="space-y-1.5">
              <Label>Display Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Monthly Price (KES)</Label>
              <Input type="number" min={0} value={monthlyKes} onChange={(e) => {
                const val = Number(e.target.value);
                setMonthlyKes(val);
                if (val > 0) setAnnualKes(Math.round(val * 10));
              }} />
            </div>
            <div className="space-y-1.5">
              <Label>Annual Price (KES) <span className="text-xs text-muted-foreground ml-1">auto: 10× monthly</span></Label>
              <Input type="number" min={0} value={annualKes} onChange={(e) => setAnnualKes(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Users</Label>
              <Input type="number" min={0} value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Included Modules</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(true)}>All</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleAll(false)}>None</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ORG_MODULES.map((mod) => (
                <div key={mod.key} className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
                  <span className="text-sm text-foreground/80">{mod.label}</span>
                  <Switch checked={features[mod.key] ?? false} onCheckedChange={(v) => setFeatures((f) => ({ ...f, [mod.key]: v }))} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => updateMutation.mutate({ key: tierKey, label, description, monthlyKes, annualKes, maxUsers, features })}
            disabled={updateMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

interface DeleteTierDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tierKey: string;
  tierLabel: string;
  onDeleted: () => void;
}

function DeleteTierDialog({ open, onOpenChange, tierKey, tierLabel, onDeleted }: DeleteTierDialogProps) {
  const deleteMutation = trpc.multiTenancy.deletePricingTier.useMutation({
    onSuccess: () => {
      toast.success("Tier deleted", { description: `"${tierLabel}" has been removed.` });
      onDeleted();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Pricing Tier</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete the <strong>{tierLabel}</strong> tier?
            This will remove all associated pricing and module configurations.
            Organizations currently on this tier will not be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate({ key: tierKey })}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMutation.isPending ? "Deleting…" : "Delete Tier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Comparison Table (auto-generated) ────────────────────────────────────────

interface ComparisonTableProps {
  planKeys: string[];
  prices: Record<string, PriceEntry>;
  tierFeatures: Record<string, Record<string, boolean>>;
}

function ComparisonTable({ planKeys, prices, tierFeatures }: ComparisonTableProps) {
  if (planKeys.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="min-w-[180px] font-semibold sticky left-0 bg-muted/50 z-10">Feature / Plan</TableHead>
            {planKeys.map((key) => (
              <TableHead key={key} className="text-center min-w-[150px]">
                <div className={`inline-flex flex-col items-center gap-1 rounded-lg px-3 py-2 bg-gradient-to-b ${planHeaderColor(key)}`}>
                  <span className="font-bold text-sm capitalize">{prices[key]?.label || key}</span>
                  <Badge variant="outline" className={`text-[10px] ${planBadgeClass(key)}`}>{key}</Badge>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Pricing rows */}
          <TableRow className="bg-muted/20 font-medium">
            <TableCell className="sticky left-0 bg-muted/20 z-10">
              <span className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />Monthly Price (KES)</span>
            </TableCell>
            {planKeys.map((key) => (
              <TableCell key={key} className="text-center font-semibold">
                {(prices[key]?.monthlyKes || 0) === 0 ? <span className="text-muted-foreground">Free</span> : `KES ${(prices[key]?.monthlyKes || 0).toLocaleString()}`}
              </TableCell>
            ))}
          </TableRow>
          <TableRow className="bg-muted/20 font-medium">
            <TableCell className="sticky left-0 bg-muted/20 z-10">
              <span className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />Annual Price (KES)</span>
            </TableCell>
            {planKeys.map((key) => (
              <TableCell key={key} className="text-center font-semibold">
                {(prices[key]?.annualKes || 0) === 0 ? <span className="text-muted-foreground">Free</span> : `KES ${(prices[key]?.annualKes || 0).toLocaleString()}`}
              </TableCell>
            ))}
          </TableRow>
          <TableRow className="bg-muted/20 font-medium">
            <TableCell className="sticky left-0 bg-muted/20 z-10">
              <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />Max Users</span>
            </TableCell>
            {planKeys.map((key) => (
              <TableCell key={key} className="text-center font-semibold">
                {(prices[key]?.maxUsers || 0) === 0 ? "Unlimited" : prices[key]?.maxUsers?.toLocaleString()}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell colSpan={planKeys.length + 1} className="py-1 px-0">
              <Separator />
            </TableCell>
          </TableRow>
          {/* Module rows */}
          {ORG_MODULES.map((mod) => (
            <TableRow key={mod.key} className="hover:bg-muted/30">
              <TableCell className="sticky left-0 bg-background z-10">
                <span className="text-sm">{mod.label}</span>
              </TableCell>
              {planKeys.map((planKey) => {
                const enabled = tierFeatures[planKey]?.[mod.key] ?? false;
                return (
                  <TableCell key={planKey} className="text-center">
                    {enabled ? (
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {/* Total modules row */}
          <TableRow className="bg-muted/30 font-medium border-t-2">
            <TableCell className="sticky left-0 bg-muted/30 z-10">
              <span className="flex items-center gap-2"><Layers className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />Total Modules</span>
            </TableCell>
            {planKeys.map((planKey) => {
              const count = ORG_MODULES.filter((m) => tierFeatures[planKey]?.[m.key]).length;
              return (
                <TableCell key={planKey} className="text-center font-bold">
                  {count} / {ORG_MODULES.length}
                </TableCell>
              );
            })}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Plan Price Card ──────────────────────────────────────────────────────────

interface PlanCardProps {
  planKey: string;
  priceData: PriceEntry;
  features: Record<string, boolean>;
  onEdit: (key: string) => void;
  onDelete: (key: string) => void;
}

function PlanCard({ planKey, priceData, features, onEdit, onDelete }: PlanCardProps) {
  const enabledCount = Object.values(features).filter(Boolean).length;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base capitalize">
                {priceData.label || planKey}
              </CardTitle>
              <Badge variant="outline" className={`text-xs ${planBadgeClass(planKey)}`}>
                {planKey}
              </Badge>
            </div>
            <CardDescription className="text-xs">{priceData.description}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(planKey)}
            >
              <Edit2 className="h-3 w-3" />Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-destructive hover:text-red-400"
              onClick={() => onDelete(planKey)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />Monthly (KES)
            </p>
            <p className="text-lg font-bold">
              {priceData.monthlyKes === 0 ? <span className="text-muted-foreground text-base">Free</span> : `KES ${priceData.monthlyKes.toLocaleString()}`}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />Annual (KES)
            </p>
            <p className="text-lg font-bold">
              {priceData.annualKes === 0 ? <span className="text-muted-foreground text-base">Free</span> : `KES ${priceData.annualKes.toLocaleString()}`}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />Max Users
            </p>
            <p className="text-lg font-bold">
              {priceData.maxUsers === 0 ? "Unlimited" : priceData.maxUsers.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Module chips */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Modules ({enabledCount}/{ORG_MODULES.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {ORG_MODULES.map((mod) => (
              <span
                key={mod.key}
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  features[mod.key]
                    ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {mod.label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PriceEntry = { monthlyKes: number; annualKes: number; maxUsers: number; description: string; label?: string };

export default function SuperAdminPricingTiers() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTierKey, setEditTierKey] = useState<string | null>(null);
  const [deleteTierKey, setDeleteTierKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "comparison">("cards");

  // Access guard
  if (user && (user.role !== "super_admin" || (user as any).organizationId)) {
    return (
      <ModuleLayout
        title="Pricing Tiers"
        description="Manage subscription plans and modules"
        icon={<DollarSign className="h-6 w-6" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Pricing Tiers" },
        ]}
      >
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldOff className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground max-w-sm">
            Only global administrators can manage pricing tiers.
          </p>
        </div>
      </ModuleLayout>
    );
  }

  const { data: priceData, isLoading: pricesLoading, refetch: refetchPrices } =
    trpc.multiTenancy.getPlanPrices.useQuery();

  const { data: featuresData, isLoading: featuresLoading, refetch: refetchFeatures } =
    trpc.multiTenancy.getAllPricingTierFeatures.useQuery();

  const prices: Record<string, PriceEntry> = (priceData?.prices as any) ?? {};
  const tierFeatures: Record<string, Record<string, boolean>> = (featuresData?.tiers as any) ?? {};

  // Ordered plan keys: known plans first, then any custom tiers — all sorted by price ascending
  const knownKeys = PLAN_ORDER.filter((k) => Boolean(prices[k]));
  const customKeys = Object.keys(prices).filter((k) => !PLAN_ORDER.includes(k));
  const allKeys = [...knownKeys, ...customKeys];
  // Auto-sort by monthly price ascending (free/trial at top, enterprise at bottom)
  const planKeys = allKeys.sort((a, b) => {
    const priceA = Number(prices[a]?.monthlyKes ?? 0);
    const priceB = Number(prices[b]?.monthlyKes ?? 0);
    return priceA - priceB;
  });

  const refetchAll = () => { refetchPrices(); refetchFeatures(); };

  const isLoading = pricesLoading || featuresLoading;

  const editingTier = editTierKey
    ? {
        key: editTierKey,
        label: prices[editTierKey]?.label || editTierKey,
        priceData: prices[editTierKey] || { monthlyKes: 0, annualKes: 0, maxUsers: 10, description: "" },
        features: tierFeatures[editTierKey] ?? {},
      }
    : null;

  const deletingTier = deleteTierKey
    ? { key: deleteTierKey, label: prices[deleteTierKey]?.label || deleteTierKey }
    : null;

  return (
    <ModuleLayout
      title="Pricing Tiers"
      description="Manage subscription plans, pricing, and included modules for all organizations"
      icon={<DollarSign className="h-6 w-6" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Pricing Tiers" },
      ]}
    >
      <div className="space-y-6">

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />Cards
            </Button>
            <Button
              variant={viewMode === "comparison" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("comparison")}
            >
              <TableProperties className="mr-2 h-4 w-4" />Comparison Table
            </Button>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />New Tier
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <div className="rounded-lg bg-blue-600/10 border border-blue-500/20 p-2">
                <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{planKeys.length}</p>
                <p className="text-xs text-muted-foreground">Total Tiers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <div className="rounded-lg bg-green-600/10 border border-green-500/20 p-2">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">KES {(prices["professional"]?.monthlyKes || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Professional / month</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <div className="rounded-lg bg-purple-600/10 border border-purple-500/20 p-2">
                <CheckCircle2 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ORG_MODULES.length}</p>
                <p className="text-xs text-muted-foreground">Available Modules</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : planKeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No pricing tiers found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click "New Tier" to create your first pricing plan.
              </p>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Create First Tier
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "cards" ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {planKeys.map((key) => (
                <PlanCard
                  key={key}
                  planKey={key}
                  priceData={prices[key]}
                  features={tierFeatures[key] ?? {}}
                  onEdit={setEditTierKey}
                  onDelete={setDeleteTierKey}
                />
              ))}
            </div>

            {/* Auto-generated comparison table always shown below cards */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TableProperties className="h-5 w-5 text-muted-foreground" />
                Plan Comparison
              </h3>
              <ComparisonTable planKeys={planKeys} prices={prices} tierFeatures={tierFeatures} />
            </div>
          </>
        ) : (
          <ComparisonTable planKeys={planKeys} prices={prices} tierFeatures={tierFeatures} />
        )}
      </div>

      {/* Dialogs */}
      <CreateTierDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refetchAll}
      />

      {editingTier && (
        <EditTierDialog
          open={!!editTierKey}
          onOpenChange={(v) => { if (!v) setEditTierKey(null); }}
          tierKey={editingTier.key}
          tierLabel={editingTier.label}
          priceData={editingTier.priceData}
          currentFeatures={editingTier.features}
          onSaved={() => { refetchAll(); setEditTierKey(null); }}
        />
      )}

      {deletingTier && (
        <DeleteTierDialog
          open={!!deleteTierKey}
          onOpenChange={(v) => { if (!v) setDeleteTierKey(null); }}
          tierKey={deletingTier.key}
          tierLabel={deletingTier.label}
          onDeleted={() => { refetchAll(); setDeleteTierKey(null); }}
        />
      )}
    </ModuleLayout>
  );
}
