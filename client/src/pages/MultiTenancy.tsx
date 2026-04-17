/**
 * Multi-Tenancy Management Page
 * Melitech super-admins can create/edit/delete organizations (tenants),
 * toggle per-org module availability, assign users to organizations,
 * manage pricing tiers, view tenant admins list, and send tenant communications.
 */
import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ModuleLayout } from "@/components/ModuleLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Building2, Shield, User, Users, UserPlus, Crown, Plus, Pencil, Trash2,
  Search, RefreshCw, Loader2, CheckCircle2, XCircle, ToggleRight, ToggleLeft,
  CreditCard, LayoutGrid, MessageSquare, Send, Eye, Mail, AlertCircle, Archive, RotateCcw,
} from "lucide-react";
import { CountrySelect } from "@/components/LocationSelects";
import { PhoneInput } from "@/components/PhoneInput";
import { format, parseISO } from "date-fns";
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from "@/components/ui/table";

// ─── helpers ────────────────────────────────────────────────────────────────
const DEFAULT_PLAN_OPTIONS = ["trial", "starter", "professional", "enterprise", "custom"] as const;
const PLAN_COLORS: Record<string, string> = {
  trial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  professional: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  enterprise: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  custom: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

function planBadge(plan: string) {
  const cls = PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{plan}</span>;
}

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fmt(dt: string | null | undefined) {
  if (!dt) return "\u2014";
  try { return format(parseISO(dt), "d MMM yyyy"); } catch { return dt.slice(0, 10); }
}

function fmtFull(dt: string | Date | null | undefined) {
  if (!dt) return "\u2014";
  const s = dt instanceof Date ? dt.toISOString() : dt;
  try { return format(parseISO(s), "d MMM yyyy, h:mm a"); } catch { return s.slice(0, 16).replace("T", " "); }
}

function formatPlanName(planKey: string, prices: Record<string, any>) {
  return prices[planKey]?.label || planKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Form defaults ───────────────────────────────────────────────────────────
const BLANK_FORM = {
  name: "", slug: "", plan: "trial",
  maxUsers: 5, contactEmail: "", contactPhone: "",
  domain: "", country: "", address: "",
  industry: "", website: "", taxId: "", billingEmail: "",
  timezone: "Africa/Nairobi", currency: "KES",
  description: "", employeeCount: "" as string | number,
  registrationNumber: "", paymentMethod: "",
  adminMode: "create" as "create" | "assign",
  adminName: "", adminEmail: "", adminPassword: "",
  existingUserId: "",
};
type OrgForm = typeof BLANK_FORM;

const BLANK_MESSAGE = {
  subject: "", content: "", priority: "normal", type: "announcement",
  targetType: "all_admins", targetOrgId: "", targetUserId: "",
};

// ── Branding Panel ──────────────────────────────────────────────────────────
function BrandingPanel({ orgId }: { orgId: string }) {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#10b981");
  const [customDomain, setCustomDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loaded, setLoaded] = useState(false);

  const whiteLabelQuery = trpc.multiTenancy.getWhiteLabelConfig.useQuery(
    { tenantId: orgId },
    { enabled: !!orgId }
  );
  useEffect(() => {
    const data: any = whiteLabelQuery.data;
    if (!loaded && data?.whiteLabel) {
      setPrimaryColor(data.whiteLabel.primaryColor || "#3b82f6");
      setSecondaryColor(data.whiteLabel.secondaryColor || "#10b981");
      setCustomDomain(data.whiteLabel.customDomain || "");
      setLogoUrl(data.whiteLabel.logo || data.logoUrl || "");
      setLoaded(true);
    }
  }, [whiteLabelQuery.data]);

  const saveBranding = trpc.multiTenancy.configureWhiteLabelOptions.useMutation({
    onSuccess: () => {
      toast.success("Branding saved successfully");
      whiteLabelQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSave = () => {
    saveBranding.mutate({
      tenantId: orgId,
      branding: {
        logo: logoUrl || undefined,
        colors: { primary: primaryColor, secondary: secondaryColor },
        customDomain: customDomain || undefined,
      },
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Configure white-label branding for this organization.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Primary Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" title="Primary color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
            <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Secondary Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" title="Secondary color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
            <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="flex-1" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Logo URL</Label>
          <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Custom Domain</Label>
          <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="crm.clientdomain.com" />
          <p className="mt-1 text-xs text-muted-foreground">The organization will access the platform via this domain.</p>
        </div>
      </div>
      {primaryColor && (
        <div className="flex gap-3 items-center pt-2">
          <div className="h-8 w-8 rounded" style={{ backgroundColor: primaryColor }} />
          <div className="h-8 w-8 rounded" style={{ backgroundColor: secondaryColor }} />
          <span className="text-xs text-muted-foreground">Color preview</span>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saveBranding.isPending}>
          {saveBranding.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Branding"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MultiTenancy() {
  const utils = trpc.useUtils();
  const [location] = useLocation();

  const tabFromPath = (p: string) =>
    p.includes("tenant-admins") ? "admins"
      : p.includes("pricing") ? "pricing"
        : p.includes("tenant-comms") ? "comms"
          : p.includes("tenant-users") ? "tenant-users"
            : "organizations";

  const [mainTab, setMainTab] = useState(() => tabFromPath(location));
  useEffect(() => { setMainTab(tabFromPath(location)); }, [location]);

  // ── List ─────────────────────────────────────────────────────────────────
  const { data: listData, isLoading: listLoading, refetch: refetchList } = trpc.multiTenancy.listOrganizations.useQuery();
  const orgs = listData?.organizations ?? [];
  const archivedQuery = trpc.multiTenancy.listOrganizations.useQuery({ includeArchived: true });
  const archivedOrgs = (archivedQuery.data?.organizations ?? []).filter((o: any) => o.isArchived);

  // ── Selected org detail ─────────────────────────────────────────────────
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const { data: orgDetail, isLoading: detailLoading } = trpc.multiTenancy.getOrganization.useQuery(
    { id: selectedOrgId! }, { enabled: !!selectedOrgId },
  );
  const { data: featuresData, isLoading: featuresLoading } = trpc.multiTenancy.getOrgFeatures.useQuery(
    { organizationId: selectedOrgId! }, { enabled: !!selectedOrgId },
  );
  const featureMap: Record<string, boolean> = (featuresData as any)?.features ?? {};
  const orgUsers: any[] = (trpc.multiTenancy.getOrgUsers.useQuery(
    { organizationId: selectedOrgId! }, { enabled: !!selectedOrgId },
  ).data as any)?.users ?? [];
  const allUsers: any[] = trpc.users.list.useQuery().data ?? [];

  // ── Pricing tier data ───────────────────────────────────────────────────
  const { data: allTierData, isLoading: tiersLoading } = trpc.multiTenancy.getAllPricingTierFeatures.useQuery();
  const tierMap: Record<string, Record<string, boolean>> = (allTierData as any)?.tiers ?? {};
  const { data: planPricesData } = trpc.multiTenancy.getPlanPrices.useQuery();
  const { data: tierDefaultsData } = trpc.multiTenancy.getTierDefaults.useQuery();
  const apiPrices = ((planPricesData as any)?.prices || {}) as Record<string, any>;
  const tierMaxUsers = useMemo(() => {
    const defaults = (tierDefaultsData as any)?.tierMaxUsers ?? { trial: 5, starter: 10, professional: 50, enterprise: 500, custom: 0 };
    // Build complete tierMaxUsers by reading directly from apiPrices for each available plan
    // This ensures custom tiers have their correct maxUsers values
    const result: Record<string, number> = {};
    
    // First add all defaults
    for (const [key, value] of Object.entries(defaults)) {
      result[key] = value;
    }
    
    // Then override with values from apiPrices (which includes custom tiers from database)
    for (const [key] of Object.entries(apiPrices)) {
      const tierData = apiPrices[key];
      if (tierData && typeof tierData === 'object' && typeof tierData.maxUsers === 'number') {
        result[key] = tierData.maxUsers;
      }
    }
    
    return result;
  }, [tierDefaultsData, apiPrices]);

  // ── Tenant admins ───────────────────────────────────────────────────────
  const { data: tenantAdminsData, isLoading: adminsLoading } = trpc.multiTenancy.listTenantAdmins.useQuery();
  const tenantAdmins: any[] = (tenantAdminsData as any)?.admins ?? [];

  // ── Tenant users (all org users across organizations) ────────────────────
  const [tenantUsersSearch, setTenantUsersSearch] = useState("");
  const [tenantUsersOrgFilter, setTenantUsersOrgFilter] = useState("");
  const [tenantUsersPage, setTenantUsersPage] = useState(1);
  const TENANT_USERS_PAGE_SIZE = 20;
  const { data: tenantUsersData, isLoading: tenantUsersLoading, refetch: refetchTenantUsers } =
    trpc.organizationUsers.list.useQuery(
      {
        search: tenantUsersSearch || undefined,
        organizationId: tenantUsersOrgFilter || undefined,
        limit: TENANT_USERS_PAGE_SIZE,
        offset: (tenantUsersPage - 1) * TENANT_USERS_PAGE_SIZE,
      },
      { staleTime: 30_000 },
    );
  const tenantUsersList: any[] = (tenantUsersData as any)?.users ?? [];
  const tenantUsersTotal: number = (tenantUsersData as any)?.total ?? 0;
  const tenantUsersTotalPages: number = Math.max(1, Math.ceil(tenantUsersTotal / TENANT_USERS_PAGE_SIZE));

  // ── Tenant messages ─────────────────────────────────────────────────────
  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = trpc.multiTenancy.getTenantMessages.useQuery({ limit: 100, offset: 0 });
  const messages: any[] = (messagesData as any)?.messages ?? [];

  // ── Tenant Communications (full CRUD) ──────────────────────────────────
  const { data: commsData, isLoading: commsLoading, refetch: refetchComms } = trpc.tenantCommunications.list.useQuery();
  const comms: any[] = commsData ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────
  const createOrgWithAdmin = trpc.multiTenancy.createOrganizationWithAdmin.useMutation({
    onSuccess: () => { toast.success("Organization created with super admin"); refetchList(); utils.multiTenancy.listTenantAdmins.invalidate(); setShowCreate(false); setForm({ ...BLANK_FORM }); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateOrg = trpc.multiTenancy.updateOrganization.useMutation({
    onSuccess: () => { toast.success("Organization updated"); refetchList(); utils.multiTenancy.getOrganization.invalidate(); setShowEdit(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteOrg = trpc.multiTenancy.deleteOrganization.useMutation({
    onSuccess: () => { toast.success("Organization deleted"); refetchList(); setToDelete(null); setSelectedOrgId(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const archiveOrg = trpc.multiTenancy.archiveOrganization.useMutation({
    onSuccess: () => { toast.success("Organization archived"); refetchList(); archivedQuery.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const restoreOrg = trpc.multiTenancy.restoreOrganization.useMutation({
    onSuccess: () => { toast.success("Organization restored"); refetchList(); archivedQuery.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const setFeature = trpc.multiTenancy.setOrgFeature.useMutation({
    onSuccess: () => { utils.multiTenancy.getOrgFeatures.invalidate(); utils.multiTenancy.listOrganizations.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkSetFeatures = trpc.multiTenancy.bulkSetOrgFeatures.useMutation({
    onSuccess: () => { toast.success("Features saved"); utils.multiTenancy.getOrgFeatures.invalidate(); utils.multiTenancy.listOrganizations.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const assignUser = trpc.multiTenancy.assignUserToOrg.useMutation({
    onSuccess: () => { toast.success("User assigned"); utils.multiTenancy.getOrgUsers.invalidate(); utils.multiTenancy.listOrganizations.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkSetTierFeatures = trpc.multiTenancy.bulkSetPricingTierFeatures.useMutation({
    onSuccess: () => { toast.success("Pricing tier features saved"); utils.multiTenancy.getAllPricingTierFeatures.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const seedTierFeatures = trpc.multiTenancy.seedDefaultTierFeatures.useMutation({
    onSuccess: (data: any) => { toast.success(`Seeded ${data.seeded} tier feature entries`); utils.multiTenancy.getAllPricingTierFeatures.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const applyTierToOrg = trpc.multiTenancy.applyTierToOrganization.useMutation({
    onSuccess: () => { toast.success("Tier features applied to organization"); utils.multiTenancy.getOrgFeatures.invalidate(); utils.multiTenancy.listOrganizations.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const sendMessage = trpc.multiTenancy.sendTenantMessage.useMutation({
    onSuccess: () => { toast.success("Message sent to tenant admins"); refetchMessages(); setMsgForm({ ...BLANK_MESSAGE }); setShowCompose(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const createComm = trpc.tenantCommunications.create.useMutation({
    onSuccess: () => { toast.success("Communication created"); refetchComms(); setShowCompose(false); setMsgForm({ ...BLANK_MESSAGE }); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateComm = trpc.tenantCommunications.update.useMutation({
    onSuccess: () => { toast.success("Communication updated"); refetchComms(); setShowEditComm(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteComm = trpc.tenantCommunications.delete.useMutation({
    onSuccess: () => { toast.success("Communication deleted"); refetchComms(); setCommToDelete(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const sendComm = trpc.tenantCommunications.send.useMutation({
    onSuccess: () => { toast.success("Communication sent"); refetchComms(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateOrgAdmin = trpc.multiTenancy.updateOrganizationAdmin.useMutation({
    onSuccess: () => { toast.success("Organization admin updated"); utils.multiTenancy.getOrganization.invalidate(); utils.multiTenancy.listTenantAdmins.invalidate(); refetchList(); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── UI state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [toDelete, setToDelete] = useState<any>(null);
  const [form, setForm] = useState<OrgForm>({ ...BLANK_FORM });
  const [assignUserId, setAssignUserId] = useState("");
  const [selectedTier, setSelectedTier] = useState("trial");
  const [showCompose, setShowCompose] = useState(false);
  const [msgForm, setMsgForm] = useState({ ...BLANK_MESSAGE });
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [showEditComm, setShowEditComm] = useState(false);
  const [editingComm, setEditingComm] = useState<any>(null);
  const [editCommForm, setEditCommForm] = useState({ subject: "", message: "", type: "announcement", priority: "normal", status: "draft", recipientType: "all_tenants" });
  const [commToDelete, setCommToDelete] = useState<any>(null);
  const [commStatusFilter, setCommStatusFilter] = useState("all");
  const [commSearch, setCommSearch] = useState("");
  const [editAdminMode, setEditAdminMode] = useState<"update" | "create" | "assign">("update");
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [editAssignUserId, setEditAssignUserId] = useState("");

  // populate edit form when org detail loads
  useEffect(() => {
    if (showEdit && (orgDetail as any)?.organization) {
      const o = (orgDetail as any).organization;
      setForm({
        name: o.name ?? "", slug: o.slug ?? "", plan: o.plan ?? "trial",
        maxUsers: o.maxUsers ?? 10, contactEmail: o.contactEmail ?? "",
        contactPhone: o.contactPhone ?? "", domain: o.domain ?? "",
        country: o.country ?? "", address: o.address ?? "",
        industry: o.industry ?? "", website: o.website ?? "",
        taxId: o.taxId ?? "", billingEmail: o.billingEmail ?? "",
        timezone: o.timezone ?? "Africa/Nairobi", currency: o.currency ?? "KES",
        description: o.description ?? "", employeeCount: o.employeeCount ?? "",
        registrationNumber: o.registrationNumber ?? "", paymentMethod: o.paymentMethod ?? "",
        adminMode: "create", adminName: "", adminEmail: "", adminPassword: "", existingUserId: "",
      });
      const users: any[] = (orgDetail as any)?.users || [];
      const superAdmin = users.find((u: any) => u.role === "super_admin");
      if (superAdmin) {
        setEditAdminMode("update");
        setEditAdminName(superAdmin.name || "");
        setEditAdminEmail(superAdmin.email || "");
      } else {
        setEditAdminMode("create");
        setEditAdminName("");
        setEditAdminEmail("");
      }
      setEditAdminPassword("");
      setEditAssignUserId("");
    }
  }, [showEdit, orgDetail]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const filtered = orgs.filter((o: any) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.includes(search.toLowerCase()),
  );
  const totalUsers = orgs.reduce((s: number, o: any) => s + (o.userCount ?? 0), 0);
  const activeCount = orgs.filter((o: any) => o.isActive).length;
  const moduleListData = trpc.multiTenancy.getModuleList.useQuery().data;
  const modules: any[] = (moduleListData as any)?.modules ?? [];
  const planOptions = useMemo(() => {
    const keys = Object.keys(apiPrices);
    return keys.length > 0 ? keys : [...DEFAULT_PLAN_OPTIONS];
  }, [apiPrices]);
  const tierDescriptions = useMemo(() => {
    const desc: Record<string, string> = {};
    for (const key of planOptions) {
      const p = apiPrices[key];
      const users = p?.maxUsers ? `Up to ${p.maxUsers} users.` : "Flexible user limits.";
      desc[key] = p?.description
        ? `${p.description}${p.description.endsWith(".") ? "" : "."} ${users}`
        : `${formatPlanName(key, apiPrices)} plan feature configuration.`;
    }
    return desc;
  }, [planOptions, apiPrices]);

  useEffect(() => {
    if (planOptions.length > 0 && !planOptions.includes(selectedTier)) {
      setSelectedTier(planOptions[0]);
    }
  }, [planOptions, selectedTier]);

  const currentTierFeatures: Record<string, boolean> = tierMap[selectedTier] ?? {};
  const filteredAdmins = useMemo(() => {
    if (!adminSearch) return tenantAdmins;
    const s = adminSearch.toLowerCase();
    return tenantAdmins.filter((a: any) =>
      a.name?.toLowerCase().includes(s) || a.email?.toLowerCase().includes(s) || a.organizationName?.toLowerCase().includes(s),
    );
  }, [tenantAdmins, adminSearch]);

  // ── Form helpers ────────────────────────────────────────────────────────
  function handleCreateSubmit() {
    createOrgWithAdmin.mutate({
      name: form.name, slug: form.slug, plan: form.plan,
      maxUsers: Number(form.maxUsers) || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      domain: form.domain || undefined,
      country: form.country || undefined,
      address: form.address || undefined,
      industry: form.industry || undefined,
      website: form.website || undefined,
      taxId: form.taxId || undefined,
      billingEmail: form.billingEmail || undefined,
      timezone: form.timezone || undefined,
      currency: form.currency || undefined,
      description: form.description || undefined,
      employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
      registrationNumber: form.registrationNumber || undefined,
      paymentMethod: form.paymentMethod || undefined,
      adminMode: form.adminMode,
      adminName: form.adminMode === "create" ? form.adminName || undefined : undefined,
      adminEmail: form.adminMode === "create" ? form.adminEmail || undefined : undefined,
      adminPassword: form.adminMode === "create" ? form.adminPassword || undefined : undefined,
      existingUserId: form.adminMode === "assign" ? form.existingUserId || undefined : undefined,
    } as any);
  }

  function handleEditSubmit() {
    if (!selectedOrgId) return;
    updateOrg.mutate({
      id: selectedOrgId, name: form.name, plan: form.plan,
      maxUsers: Number(form.maxUsers) || undefined,
      contactEmail: form.contactEmail || undefined,
      contactPhone: form.contactPhone || undefined,
      domain: form.domain || undefined,
      country: form.country || undefined,
      address: form.address || undefined,
      industry: form.industry || undefined,
      website: form.website || undefined,
      taxId: form.taxId || undefined,
      billingEmail: form.billingEmail || undefined,
      timezone: form.timezone || undefined,
      currency: form.currency || undefined,
      description: form.description || undefined,
      employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
      registrationNumber: form.registrationNumber || undefined,
      paymentMethod: form.paymentMethod || undefined,
    } as any);
    const users: any[] = (orgDetail as any)?.users || [];
    const superAdmin = users.find((u: any) => u.role === "super_admin");
    if (editAdminMode === "update" && superAdmin) {
      const hasChanges = (editAdminName && editAdminName !== superAdmin.name) ||
        (editAdminEmail && editAdminEmail !== superAdmin.email) ||
        editAdminPassword;
      if (hasChanges) {
        updateOrgAdmin.mutate({
          organizationId: selectedOrgId, mode: "update",
          adminUserId: superAdmin.id,
          adminName: editAdminName || undefined,
          adminEmail: editAdminEmail || undefined,
          adminPassword: editAdminPassword || undefined,
        } as any);
      }
    } else if (editAdminMode === "create" && editAdminName && editAdminEmail && editAdminPassword) {
      updateOrgAdmin.mutate({
        organizationId: selectedOrgId, mode: "create",
        adminName: editAdminName, adminEmail: editAdminEmail, adminPassword: editAdminPassword,
      } as any);
    } else if (editAdminMode === "assign" && editAssignUserId) {
      updateOrgAdmin.mutate({
        organizationId: selectedOrgId, mode: "assign",
        existingUserId: editAssignUserId,
      } as any);
    }
  }

  function handleToggleFeature(key: string, current: boolean) {
    if (!selectedOrgId) return;
    setFeature.mutate({ organizationId: selectedOrgId, featureKey: key, isEnabled: !current } as any);
  }

  function handleEnableAll(enable: boolean) {
    if (!selectedOrgId) return;
    const all: Record<string, boolean> = {};
    modules.forEach((m: any) => { all[m.key] = enable; });
    bulkSetFeatures.mutate({ organizationId: selectedOrgId, features: all } as any);
  }

  function handleAssignUser() {
    if (!assignUserId || !selectedOrgId) return;
    assignUser.mutate({ userId: assignUserId, organizationId: selectedOrgId } as any);
    setAssignUserId("");
  }

  function handleRemoveUser(userId: string) {
    assignUser.mutate({ userId, organizationId: null } as any);
  }

  function handleSaveTierFeatures(features: Record<string, boolean>) {
    const coerced = Object.fromEntries(Object.entries(features).map(([k, v]) => [k, Boolean(v)]));
    bulkSetTierFeatures.mutate({ tier: selectedTier, features: coerced } as any);
  }

  function handleApplyTier(orgId: string, tier: string) {
    applyTierToOrg.mutate({ organizationId: orgId, tier } as any);
  }

  function handleSendMessage() {
    sendMessage.mutate({
      subject: msgForm.subject, content: msgForm.content,
      priority: msgForm.priority, targetType: msgForm.targetType,
      targetOrgId: msgForm.targetOrgId || undefined,
      targetUserId: msgForm.targetUserId || undefined,
    } as any);
  }

  const createFormValid = form.name && form.slug &&
    (form.adminMode === "create"
      ? form.adminName && form.adminEmail && form.adminPassword && form.adminPassword.length >= 8
      : form.existingUserId);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ModuleLayout title="Multi-Tenancy Management" description="Manage organizations, pricing, admins, and communications">
      <div className="space-y-6">
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="organizations" className="gap-1.5"><Building2 className="h-4 w-4" /> Organizations</TabsTrigger>
            <TabsTrigger value="archived" className="gap-1.5"><Archive className="h-4 w-4" /> Archived{archivedOrgs.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{archivedOrgs.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1.5"><CreditCard className="h-4 w-4" /> Pricing Tiers</TabsTrigger>
            <TabsTrigger value="admins" className="gap-1.5"><Shield className="h-4 w-4" /> Tenant Admins</TabsTrigger>
            <TabsTrigger value="tenant-users" className="gap-1.5"><Users className="h-4 w-4" /> Tenant Users</TabsTrigger>
            <TabsTrigger value="comms" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Communications</TabsTrigger>
          </TabsList>

          {/* ═══ Organizations Tab ═══ */}
          <TabsContent value="organizations" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Organizations", value: orgs.length, icon: <Building2 className="h-5 w-5 text-muted-foreground" /> },
                { label: "Active", value: activeCount, icon: <CheckCircle2 className="h-5 w-5 text-green-500" /> },
                { label: "Total Users", value: totalUsers, icon: <Users className="h-5 w-5 text-blue-500" /> },
                { label: "Modules Available", value: modules.length, icon: <LayoutGrid className="h-5 w-5 text-violet-500" /> },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="flex items-center gap-3 pt-5">
                    {s.icon}
                    <div>
                      <p className="text-2xl font-bold">{listLoading ? "\u2026" : s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search organizations\u2026" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchList()}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
                </Button>
                <Button size="sm" onClick={() => { setForm({ ...BLANK_FORM }); setShowCreate(true); }}>
                  <Plus className="mr-1.5 h-4 w-4" /> New Organization
                </Button>
              </div>
            </div>

            {listLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 opacity-30" />
                  <p className="text-sm">{search ? "No organizations match your search." : "No organizations yet. Create one to get started."}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((org: any) => (
                  <Card
                    key={org.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${selectedOrgId === org.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedOrgId(org.id === selectedOrgId ? null : org.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="truncate text-base">{org.name}</CardTitle>
                          <CardDescription className="truncate text-xs">{org.slug}</CardDescription>
                        </div>
                        {org.isActive
                          ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {planBadge(org.plan)}
                        <span className="text-xs text-muted-foreground">{org.userCount ?? 0} users</span>
                        <span className="text-xs text-muted-foreground">{org.featureCount ?? 0} features</span>
                      </div>
                      {org.contactEmail && <p className="truncate text-xs text-muted-foreground">{org.contactEmail}</p>}
                      <p className="text-xs text-muted-foreground">Created {fmt(org.createdAt)}</p>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedOrgId(org.id); setShowEdit(true); }}>
                          <Pencil className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); handleApplyTier(org.id, org.plan); }} disabled={applyTierToOrg.isPending}>
                          <CreditCard className="mr-1 h-3 w-3" /> Apply Tier
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs text-amber-600 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); archiveOrg.mutate({ id: org.id }); }} disabled={archiveOrg.isPending}>
                          <Archive className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" className="text-xs" onClick={(e) => { e.stopPropagation(); setToDelete(org); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedOrgId && (
              <Card className="mt-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> {detailLoading ? "Loading\u2026" : (orgDetail as any)?.organization?.name}
                  </CardTitle>
                  <CardDescription>Manage features, members, and details for this organization</CardDescription>
                </CardHeader>
                <CardContent>
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <Tabs defaultValue="features">
                      <TabsList>
                        <TabsTrigger value="features">Module Access</TabsTrigger>
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="branding">Branding</TabsTrigger>
                        <TabsTrigger value="info">Details</TabsTrigger>
                      </TabsList>

                      <TabsContent value="features" className="mt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">Toggle which modules are available.</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEnableAll(true)} disabled={bulkSetFeatures.isPending}>Enable All</Button>
                            <Button size="sm" variant="outline" onClick={() => handleEnableAll(false)} disabled={bulkSetFeatures.isPending}>Disable All</Button>
                          </div>
                        </div>
                        {featuresLoading ? (
                          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {modules.map((mod: any) => {
                              const enabled = featureMap[mod.key] !== false;
                              return (
                                <div key={mod.key} className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${enabled ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "opacity-60"}`}>
                                  <button type="button" onClick={() => handleToggleFeature(mod.key, enabled)} disabled={setFeature.isPending} className="mt-0.5 shrink-0">
                                    {enabled ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                                  </button>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium leading-tight">{mod.label}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{mod.description}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="members" className="mt-4 space-y-4">
                        <div className="flex gap-2">
                          <Select value={assignUserId} onValueChange={setAssignUserId}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Select user to assign\u2026" /></SelectTrigger>
                            <SelectContent>
                              {allUsers.filter((u: any) => u.organizationId !== selectedOrgId).map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={handleAssignUser} disabled={!assignUserId || assignUser.isPending}>
                            <UserPlus className="mr-1.5 h-4 w-4" /> Assign
                          </Button>
                        </div>
                        {orgUsers.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">No users assigned.</p>
                        ) : (
                          <div className="divide-y rounded-lg border">
                            {orgUsers.map((u: any) => (
                              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-sm font-medium">{u.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                </div>
                                <Badge variant="secondary" className="shrink-0 capitalize text-xs">{u.role}</Badge>
                                {u.role === "super_admin" && <Crown className="h-4 w-4 text-yellow-500 shrink-0" />}
                                <Button size="sm" variant="ghost" className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveUser(u.id)} disabled={assignUser.isPending}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="info" className="mt-4">
                        {(orgDetail as any)?.organization && (() => {
                          const o = (orgDetail as any).organization;
                          return (
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                              {([
                                ["ID", o.id], ["Slug", o.slug], ["Plan", planBadge(o.plan)],
                                ["Max Users", o.maxUsers === -1 ? "Unlimited" : o.maxUsers],
                                ["Status", o.isActive ? "Active" : "Inactive"],
                                ["Contact Email", o.contactEmail || "\u2014"],
                                ["Contact Phone", o.contactPhone || "\u2014"],
                                ["Domain", o.domain || "\u2014"],
                                ["Country", o.country || "\u2014"],
                                ["Created", fmt(o.createdAt)],
                                ["Last Updated", fmt(o.updatedAt)],
                              ] as [string, any][]).map(([k, v]) => (
                                <div key={k} className="flex flex-col gap-0.5">
                                  <dt className="text-xs text-muted-foreground">{k}</dt>
                                  <dd className="font-medium">{v}</dd>
                                </div>
                              ))}
                              {o.address && (
                                <div className="sm:col-span-2 flex flex-col gap-0.5">
                                  <dt className="text-xs text-muted-foreground">Address</dt>
                                  <dd className="font-medium">{o.address}</dd>
                                </div>
                              )}
                            </dl>
                          );
                        })()}
                      </TabsContent>

                      <TabsContent value="branding" className="mt-4 space-y-4">
                        <BrandingPanel orgId={selectedOrgId} />
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ Archived Organizations Tab ═══ */}
          <TabsContent value="archived" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" /> Archived Organizations</CardTitle>
                <CardDescription>Archived organizations are inactive and hidden from normal views. You can restore them at any time.</CardDescription>
              </CardHeader>
              <CardContent>
                {archivedQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : archivedOrgs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Archive className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No archived organizations</p>
                    <p className="text-sm">Archived organizations will appear here</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {archivedOrgs.map((org: any) => (
                      <Card key={org.id} className="border-dashed opacity-80 hover:opacity-100 transition-opacity">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="truncate text-base">{org.name}</CardTitle>
                              <CardDescription className="truncate text-xs">{org.slug}</CardDescription>
                            </div>
                            <Badge variant="secondary" className="text-xs">Archived</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {planBadge(org.plan)}
                            <span className="text-xs text-muted-foreground">{org.userCount ?? 0} users</span>
                          </div>
                          {org.archivedAt && <p className="text-xs text-muted-foreground">Archived {new Date(org.archivedAt).toLocaleDateString()}</p>}
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" className="flex-1 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => restoreOrg.mutate({ id: org.id })} disabled={restoreOrg.isPending}>
                              <RotateCcw className="mr-1 h-3 w-3" /> Restore
                            </Button>
                            <Button size="sm" variant="destructive" className="text-xs" onClick={() => setToDelete(org)}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Pricing Tiers Tab ═══ */}
          <TabsContent value="pricing" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Pricing Tier Feature Configuration</CardTitle>
                <CardDescription>Define which modules are included in each pricing tier. Tier features are auto-applied when creating organizations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-medium">Select Tier:</Label>
                    <div className="flex gap-1">
                      {planOptions.map((tier) => (
                        <Button key={tier} size="sm" variant={selectedTier === tier ? "default" : "outline"} className="capitalize" onClick={() => setSelectedTier(tier)}>
                          {formatPlanName(tier, apiPrices)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={bulkSetTierFeatures.isPending} onClick={() => { const all: Record<string, boolean> = {}; modules.forEach((m: any) => { all[m.key] = true; }); handleSaveTierFeatures(all); }}>Enable All</Button>
                    <Button size="sm" variant="outline" disabled={bulkSetTierFeatures.isPending} onClick={() => { const all: Record<string, boolean> = {}; modules.forEach((m: any) => { all[m.key] = false; }); handleSaveTierFeatures(all); }}>Disable All</Button>
                    <Button size="sm" variant="secondary" disabled={seedTierFeatures.isPending} onClick={() => seedTierFeatures.mutate()}>
                      {seedTierFeatures.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                      Seed Defaults
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm">
                    {tierDescriptions[selectedTier]}
                  </p>
                </div>

                {tiersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {modules.map((mod: any) => {
                      const enabled = currentTierFeatures[mod.key] ?? false;
                      return (
                        <div key={mod.key} className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${enabled ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "opacity-60"}`}>
                          <button
                            type="button"
                            disabled={bulkSetTierFeatures.isPending}
                            className="mt-0.5 shrink-0"
                            onClick={() => { const updated = { ...currentTierFeatures, [mod.key]: !enabled }; handleSaveTierFeatures(updated); }}
                          >
                            {enabled ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">{mod.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{mod.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold">Tier Comparison</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table className="w-full text-sm">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="px-3 py-2 text-left font-medium">Module</TableHead>
                          {planOptions.map((t) => <TableHead key={t} className="px-3 py-2 text-center font-medium">{formatPlanName(t, apiPrices)}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y">
                        {modules.map((mod: any) => (
                          <TableRow key={mod.key} className="hover:bg-muted/30">
                            <TableCell className="px-3 py-2 font-medium">{mod.label}</TableCell>
                            {planOptions.map((t) => (
                              <TableCell key={t} className="px-3 py-2 text-center">
                                {tierMap[t]?.[mod.key] ? <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" /> : <XCircle className="mx-auto h-4 w-4 text-gray-300" />}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter className="bg-muted/30">
                        <TableRow>
                          <TableCell className="px-3 py-2 font-semibold">Total Features</TableCell>
                          {planOptions.map((t) => (
                            <TableCell key={t} className="px-3 py-2 text-center font-semibold">
                              {Object.values(tierMap[t] ?? {}).filter(Boolean).length}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Tenant Admins Tab ═══ */}
          <TabsContent value="admins" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Tenant Super Admins</CardTitle>
                <CardDescription>All organization super administrators in one place for easy accessibility, communication &amp; updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search admins\u2026" value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} />
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {tenantAdmins.length} admin{tenantAdmins.length !== 1 ? "s" : ""} total
                  </Badge>
                </div>
                {adminsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : filteredAdmins.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <Shield className="h-10 w-10 opacity-30" />
                    <p className="text-sm">{adminSearch ? "No admins match your search." : "No tenant admins found."}</p>
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {filteredAdmins.map((admin: any) => (
                      <div key={admin.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                          {admin.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{admin.name}</p>
                            <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">{admin.organizationName}</p>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-xs text-muted-foreground">{admin.organizationSlug}</span>
                            {planBadge(admin.organizationPlan)}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {admin.isActive
                            ? <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                            : <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => {
                          setMsgForm({ ...BLANK_MESSAGE, targetType: "specific_user", targetUserId: admin.id, subject: "Message to " + admin.name });
                          setShowCompose(true);
                        }}>
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Tenant Users Tab ═══ */}
          <TabsContent value="tenant-users" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Tenant Users</CardTitle>
                <CardDescription>All users across all organizations. Filter by organization or search by name/email.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-1 gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search users…"
                        value={tenantUsersSearch}
                        onChange={(e) => { setTenantUsersSearch(e.target.value); setTenantUsersPage(1); }}
                      />
                    </div>
                    <Select value={tenantUsersOrgFilter || "__all__"} onValueChange={(v) => { setTenantUsersOrgFilter(v === "__all__" ? "" : v); setTenantUsersPage(1); }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Organizations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Organizations</SelectItem>
                        {orgs.map((org: any) => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{tenantUsersTotal} user{tenantUsersTotal !== 1 ? "s" : ""}</Badge>
                    <Button variant="outline" size="sm" onClick={() => refetchTenantUsers()}>
                      <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
                    </Button>
                  </div>
                </div>

                {tenantUsersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : tenantUsersList.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                    <Users className="h-10 w-10 opacity-30" />
                    <p className="text-sm">{tenantUsersSearch || tenantUsersOrgFilter ? "No users match your filters." : "No tenant users found."}</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Organization</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Sign In</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenantUsersList.map((user: any) => {
                            const org = orgs.find((o: any) => o.id === user.organizationId);
                            return (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                                      {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{user.name}</p>
                                      {user.position && <p className="text-xs text-muted-foreground">{user.position}</p>}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                                <TableCell>
                                  {org ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm">{org.name}</span>
                                      {planBadge(org.plan)}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">{user.organizationId}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="capitalize text-sm">{user.role}</span>
                                </TableCell>
                                <TableCell>
                                  {user.isActive
                                    ? <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                                    : <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{fmt(user.lastSignedIn)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {tenantUsersTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground">
                          Page {tenantUsersPage} of {tenantUsersTotalPages} ({tenantUsersTotal} total users)
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="outline" size="sm"
                            disabled={tenantUsersPage <= 1}
                            onClick={() => setTenantUsersPage(p => p - 1)}
                          >Previous</Button>
                          <Button
                            variant="outline" size="sm"
                            disabled={tenantUsersPage >= tenantUsersTotalPages}
                            onClick={() => setTenantUsersPage(p => p + 1)}
                          >Next</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ Communications Tab ═══ */}
          <TabsContent value="comms" className="mt-6 space-y-6">
            {/* Stats row */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {[
                { label: "Total", value: comms.length, color: "" },
                { label: "Sent", value: comms.filter((c: any) => c.status === "sent").length, color: "text-green-600" },
                { label: "Drafts", value: comms.filter((c: any) => c.status === "draft").length, color: "text-amber-600" },
                { label: "Scheduled", value: comms.filter((c: any) => c.status === "scheduled").length, color: "text-blue-600" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-5">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Tenant Communications</CardTitle>
                    <CardDescription>Full lifecycle: compose, edit, send, resend, and delete messages to tenants.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchComms()}>
                      <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
                    </Button>
                    <Button onClick={() => { setMsgForm({ ...BLANK_MESSAGE }); setShowCompose(true); }}>
                      <Plus className="mr-1.5 h-4 w-4" /> New Message
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search communications…" value={commSearch} onChange={(e) => setCommSearch(e.target.value)} />
                  </div>
                  <Select value={commStatusFilter} onValueChange={setCommStatusFilter}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {commsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (() => {
                  const filteredComms = comms.filter((c: any) => {
                    const matchSearch = !commSearch || c.subject?.toLowerCase().includes(commSearch.toLowerCase()) || c.message?.toLowerCase().includes(commSearch.toLowerCase());
                    const matchStatus = commStatusFilter === "all" || c.status === commStatusFilter;
                    return matchSearch && matchStatus;
                  });
                  return filteredComms.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                      <MessageSquare className="h-10 w-10 opacity-30" />
                      <p className="text-sm">{commSearch || commStatusFilter !== "all" ? "No communications match your filters." : "No communications yet. Send your first message."}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredComms.map((comm: any) => (
                        <div key={comm.id} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedMsg(expandedMsg === comm.id ? null : comm.id)}>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="text-sm font-semibold">{comm.subject}</p>
                                <Badge variant={comm.status === "sent" ? "default" : comm.status === "draft" ? "secondary" : "outline"} className="text-xs capitalize">{comm.status}</Badge>
                                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[comm.priority] ?? ""}`}>{comm.priority}</span>
                                <span className="inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{comm.type}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{fmtFull(comm.createdAt)}</span>
                                <span>{"\u2022"}</span>
                                <span className="capitalize">{comm.recipientType?.replace(/_/g, " ")}</span>
                                {comm.sentAt && <><span>{"\u2022"}</span><span>Sent {fmtFull(comm.sentAt)}</span></>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {comm.status === "draft" && (
                                <Button size="sm" variant="default" className="text-xs" onClick={() => sendComm.mutate(comm.id)} disabled={sendComm.isPending}>
                                  <Send className="h-3 w-3 mr-1" /> Send
                                </Button>
                              )}
                              {comm.status === "sent" && (
                                <Button size="sm" variant="outline" className="text-xs" onClick={() => sendComm.mutate(comm.id)} disabled={sendComm.isPending}>
                                  <Send className="h-3 w-3 mr-1" /> Resend
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                setEditingComm(comm);
                                setEditCommForm({ subject: comm.subject, message: comm.message, type: comm.type, priority: comm.priority, status: comm.status, recipientType: comm.recipientType });
                                setShowEditComm(true);
                              }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setCommToDelete(comm)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {expandedMsg === comm.id && (
                            <div className="mt-3 rounded-lg bg-muted/30 p-3 text-sm" dangerouslySetInnerHTML={{ __html: comm.message }} />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ Create Organization Dialog ═══ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>Add a new tenant organization with its super administrator.</DialogDescription>
          </DialogHeader>
          <OrgFormWithAdmin form={form} setForm={setForm} allUsers={allUsers} planOptions={planOptions} tierMaxUsers={tierMaxUsers} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} disabled={createOrgWithAdmin.isPending || !createFormValid}>
              {createOrgWithAdmin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Organization Dialog ═══ */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization details.</DialogDescription>
          </DialogHeader>
          <OrgFormBasic form={form} setForm={setForm} mode="edit" planOptions={planOptions} tierMaxUsers={tierMaxUsers} />

          {/* Organization Super Admin Section */}
          <div className="border-t pt-4 mt-4 space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" /> Organization Super Admin
            </h4>
            {(() => {
              const users: any[] = (orgDetail as any)?.users || [];
              const superAdmin = users.find((u: any) => u.role === "super_admin");
              return (
                <div className="space-y-3">
                  {superAdmin && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Current: <strong>{superAdmin.name}</strong> ({superAdmin.email})</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Admin Action</Label>
                    <Select value={editAdminMode} onValueChange={(v) => setEditAdminMode(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {superAdmin && <SelectItem value="update">Update Existing Admin</SelectItem>}
                        <SelectItem value="create">Create New Admin</SelectItem>
                        <SelectItem value="assign">Assign Existing User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editAdminMode === "update" && superAdmin && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Name</Label>
                          <Input value={editAdminName} onChange={(e) => setEditAdminName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Email</Label>
                          <Input type="email" value={editAdminEmail} onChange={(e) => setEditAdminEmail(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>New Password (leave blank to keep current)</Label>
                        <Input type="password" value={editAdminPassword} onChange={(e) => setEditAdminPassword(e.target.value)} placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} />
                      </div>
                    </>
                  )}
                  {editAdminMode === "create" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Admin Name *</Label>
                          <Input value={editAdminName} onChange={(e) => setEditAdminName(e.target.value)} placeholder="John Doe" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Admin Email *</Label>
                          <Input type="email" value={editAdminEmail} onChange={(e) => setEditAdminEmail(e.target.value)} placeholder="admin@example.com" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Password *</Label>
                        <Input type="password" value={editAdminPassword} onChange={(e) => setEditAdminPassword(e.target.value)} placeholder="Minimum 6 characters" />
                      </div>
                    </>
                  )}
                  {editAdminMode === "assign" && (
                    <div className="space-y-1.5">
                      <Label>Select User to Promote</Label>
                      <Select value={editAssignUserId} onValueChange={(v) => setEditAssignUserId(v)}>
                        <SelectTrigger><SelectValue placeholder="Select a user\u2026" /></SelectTrigger>
                        <SelectContent>
                          {allUsers.filter((u: any) => !superAdmin || u.id !== superAdmin.id).map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={updateOrg.isPending || !form.name}>
              {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Compose Message Dialog ═══ */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Compose Message</DialogTitle>
            <DialogDescription>Create or send a communication to tenants.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Target Audience</Label>
              <Select value={msgForm.targetType} onValueChange={(v) => setMsgForm((p) => ({ ...p, targetType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_admins">All Tenant Admins</SelectItem>
                  <SelectItem value="all_tenants">All Tenants</SelectItem>
                  <SelectItem value="specific_org">Specific Organization</SelectItem>
                  <SelectItem value="specific_user">Specific User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {msgForm.targetType === "specific_org" && (
              <div className="space-y-1.5">
                <Label>Organization</Label>
                <Select value={msgForm.targetOrgId} onValueChange={(v) => setMsgForm((p) => ({ ...p, targetOrgId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select organization\u2026" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {msgForm.targetType === "specific_user" && (
              <div className="space-y-1.5">
                <Label>User</Label>
                <Select value={msgForm.targetUserId} onValueChange={(v) => setMsgForm((p) => ({ ...p, targetUserId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select user\u2026" /></SelectTrigger>
                  <SelectContent>
                    {tenantAdmins.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={msgForm.type ?? "announcement"} onValueChange={(v) => setMsgForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="notice">Notice</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={msgForm.priority} onValueChange={(v) => setMsgForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input value={msgForm.subject} onChange={(e) => setMsgForm((p) => ({ ...p, subject: e.target.value }))} placeholder="System maintenance notice" />
            </div>
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <RichTextEditor value={msgForm.content} onChange={(html) => setMsgForm((p) => ({ ...p, content: html }))} placeholder="Write your message to tenants\u2026" minHeight="150px" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
            <Button variant="secondary" disabled={createComm.isPending || !msgForm.subject || !msgForm.content}
              onClick={() => createComm.mutate({ subject: msgForm.subject, message: msgForm.content, type: (msgForm.type ?? "announcement") as any, priority: msgForm.priority as any, recipientType: (msgForm.targetType === "all_admins" || msgForm.targetType === "all_tenants") ? "all_tenants" : "specific_tenant", status: "draft" })}>
              {createComm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
            <Button onClick={handleSendMessage} disabled={sendMessage.isPending || !msgForm.subject || !msgForm.content}>
              {sendMessage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-1.5 h-4 w-4" /> Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{toDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the organization and remove all its feature flags. Users will be unlinked but not deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => toDelete && deleteOrg.mutate({ id: toDelete.id })}>
              {deleteOrg.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Edit Communication Dialog ═══ */}
      <Dialog open={showEditComm} onOpenChange={(o) => { if (!o) { setShowEditComm(false); setEditingComm(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> Edit Communication</DialogTitle>
            <DialogDescription>Update the communication details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={editCommForm.subject} onChange={(e) => setEditCommForm((p) => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={editCommForm.type} onValueChange={(v) => setEditCommForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="notice">Notice</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={editCommForm.priority} onValueChange={(v) => setEditCommForm((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recipient Type</Label>
                <Select value={editCommForm.recipientType} onValueChange={(v) => setEditCommForm((p) => ({ ...p, recipientType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_tenants">All Tenants</SelectItem>
                    <SelectItem value="specific_tenant">Specific Tenant</SelectItem>
                    <SelectItem value="tier_based">Tier Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <RichTextEditor value={editCommForm.message} onChange={(v) => setEditCommForm((p) => ({ ...p, message: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditComm(false); setEditingComm(null); }}>Cancel</Button>
            <Button disabled={updateComm.isPending || !editCommForm.subject.trim()} onClick={() => {
              if (!editingComm) return;
              updateComm.mutate({
                id: editingComm.id,
                subject: editCommForm.subject,
                message: editCommForm.message,
                type: editCommForm.type as "announcement" | "alert" | "notice" | "update" | "maintenance",
                priority: editCommForm.priority as "low" | "normal" | "high" | "urgent",
                status: editCommForm.status as "draft" | "sent" | "scheduled",
                recipientType: editCommForm.recipientType as "all_tenants" | "specific_tenant" | "tier_based",
              });
            }}>
              {updateComm.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Communication Confirmation ═══ */}
      <AlertDialog open={!!commToDelete} onOpenChange={(o) => { if (!o) setCommToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Communication?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete &quot;{commToDelete?.subject}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => commToDelete && deleteComm.mutate(commToDelete.id)}>
              {deleteComm.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModuleLayout>
  );
}

// ─── Create form with mandatory super admin ──────────────────────────────────
function OrgFormWithAdmin({ form, setForm, allUsers, planOptions, tierMaxUsers }: { form: OrgForm; setForm: React.Dispatch<React.SetStateAction<OrgForm>>; allUsers: any[]; planOptions: string[]; tierMaxUsers: Record<string, number> }) {
  const f = (key: keyof OrgForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const isCustom = form.plan === "custom";

  return (
    <div className="space-y-6 py-1">
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4" /> Organization Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Organization Name *</Label>
            <Input value={form.name} onChange={(e) => { const name = e.target.value; setForm((p) => ({ ...p, name, slug: slugify(name) })); }} placeholder="Acme Corporation" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Slug *</Label>
            <Input value={form.slug} onChange={f("slug")} placeholder="acme-corporation" />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens only.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={form.plan} onValueChange={(v) => {
              const mu = v === "custom" ? form.maxUsers : (tierMaxUsers[v] ?? 10);
              setForm((p) => ({ ...p, plan: v, maxUsers: mu }));
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{planOptions.map((p) => <SelectItem key={p} value={p} className="capitalize">{p.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Max Users {!isCustom && <span className="text-xs text-muted-foreground">(auto from plan)</span>}</Label>
            <Input type="number" min={1} value={form.maxUsers} disabled={!isCustom} className={!isCustom ? "opacity-60" : ""} onChange={(e) => setForm((p) => ({ ...p, maxUsers: Number(e.target.value) }))} />
            {!isCustom && <p className="text-xs text-muted-foreground">Locked to {tierMaxUsers[form.plan] ?? "plan"} users for {form.plan} tier.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Select value={form.industry || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, industry: v === "__none__" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Select industry…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Select —</SelectItem>
                {["Technology", "Finance", "Healthcare", "Education", "Retail", "Manufacturing", "Real Estate", "Agriculture", "Logistics", "Legal", "Media", "Hospitality", "NGO/Non-Profit", "Government", "Consulting", "Other"].map((i) => <SelectItem key={i} value={i.toLowerCase()}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Employee Count</Label>
            <Input type="number" min={1} value={form.employeeCount} onChange={(e) => setForm((p) => ({ ...p, employeeCount: e.target.value }))} placeholder="50" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Email</Label>
            <Input type="email" value={form.contactEmail} onChange={f("contactEmail")} placeholder="admin@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Billing Email</Label>
            <Input type="email" value={form.billingEmail} onChange={f("billingEmail")} placeholder="billing@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Phone</Label>
            <PhoneInput value={form.contactPhone} onChange={(v) => setForm({...form, contactPhone: v})} placeholder="700 000 000" />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={f("website")} placeholder="https://example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Domain</Label>
            <Input value={form.domain} onChange={f("domain")} placeholder="example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <CountrySelect value={form.country} onChange={(v) => setForm({...form, country: v})} />
          </div>
          <div className="space-y-1.5">
            <Label>Tax ID / KRA PIN</Label>
            <Input value={form.taxId} onChange={f("taxId")} placeholder="P051234567A" />
          </div>
          <div className="space-y-1.5">
            <Label>Registration No.</Label>
            <Input value={form.registrationNumber} onChange={f("registrationNumber")} placeholder="PVT-12345" />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Africa/Nairobi", "Africa/Lagos", "Africa/Cairo", "Africa/Johannesburg", "Europe/London", "America/New_York", "Asia/Dubai", "Asia/Kolkata"].map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["KES", "USD", "EUR", "GBP", "ZAR", "NGN", "UGX", "TZS", "AED", "INR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, paymentMethod: v === "__none__" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Select —</SelectItem>
                {["mpesa", "card", "bank_transfer", "cheque"].map((m) => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={f("address")} placeholder="123 Main St, Nairobi" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={f("description") as any} placeholder="Brief description of the organization…" rows={2} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Shield className="h-4 w-4" /> Organization Super Admin *</h3>
        <p className="text-xs text-muted-foreground mb-3">Every organization requires a super admin. Create a new account or assign an existing user.</p>
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant={form.adminMode === "create" ? "default" : "outline"} onClick={() => setForm((p) => ({ ...p, adminMode: "create" }))} type="button">
            <UserPlus className="mr-1.5 h-4 w-4" /> Create New Admin
          </Button>
          <Button size="sm" variant={form.adminMode === "assign" ? "default" : "outline"} onClick={() => setForm((p) => ({ ...p, adminMode: "assign" }))} type="button">
            <Users className="mr-1.5 h-4 w-4" /> Assign Existing User
          </Button>
        </div>

        {form.adminMode === "create" ? (
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Admin Full Name *</Label>
              <Input value={form.adminName} onChange={f("adminName")} placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin Email *</Label>
              <Input type="email" value={form.adminEmail} onChange={f("adminEmail")} placeholder="john@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin Password *</Label>
              <Input type="password" value={form.adminPassword} onChange={f("adminPassword")} placeholder="Min 8 characters" />
              {form.adminPassword && form.adminPassword.length < 8 && <p className="text-xs text-red-500">Password must be at least 8 characters</p>}
            </div>
            <div className="col-span-2">
              <div className="flex items-start gap-2 rounded bg-blue-50 dark:bg-blue-950/30 p-2.5">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">This user will be created as the organization&apos;s super admin with full access to all enabled features.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Select Existing User *</Label>
              <Select value={form.existingUserId} onValueChange={(v) => setForm((p) => ({ ...p, existingUserId: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a user to promote\u2026" /></SelectTrigger>
                <SelectContent>
                  {allUsers.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email}) &mdash; {u.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 rounded bg-amber-50 dark:bg-amber-950/30 p-2.5">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">The selected user will be assigned to this organization and promoted to super admin role with full feature access.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Basic org form (for editing) ────────────────────────────────────────────
function OrgFormBasic({ form, setForm, mode, planOptions, tierMaxUsers }: { form: OrgForm; setForm: React.Dispatch<React.SetStateAction<OrgForm>>; mode: string; planOptions: string[]; tierMaxUsers: Record<string, number> }) {
  const f = (key: keyof OrgForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const isCustom = form.plan === "custom";

  return (
    <div className="space-y-4 py-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Organization Name *</Label>
          <Input value={form.name} onChange={(e) => { const name = e.target.value; setForm((p) => ({ ...p, name, slug: mode === "create" ? slugify(name) : p.slug })); }} placeholder="Acme Corporation" />
        </div>
        {mode === "create" && (
          <div className="col-span-2 space-y-1.5">
            <Label>Slug *</Label>
            <Input value={form.slug} onChange={f("slug")} placeholder="acme-corporation" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <Select value={form.plan} onValueChange={(v) => {
            const mu = v === "custom" ? form.maxUsers : (tierMaxUsers[v] ?? 10);
            setForm((p) => ({ ...p, plan: v, maxUsers: mu }));
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{planOptions.map((p) => <SelectItem key={p} value={p} className="capitalize">{p.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Max Users {!isCustom && <span className="text-xs text-muted-foreground">(auto)</span>}</Label>
          <Input type="number" min={1} value={form.maxUsers} disabled={!isCustom} className={!isCustom ? "opacity-60" : ""} onChange={(e) => setForm((p) => ({ ...p, maxUsers: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Industry</Label>
          <Select value={form.industry || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, industry: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Select industry…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Select —</SelectItem>
              {["Technology", "Finance", "Healthcare", "Education", "Retail", "Manufacturing", "Real Estate", "Agriculture", "Logistics", "Legal", "Media", "Hospitality", "NGO/Non-Profit", "Government", "Consulting", "Other"].map((i) => <SelectItem key={i} value={i.toLowerCase()}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Employee Count</Label>
          <Input type="number" min={1} value={form.employeeCount} onChange={(e) => setForm((p) => ({ ...p, employeeCount: e.target.value }))} placeholder="50" />
        </div>
        <div className="space-y-1.5">
          <Label>Contact Email</Label>
          <Input type="email" value={form.contactEmail} onChange={f("contactEmail")} placeholder="admin@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Billing Email</Label>
          <Input type="email" value={form.billingEmail} onChange={f("billingEmail")} placeholder="billing@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Contact Phone</Label>
          <PhoneInput value={form.contactPhone} onChange={(v) => setForm({...form, contactPhone: v})} placeholder="700 000 000" />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input value={form.website} onChange={f("website")} placeholder="https://example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Domain</Label>
          <Input value={form.domain} onChange={f("domain")} placeholder="example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <CountrySelect value={form.country} onChange={(v) => setForm({...form, country: v})} />
        </div>
        <div className="space-y-1.5">
          <Label>Tax ID / KRA PIN</Label>
          <Input value={form.taxId} onChange={f("taxId")} placeholder="P051234567A" />
        </div>
        <div className="space-y-1.5">
          <Label>Registration No.</Label>
          <Input value={form.registrationNumber} onChange={f("registrationNumber")} placeholder="PVT-12345" />
        </div>
        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Select value={form.timezone} onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Africa/Nairobi", "Africa/Lagos", "Africa/Cairo", "Africa/Johannesburg", "Europe/London", "America/New_York", "Asia/Dubai", "Asia/Kolkata"].map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["KES", "USD", "EUR", "GBP", "ZAR", "NGN", "UGX", "TZS", "AED", "INR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <Select value={form.paymentMethod || "__none__"} onValueChange={(v) => setForm((p) => ({ ...p, paymentMethod: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Select —</SelectItem>
              {["mpesa", "card", "bank_transfer", "cheque"].map((m) => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Address</Label>
          <Input value={form.address} onChange={f("address")} placeholder="123 Main St, Nairobi" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={f("description") as any} placeholder="Brief description of the organization…" rows={2} />
        </div>
      </div>
    </div>
  );
}
