import { ModuleLayout } from "@/components/ModuleLayout";
import { useThemeCustomization } from "@/contexts/ThemeCustomizationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useRequireRole } from "@/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import mutateAsync from "@/lib/mutationHelpers";
import BackupRestore from "@/components/BackupRestore";
import CSVImportExport from "@/components/CSVImportExport";
import { CountrySelect, CitySelect } from "@/components/LocationSelects";
import { RichTextEditor } from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon,
  Building2,
  FileText,
  Hash,
  Save,
  Loader2,
  Bell,
  Database,
  FileUp,
  Globe,
  Mail,
  CreditCard,
  Percent,
  Tag,
  Shield,
  Palette,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  Users,
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Flag,
  ClipboardList,
  Package,
  Receipt,
  RefreshCcw,
  FolderOpen,
  BookOpen,
  MoreHorizontal,
  MessageSquare,
  Layout,
  ArrowUpRight,
  Target,
  Lock,
  Pencil,
  Search,
  Sliders,
  Terminal,
  Copy,
  Check,
  Server,
  HardDrive,
  Cpu,
  AlertCircle,
  CheckCircle,
  XCircle,
  PlayCircle,
  Workflow,
  Upload,
  Smartphone,
  Code,
  Zap,
  Megaphone,
  Activity,
  Link2,
  Timer,
  AlertTriangle,
  Repeat,
  RotateCcw,
} from "lucide-react";

// ─── Nav type helpers ─────────────────────────────────────────────────────────
interface NavItemSection {
  id: string;
  label: string;
  type: "section";
  sectionId: string;
}
interface NavItemLink {
  id: string;
  label: string;
  type: "link";
  href: string;
  description?: string;
}
interface NavItemEmbed {
  id: string;
  label: string;
  type: "embed";
  sectionId: string;
  href?: string;
}
type NavChild = NavItemSection | NavItemLink | NavItemEmbed;
interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: NavChild[];
}

const S = (id: string, label: string, sectionId: string): NavItemSection =>
  ({ id, label, type: "section", sectionId });
const L = (id: string, label: string, href: string, _description?: string): NavItemLink =>
  ({ id, label, type: "link", href });
const E = (id: string, label: string, sectionId: string, href?: string): NavItemEmbed =>
  ({ id, label, type: "embed", sectionId, href });

// ─── Full settings tree (matching crm.africa + tools absorbed) ────────────────
const NAV_GROUPS: NavGroup[] = [
  {
    id: "main", label: "Main Settings", icon: <SettingsIcon className="h-4 w-4" />,
    children: [
      S("general",              "General Settings",    "general"),
      S("company",              "Company Details",     "company"),
      S("currency",             "Currency",            "currency"),
      S("theme",                "Theme",               "theme"),
      S("company-logo",         "Company Logo",        "company-logo"),
    ],
  },
  {
    id: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4" />,
    children: [
      S("billing-account",  "My Account",  "billing-account"),
      S("billing-plans",    "Plans",       "billing-plans"),
      S("billing-payments", "Payments",    "billing-payments"),
      S("billing-notices",  "Notices",     "billing-notices"),
    ],
  },
  {
    id: "email-group", label: "Email", icon: <Mail className="h-4 w-4" />,
    children: [
      S("email-settings",   "Email Settings",   "email"),
      S("email-templates",  "Email Templates",  "email-templates"),
      S("email-queue",      "Email Queue",      "email-queue"),
      S("email-log",        "Email Log",        "email-log"),
    ],
  },
  {
    id: "clients", label: "Clients", icon: <Users className="h-4 w-4" />,
    children: [
      S("clients-general",         "General Settings",  "clients-general"),
      S("clients-categories",      "Categories",         "clients-categories"),
      S("clients-customfields",    "Custom Fields",      "custom-fields-clients"),
      S("clients-email-templates", "Email Templates",    "clients-email-templates"),
    ],
  },
  {
    id: "projects", label: "Projects", icon: <FolderKanban className="h-4 w-4" />,
    children: [
      S("projects-general",      "General Settings",     "projects-general"),
      S("projects-categories",   "Categories",            "projects-categories"),
      S("projects-team-perms",   "Team Permissions",      "projects-team-perms"),
      S("projects-client-perms", "Client Permissions",    "projects-client-perms"),
      S("projects-customfields", "Custom Fields",         "custom-fields-projects"),
      S("projects-automation",   "Automation",            "projects-automation"),
    ],
  },
  {
    id: "tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" />,
    children: [
      S("tasks-general",     "General Settings", "tasks-general"),
      S("tasks-statuses",    "Statuses",          "tasks-statuses"),
      S("tasks-priorities",  "Priorities",        "tasks-priorities"),
      S("tasks-customfields","Custom Fields",     "custom-fields-tasks"),
    ],
  },
  {
    id: "leads", label: "Leads", icon: <TrendingUp className="h-4 w-4" />,
    children: [
      S("leads-general",         "General Settings",  "leads-general"),
      S("leads-categories",      "Categories",         "leads-categories"),
      S("leads-stages",          "Lead Stages",        "leads-stages"),
      S("leads-sources",         "Lead Sources",       "leads-sources"),
      S("leads-customfields",    "Custom Fields",      "custom-fields-leads"),
      S("leads-webforms",        "Web Forms",          "leads-webforms"),
      S("leads-email-templates", "Email Templates",    "leads-email-templates"),
    ],
  },
  {
    id: "milestones", label: "Milestones", icon: <Flag className="h-4 w-4" />,
    children: [
      S("milestones-general",  "General Settings",    "milestones-general"),
      S("milestones-defaults", "Default Milestones",  "milestones-defaults"),
    ],
  },
  {
    id: "purchasing", label: "Purchasing", icon: <Package className="h-4 w-4" />,
    children: [
      S("purchasing-settings", "Settings",  "purchasing-settings"),
      S("purchasing-email",    "Email",     "purchasing-email"),
    ],
  },
  {
    id: "invoices-group", label: "Invoices", icon: <FileText className="h-4 w-4" />,
    children: [
      S("invoices",             "General Settings",  "invoices"),
      S("invoices-categories",  "Categories",        "invoices-categories"),
      S("invoices-statuses",    "Statuses",          "invoices-statuses"),
    ],
  },
  {
    id: "estimates", label: "Estimates", icon: <ClipboardList className="h-4 w-4" />,
    children: [
      S("estimates-general",    "General Settings", "estimates-general"),
      S("estimates-categories", "Categories",        "estimates-categories"),
      S("estimates-automation", "Automation",        "estimates-automation"),
    ],
  },
  {
    id: "timesheets", label: "Time Sheets", icon: <Clock className="h-4 w-4" />,
    children: [
      S("timesheets-general", "General Settings", "timesheets-general"),
    ],
  },
  {
    id: "proposals", label: "Proposals", icon: <FileText className="h-4 w-4" />,
    children: [
      S("proposals-general",    "General Settings", "proposals-general"),
      S("proposals-categories", "Categories",        "proposals-categories"),
      S("proposals-automation", "Automation",        "proposals-automation"),
    ],
  },
  {
    id: "contracts", label: "Contracts", icon: <FileText className="h-4 w-4" />,
    children: [
      S("contracts-general",    "General Settings", "contracts-general"),
      S("contracts-categories", "Categories",        "contracts-categories"),
      S("contracts-automation", "Automation",        "contracts-automation"),
    ],
  },
  {
    id: "products", label: "Products", icon: <Package className="h-4 w-4" />,
    children: [
      S("products-categories",  "Categories",   "products-categories"),
      S("products-units",       "Units",         "products-units"),
      S("products-customfields","Custom Fields", "custom-fields-products"),
    ],
  },
  {
    id: "expenses", label: "Expenses", icon: <Receipt className="h-4 w-4" />,
    children: [
      S("expenses-general",    "General Settings", "expenses-general"),
      S("expenses-categories", "Categories",        "expenses-categories"),
    ],
  },
  {
    id: "subscriptions", label: "Subscriptions", icon: <RefreshCcw className="h-4 w-4" />,
    children: [
      S("subscriptions-general", "General Settings", "subscriptions-general"),
    ],
  },
  {
    id: "tax-group", label: "Tax", icon: <Percent className="h-4 w-4" />,
    children: [
      S("tax", "Tax Rates", "tax"),
    ],
  },
  {
    id: "tags-group", label: "Tags", icon: <Tag className="h-4 w-4" />,
    children: [
      S("tags-general", "General Settings", "tags-general"),
      S("tags",         "View Tags",         "tags"),
    ],
  },
  {
    id: "files", label: "Files", icon: <FolderOpen className="h-4 w-4" />,
    children: [
      S("files-general",         "General Settings", "files-general"),
      S("files-folders",         "Folders",           "files-folders"),
      S("files-default-folders", "Default Folders",   "files-default-folders"),
    ],
  },
  {
    id: "payment-methods", label: "Payment Methods", icon: <CreditCard className="h-4 w-4" />,
    children: [
      S("payments-bank",         "Bank Transfer",  "payments-bank"),
      S("payments-stripe",       "Stripe",         "payments-stripe"),
      S("payments-mpesa",        "M-Pesa",         "payments-mpesa"),
      S("payments-flutterwave",  "Flutterwave",    "payments-flutterwave"),
      S("payments-razorpay",     "Razorpay",       "payments-razorpay"),
      S("payments-paypal",       "PayPal",         "payments-paypal"),
      S("payments-paystack",     "Paystack",       "payments-paystack"),
      S("payments-pesapal",    "Pesapal",        "payments-pesapal"),
      S("payments-mollie",     "Mollie Pay",     "payments-mollie"),
      S("payments-tappay",     "Tap Pay",        "payments-tappay"),
      S("payments-airtel",     "Airtel Money",   "payments-airtel"),
      S("payments-mtnmomo",    "MTN MoMo",       "payments-mtnmomo"),
    ],
  },
  {
    id: "user-roles", label: "User Roles", icon: <Shield className="h-4 w-4" />,
    children: [
      S("roles",       "Roles & Permissions",  "roles"),
      S("permissions", "Advanced Permissions", "permissions-matrix"),
    ],
  },
  {
    id: "notifications-group", label: "Notifications", icon: <Bell className="h-4 w-4" />,
    children: [
      S("notifications", "Preferences", "notifications"),
    ],
  },
  {
    id: "tickets", label: "Tickets", icon: <MessageSquare className="h-4 w-4" />,
    children: [
      S("tickets-general",     "General Settings", "tickets-general"),
      S("tickets-departments", "Departments",       "tickets-departments"),
      S("tickets-statuses",    "Statuses",          "tickets-statuses"),
      S("tickets-canned",      "Canned Categories",  "tickets-canned"),
      S("tickets-customfields","Custom Fields",     "custom-fields-tickets"),
    ],
  },
  {
    id: "knowledgebase", label: "Knowledgebase", icon: <BookOpen className="h-4 w-4" />,
    children: [
      S("kb-general",    "General Settings", "kb-general"),
      S("kb-categories", "Categories",        "kb-categories"),
    ],
  },
  {
    id: "announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" />,
    children: [
      S("announcements-general", "General Settings",     "announcements-general"),
      S("announcements-list",    "Manage Announcements", "announcements-list"),
    ],
  },
  {
    id: "goals", label: "Goals", icon: <Target className="h-4 w-4" />,
    children: [
      S("goals-general",    "General Settings", "goals-general"),
      S("goals-categories", "Categories",        "goals-categories"),
    ],
  },
  {
    id: "reminders", label: "Reminders", icon: <Timer className="h-4 w-4" />,
    children: [
      S("reminders-general", "General Settings", "reminders-general"),
    ],
  },
  {
    id: "security", label: "Security", icon: <Lock className="h-4 w-4" />,
    children: [
      S("security-password", "Password Policy",  "security-password"),
      S("security-2fa",      "Two-Factor Auth",  "security-2fa"),
      S("security-sessions", "Active Sessions",  "security-sessions"),
      S("security-log",      "Login History",    "security-log"),
    ],
  },
  {
    id: "gdpr", label: "GDPR / Compliance", icon: <Shield className="h-4 w-4" />,
    children: [
      S("gdpr-general",      "General Settings", "gdpr-general"),
      S("gdpr-cookies",      "Cookie Consent",   "gdpr-cookies"),
      S("gdpr-data-request", "Data Requests",    "gdpr-data-requests"),
      S("gdpr-deletion",     "Data Deletion",    "gdpr-deletion"),
    ],
  },
  {
    id: "sms", label: "SMS", icon: <Smartphone className="h-4 w-4" />,
    children: [
      S("sms-settings",  "SMS Settings",  "sms-settings"),
      S("sms-templates", "SMS Templates", "sms-templates"),
      S("sms-log",       "SMS Log",       "sms-log"),
    ],
  },
  {
    id: "push-notifications", label: "Push Notifications", icon: <Bell className="h-4 w-4" />,
    children: [
      S("push-general", "General Settings", "push-general"),
      S("push-fcm",     "FCM / Firebase",   "push-fcm"),
    ],
  },
  {
    id: "webhooks", label: "Webhooks", icon: <Link2 className="h-4 w-4" />,
    children: [
      S("webhooks-general", "General Settings",  "webhooks-general"),
      S("webhooks-list",    "Manage Webhooks",   "webhooks-list"),
      S("webhooks-log",     "Delivery Log",      "webhooks-log"),
    ],
  },
  {
    id: "api", label: "API Access", icon: <Code className="h-4 w-4" />,
    children: [
      S("api-general", "General Settings",   "api-general"),
      S("api-keys",    "API Keys",            "api-keys"),
      S("api-docs",    "API Documentation",   "api-docs"),
    ],
  },
  {
    id: "cron", label: "Cron Jobs", icon: <Repeat className="h-4 w-4" />,
    children: [
      S("cron-general", "General Settings", "cron-general"),
      S("cron-list",    "Scheduled Jobs",   "cron-list"),
      S("cron-log",     "Cron Log",         "cron-log"),
    ],
  },
  {
    id: "integrations-group", label: "Integrations", icon: <Zap className="h-4 w-4" />,
    children: [
      S("integrations-page",  "All Integrations",    "integrations-page"),
      S("workflow-auto",       "Workflow Automation",  "workflow-auto"),
      S("system-health",       "System Health",        "system-health"),
      S("import-data",         "Import Data",          "import-data"),
    ],
  },
  {
    id: "inventory", label: "Inventory", icon: <Package className="h-4 w-4" />,
    children: [
      S("inventory-general",    "General Settings",  "inventory-general"),
      S("inventory-categories", "Categories",         "inventory-categories"),
      S("inventory-stock",      "Stock Settings",     "inventory-stock"),
    ],
  },
  {
    id: "services", label: "Services & Checkout", icon: <Layout className="h-4 w-4" />,
    children: [
      S("services-general",    "General Settings",    "services-general"),
      S("services-paypal",     "PayPal (API)",         "services-paypal"),
      S("services-email-tpl",  "Email Templates",      "services-email-templates"),
    ],
  },
  {
    id: "e-signatures", label: "E-Signatures", icon: <FileText className="h-4 w-4" />,
    children: [
      S("esign-general",   "General Settings",     "esign-general"),
      S("esign-providers", "Signature Providers",   "esign-providers"),
      S("esign-templates", "Document Templates",    "esign-templates"),
    ],
  },
  {
    id: "email-marketing", label: "Email Marketing", icon: <Mail className="h-4 w-4" />,
    children: [
      S("emarketing-general",   "General Settings",  "emarketing-general"),
      S("emarketing-campaigns", "Campaigns",          "emarketing-campaigns"),
      S("emarketing-lists",     "Mailing Lists",      "emarketing-lists"),
      S("emarketing-templates", "Templates",          "emarketing-templates"),
    ],
  },
  {
    id: "client-portal", label: "Client Portal", icon: <Globe className="h-4 w-4" />,
    children: [
      S("portal-general",     "General Settings",  "portal-general"),
      S("portal-branding",    "Branding",           "portal-branding"),
      S("portal-permissions", "Permissions",        "portal-permissions"),
      S("portal-modules",     "Module Access",      "portal-modules"),
    ],
  },
  {
    id: "other", label: "Other", icon: <MoreHorizontal className="h-4 w-4" />,
    children: [
      S("integration-guides", "Integration Guides", "integration-guides"),
      S("recaptcha",           "reCAPTCHA",          "recaptcha"),
      S("tweak",               "Tweak",              "tweak"),
      S("backup",              "Backup & Restore",   "backup"),
      S("csvimport",           "CSV Import/Export",  "csvimport"),
    ],
  },
];
// ─── SaveButton ───────────────────────────────────────────────────────────────
function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <Button onClick={onClick} disabled={saving} className="mt-4">
      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      {saving ? "Saving\u2026" : "Save Changes"}
    </Button>
  );
}

function ResetButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="mt-4 ml-2 text-muted-foreground">
      <RotateCcw className="mr-2 h-3.5 w-3.5" />
      {label || "Reset to Default"}
    </Button>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}


// ─── Module-level constants (stable references to prevent re-render cascading) ─
const SETTINGS_ROLES: ("super_admin" | "admin")[] = ["super_admin", "admin"];
const parseList = <T,>(raw: string | undefined): T[] => { try { return JSON.parse(raw || "[]"); } catch { return []; } };

// ─── Main component ───────────────────────────────────────────────────────────
export default function Settings() {
  const { allowed, isLoading: isLoadingPermission } = useRequireRole(SETTINGS_ROLES);
  const [, navigate] = useLocation();
  const { updateThemeConfig } = useThemeCustomization();
  const { setTheme } = useTheme();

  // ── Nav state (persisted via URL hash) ─────────────────────────────────────
  const [activeSection, setActiveSectionState] = useState<string>(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || "general";
  });
  const setActiveSection = (section: string) => {
    setActiveSectionState(section);
    window.history.replaceState(null, "", `${window.location.pathname}#${section}`);
  };
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["main"]));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleChildClick = (child: NavChild) => {
    if (child.type === "link") {
      navigate(child.href);
    } else {
      // "section" and "embed" both render inline
      setActiveSection(child.sectionId);
      const group = NAV_GROUPS.find((g) => g.children.some((c) => c.id === child.id));
      if (group) setExpandedGroups((prev) => { const arr = Array.from(prev); arr.push(group.id); return new Set(arr); });
    }
  };

  const isChildActive = (child: NavChild): boolean => {
    if (child.type === "link") return false;
    return activeSection === child.sectionId;
  };

  // ── General ────────────────────────────────────────────────────────────────
  const [general, setGeneral] = useState({
    timezone: "Africa/Nairobi",
    dateFormat: "d-m-Y",
    dateSelectorFormat: "dd-mm-yyyy",
    leftMenuPosition: "Collapsed",
    statsPanelPosition: "Collapsed",
    tablePageSize: "35",
    kanbanPageSize: "35",
    closeModalOnClick: "no",
    sessionTimeout: "enabled",
    language: "en",
    allowLanguageChange: "yes",
    exportStripHtml: "yes",
  });

  // ── Company ────────────────────────────────────────────────────────────────
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyWebsite: "",
    companyAddress: "",
    companyCity: "",
    companyCountry: "Kenya",
    companyPostalCode: "",
    taxId: "",
    registrationNumber: "",
    companyLogo: "",
  });

  // ── Appearance ─────────────────────────────────────────────────────────────
  const [appearance, setAppearance] = useState({
    theme: "light",
    primaryColor: "#3b82f6",
  });

  // ── Theme (crm.africa) ────────────────────────────────────────────────────
  const [themeSettings, setThemeSettings] = useState({
    mainTheme: "Default",
    resetUsersTheme: false,
    primaryColor: "#3b82f6",
    sidebarColor: "#1e293b",
    headerColor: "#ffffff",
    fontFamily: "Inter",
    borderRadius: "8",
    sidebarStyle: "dark",
    compactMode: false,
    htmlHead: "",
    htmlBody: "",
    cssStyle: "",
    colorMode: "light" as "light" | "dark",
  });

  // ── Project Permissions & Automation ──────────────────────────────────────
  const [projTeamPerms, setProjTeamPerms] = useState<Record<string, boolean>>({ viewOtherTasks: false, editProject: false, deleteTasks: false, manageMilestones: false, viewBudget: false, createSubtasks: false });
  const [projClientPerms, setProjClientPerms] = useState<Record<string, boolean>>({ viewProgress: false, viewTasks: false, createTasks: false, commentTasks: false, viewTeam: false, uploadFiles: false, viewInvoices: false });
  const [projAutomation, setProjAutomation] = useState<Record<string, boolean>>({ autoComplete: false, emailOnStatusChange: false, defaultTaskList: false, autoAssignPM: false });
  const [estAutomation, setEstAutomation] = useState<Record<string, boolean>>({ autoConvertToInvoice: false, emailOnExpiry: false, notifyOnApproval: false, autoAddTax: false });
  const [propAutomation, setPropAutomation] = useState<Record<string, boolean>>({ autoConvertToProject: false, remindBeforeExpiry: false, notifyOnSignature: false, autoGenerateInvoice: false });
  const [contAutomation, setContAutomation] = useState<Record<string, boolean>>({ emailBeforeExpiry: false, autoRenew: false, notifyOnSignature: false, archiveExpired: false });
  const [tweakSettings, setTweakSettings] = useState({ showPoweredBy: false, forceHttps: false, debugMode: false, maintenanceMode: false, customCss: "", customJs: "" });

  // ── Company Logo ──────────────────────────────────────────────────────────
  const [companyLogos, setCompanyLogos] = useState({
    largeLogo: "",
    smallLogo: "",
  });

  // ── Purchasing ────────────────────────────────────────────────────────────
  const [purchasingSettings, setPurchasingSettings] = useState({
    enabled: true,
    defaultTaxRate: "",
    approvalRequired: true,
    defaultPaymentTerms: "30",
  });

  // ── Email Template Editor ─────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  // ── Client Email Templates ────────────────────────────────────────────────
  const [selectedClientTpl, setSelectedClientTpl] = useState("");
  const [clientTplSubject, setClientTplSubject] = useState("");
  const [clientTplBody, setClientTplBody] = useState("");

  // ── Lead Email Templates ──────────────────────────────────────────────────
  const [selectedLeadTpl, setSelectedLeadTpl] = useState("");
  const [leadTplSubject, setLeadTplSubject] = useState("");
  const [leadTplBody, setLeadTplBody] = useState("");

  // ── Services Email Templates ──────────────────────────────────────────────
  const [selectedServiceTpl, setSelectedServiceTpl] = useState("");
  const [serviceTplSubject, setServiceTplSubject] = useState("");
  const [serviceTplBody, setServiceTplBody] = useState("");

  // ── Email ──────────────────────────────────────────────────────────────────
  const [emailSettings, setEmailSettings] = useState({
    mailDriver: "smtp",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    fromName: "",
    fromEmail: "",
    replyTo: "",
  });

  // ── Invoices ───────────────────────────────────────────────────────────────
  const [invoiceSettings, setInvoiceSettings] = useState({
    invoicePrefix: "INV",
    defaultDueDays: "7",
    overdueDays1: "1",
    overdueDays2: "7",
    overdueDays3: "14",
    taxMode: "summary",
    termsAndConditions: "",
    showProjectTitle: false,
    showViewedIndicator: true,
  });

  // ── Payment Methods ────────────────────────────────────────────────────────
  const [bankPayment, setBankPayment] = useState({
    enabled: false,
    displayName: "Bank Transfer",
    details: "",
  });
  const [stripeSettings, setStripeSettings] = useState({
    enabled: false,
    publishableKey: "",
    secretKey: "",
  });
  const [mpesaSettings, setMpesaSettings] = useState({
    enabled: false,
    consumerKey: "",
    consumerSecret: "",
    paybillNumber: "",
    passkey: "",
    callbackUrl: "",
  });

  // ── Tax ────────────────────────────────────────────────────────────────────
  const [taxRates, setTaxRates] = useState<{ id: string; name: string; rate: string; description: string }[]>([]);
  const [newTax, setNewTax] = useState({ name: "", rate: "", description: "" });

  // ── Tags ───────────────────────────────────────────────────────────────────
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newTag, setNewTag] = useState({ name: "", color: "#3b82f6" });

  // ── Document Numbering ─────────────────────────────────────────────────────
  const [documentNumbers, setDocumentNumbers] = useState({
    invoicePrefix: "INV",
    estimatePrefix: "EST",
    receiptPrefix: "REC",
    proposalPrefix: "PROP",
    expensePrefix: "EXP",
  });

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifyPrefs, setNotifyPrefs] = useState({
    invoiceDue: true,
    paymentReceived: true,
    newClient: false,
    companyAnnouncement: false,
    projectDeadline: false,
    taskAssigned: true,
  });

  // ── Saving flags ───────────────────────────────────────────────────────────
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const setSavingKey = (key: string, val: boolean) => setSaving((p) => ({ ...p, [key]: val }));

  // ── Currency ───────────────────────────────────────────────────────────────
  const [currency, setCurrency] = useState({ defaultCurrency: "KES", symbolPosition: "before", thousandsSep: ",", decimalSep: ".", decimalPlaces: "2" });

  // ── Billing ────────────────────────────────────────────────────────────────
  const [billing] = useState({ planName: "Professional", planExpiry: "—", emailQuota: "Unlimited", userLimit: "Unlimited" });

  // ── Payment gateways ───────────────────────────────────────────────────────
  const [flutterwave, setFlutterwave] = useState({ enabled: false, publicKey: "", secretKey: "" });
  const [razorpay, setRazorpay] = useState({ enabled: false, keyId: "", keySecret: "" });
  const [paypal, setPaypal] = useState({ enabled: false, clientId: "", clientSecret: "", mode: "sandbox" });
  const [paystack, setPaystack] = useState({ enabled: false, publicKey: "", secretKey: "" });
  const [pesapal, setPesapal] = useState({ enabled: false, consumerKey: "", consumerSecret: "", environment: "sandbox" });
  const [mollie, setMollie] = useState({ enabled: false, apiKey: "", testMode: true });
  const [tapPay, setTapPay] = useState({ enabled: false, merchantId: "", apiKey: "", environment: "sandbox" });
  const [airtelMoney, setAirtelMoney] = useState({ enabled: false, clientId: "", clientSecret: "", environment: "sandbox" });
  const [mtnMomo, setMtnMomo] = useState({ enabled: false, subscriptionKey: "", apiUser: "", apiKey: "", environment: "sandbox" });

  // ── Inventory ──────────────────────────────────────────────────────────────
  const [inventoryGeneral, setInventoryGeneral] = useState({ trackStock: true, lowStockThreshold: "10", autoReorder: false, defaultWarehouse: "" });
  const [inventoryCategories, setInventoryCategories] = useState<{id:string;name:string}[]>([]);
  const [newInventoryCat, setNewInventoryCat] = useState({ name: "" });
  const [inventoryStock, setInventoryStock] = useState({ method: "fifo", allowNegative: false, barcodeEnabled: false });

  // ── Services & Checkout ────────────────────────────────────────────────────
  const [servicesGeneral, setServicesGeneral] = useState({ enabled: true, showPricing: true, allowOnlineBooking: false, bookingUrl: "" });
  const [servicesPaypal, setServicesPaypal] = useState({ mode: "sandbox", clientId: "", clientSecret: "" });
  const [servicesCategories, setServicesCategories] = useState<{id:string;name:string}[]>([]);
  const [newServiceCat, setNewServiceCat] = useState({ name: "" });
  const [servicesCheckout, setServicesCheckout] = useState({ enabled: false, requireLogin: true, allowGuestCheckout: false, termsUrl: "" });

  // ── E-Signatures ──────────────────────────────────────────────────────────
  const [esignGeneral, setEsignGeneral] = useState({ enabled: false, provider: "built-in", requireAuth: true, expiryDays: "30" });
  const [esignProviders, setEsignProviders] = useState({ docusign: false, docusignApiKey: "", hellosign: false, hellosignApiKey: "" });
  const [esignTemplates, setEsignTemplates] = useState<{id:string;name:string}[]>([]);
  const [newEsignTemplate, setNewEsignTemplate] = useState({ name: "" });

  // ── Document Templates ────────────────────────────────────────────────────
  const [docTemplateType, setDocTemplateType] = useState<"invoice" | "receipt" | "estimate">("invoice");
  const [docTemplates, setDocTemplates] = useState<Record<string, string>>({ invoice: "", receipt: "", estimate: "" });
  const [docTemplatePreview, setDocTemplatePreview] = useState(false);

  // ── Email Marketing ───────────────────────────────────────────────────────
  const [emarketingGeneral, setEmarketingGeneral] = useState({ enabled: false, provider: "built-in", unsubscribeUrl: "", fromName: "", fromEmail: "" });
  const [emarketingLists, setEmarketingLists] = useState<{id:string;name:string}[]>([]);
  const [newEmarketingList, setNewEmarketingList] = useState({ name: "" });

  // ── Campaign & Template editors ───────────────────────────────────────────
  const [editingCampaign, setEditingCampaign] = useState<{ name: string; subject: string; audience: string; schedule: string; body: string } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ name: string; subject: string; body: string } | null>(null);
  const [editingPurchasingTemplate, setEditingPurchasingTemplate] = useState<{ name: string; subject: string; body: string } | null>(null);

  // ── Client Portal ─────────────────────────────────────────────────────────
  const [portalGeneral, setPortalGeneral] = useState({ enabled: true, requireApproval: true, showInvoices: true, showProjects: true, showTickets: true, customDomain: "" });
  const [portalBranding, setPortalBranding] = useState({ logoUrl: "", primaryColor: "#3b82f6", welcomeMessage: "", portalTitle: "" });
  const [portalPermissions, setPortalPermissions] = useState({ viewInvoices: true, payOnline: true, createTickets: true, viewProjects: true, downloadFiles: true, viewEstimates: true });
  const [portalModules, setPortalModules] = useState({ invoices: true, estimates: true, projects: true, tickets: true, contracts: true, knowledgebase: true, announcements: true });

  // ── Clients ────────────────────────────────────────────────────────────────
  const [clientsGeneral, setClientsGeneral] = useState({ allowRegistration: false, requireApproval: true, showPortalLogin: true, portalUrl: "" });
  const [clientsCategories, setClientsCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newClientsCat, setNewClientsCat] = useState({ name: "", color: "#3b82f6" });

  // ── Projects ───────────────────────────────────────────────────────────────
  const [projectsGeneral, setProjectsGeneral] = useState({ allowClientComments: true, allowClientBilling: false, notifyOnTaskCreate: true, defaultBillingType: "fixed" });
  const [projectsCategories, setProjectsCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newProjectsCat, setNewProjectsCat] = useState({ name: "", color: "#3b82f6" });

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const [tasksGeneral, setTasksGeneral] = useState({ enableMultipleCheckboxes: false, notifyAssigneeByEmail: true, defaultStatus: "not_started" });
  const [taskStatuses, setTaskStatuses] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newTaskStatus, setNewTaskStatus] = useState({ name: "", color: "#3b82f6" });
  const [taskPriorities, setTaskPriorities] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newTaskPriority, setNewTaskPriority] = useState({ name: "", color: "#ef4444" });

  // ── Leads ──────────────────────────────────────────────────────────────────
  const [leadsGeneral, setLeadsGeneral] = useState({ requireSource: false, requireCategory: false, defaultStage: "new" });
  const [leadsCategories, setLeadsCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newLeadsCat, setNewLeadsCat] = useState({ name: "", color: "#3b82f6" });
  const [leadStages, setLeadStages] = useState<{ id: string; name: string; color: string; probability: string }[]>([]);
  const [newLeadStage, setNewLeadStage] = useState({ name: "", color: "#3b82f6", probability: "50" });
  const [leadSources, setLeadSources] = useState<{ id: string; name: string }[]>([]);
  const [newLeadSource, setNewLeadSource] = useState({ name: "" });

  // ── Milestones ─────────────────────────────────────────────────────────────
  const [milestonesGeneral, setMilestonesGeneral] = useState({ notifyOnCreate: true, clientVisible: false });
  const [defaultMilestones, setDefaultMilestones] = useState<{ id: string; name: string }[]>([]);
  const [newDefaultMilestone, setNewDefaultMilestone] = useState({ name: "" });

  // ── Invoice extras ─────────────────────────────────────────────────────────
  const [invoicesCategories, setInvoicesCategories] = useState<{ id: string; name: string }[]>([]);
  const [newInvoiceCat, setNewInvoiceCat] = useState({ name: "" });
  const [invoicesStatuses, setInvoicesStatuses] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newInvoiceStatus, setNewInvoiceStatus] = useState({ name: "", color: "#3b82f6" });

  // ── Estimates ──────────────────────────────────────────────────────────────
  const [estimatesGeneral, setEstimatesGeneral] = useState({ allowClientApproval: true, expiryDays: "30" });
  const [estimateCategories, setEstimateCategories] = useState<{ id: string; name: string }[]>([]);
  const [newEstimateCat, setNewEstimateCat] = useState({ name: "" });

  // ── Timesheets ─────────────────────────────────────────────────────────────
  const [timesheetsGeneral, setTimesheetsGeneral] = useState({ requireNotes: false, notifyPM: true, roundingMinutes: "0" });

  // ── Proposals ──────────────────────────────────────────────────────────────
  const [proposalsGeneral, setProposalsGeneral] = useState({ allowEsign: true, expiryDays: "30" });
  const [proposalCategories, setProposalCategories] = useState<{ id: string; name: string }[]>([]);
  const [newProposalCat, setNewProposalCat] = useState({ name: "" });

  // ── Contracts ──────────────────────────────────────────────────────────────
  const [contractsGeneral, setContractsGeneral] = useState({ allowEsign: true, expiryReminderDays: "7" });
  const [contractCategories, setContractCategories] = useState<{ id: string; name: string }[]>([]);
  const [newContractCat, setNewContractCat] = useState({ name: "" });

  // ── Products ───────────────────────────────────────────────────────────────
  const [productsCategories, setProductsCategories] = useState<{ id: string; name: string }[]>([]);
  const [newProductsCat, setNewProductsCat] = useState({ name: "" });
  const [productUnits, setProductUnits] = useState<{ id: string; name: string }[]>([]);
  const [newProductUnit, setNewProductUnit] = useState({ name: "" });

  // ── Expenses ───────────────────────────────────────────────────────────────
  const [expensesGeneral, setExpensesGeneral] = useState({ requireReceipt: false, autoApproveBelow: "0" });
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string }[]>([]);
  const [newExpenseCat, setNewExpenseCat] = useState({ name: "" });

  // ── Subscriptions ──────────────────────────────────────────────────────────
  const [subsGeneral, setSubsGeneral] = useState({ taxInclusive: false, roundAmounts: true });

  // ── Tags general ───────────────────────────────────────────────────────────
  const [tagsGeneral, setTagsGeneral] = useState({ allowUserCreate: true, autoLowercase: true });

  // ── Files ──────────────────────────────────────────────────────────────────
  const [filesGeneral, setFilesGeneral] = useState({ maxSizeMb: "10", allowedTypes: "pdf,doc,docx,xls,xlsx,png,jpg,jpeg", maxFilesPerUpload: "10" });
  const [fileFolders, setFileFolders] = useState<{ id: string; name: string }[]>([]);
  const [newFileFolder, setNewFileFolder] = useState({ name: "" });
  const [defaultFolders, setDefaultFolders] = useState<{ id: string; name: string }[]>([]);
  const [newDefaultFolder, setNewDefaultFolder] = useState({ name: "" });

  // ── Tickets ────────────────────────────────────────────────────────────────
  const [ticketsGeneral, setTicketsGeneral] = useState({ allowClientTickets: true, autoAssign: false, notifyAgents: true, closeAfterDays: "7" });
  const [ticketDepts, setTicketDepts] = useState<{ id: string; name: string }[]>([]);
  const [newTicketDept, setNewTicketDept] = useState({ name: "" });
  const [ticketStatuses, setTicketStatuses] = useState<{ id: string; name: string; color: string }[]>([]);
  const [newTicketStatus, setNewTicketStatus] = useState({ name: "", color: "#3b82f6" });
  const [ticketCanned, setTicketCanned] = useState<{ id: string; name: string; body: string }[]>([]);
  const [newCanned, setNewCanned] = useState({ name: "", body: "" });

  // ── Knowledgebase ──────────────────────────────────────────────────────────
  const [kbGeneral, setKbGeneral] = useState({ guestAccess: true, enableComments: true, articlesPerPage: "10" });
  const [kbCategories, setKbCategories] = useState<{ id: string; name: string }[]>([]);
  const [newKbCat, setNewKbCat] = useState({ name: "" });

  // ── Announcements ──────────────────────────────────────────────────────────
  const [announcementsGeneral, setAnnouncementsGeneral] = useState({ enabled: true, defaultAudienceAll: true });
  const [announcementsList, setAnnouncementsList] = useState<{ id: string; title: string; message: string; audience: string; date: string }[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", message: "", audience: "all", date: "" });

  // ── Goals ──────────────────────────────────────────────────────────────────
  const [goalsGeneral, setGoalsGeneral] = useState({ enableModule: true, allowTeamGoals: true });
  const [goalsCategories, setGoalsCategories] = useState<{ id: string; name: string }[]>([]);
  const [newGoalsCat, setNewGoalsCat] = useState({ name: "" });

  // ── Reminders ──────────────────────────────────────────────────────────────
  const [remindersGeneral, setRemindersGeneral] = useState({ defaultMinutesBefore: "15", emailChannel: true, pushChannel: false, smsChannel: false });

  // ── Security ───────────────────────────────────────────────────────────────
  const [securityPassword, setSecurityPassword] = useState({ minLength: "8", requireUppercase: true, requireNumbers: true, requireSpecial: false, expiryDays: "0" });
  const [twofa, setTwofa] = useState({ enabled: false, requireForAdmins: false, method: "totp" });

  // ── GDPR ───────────────────────────────────────────────────────────────────
  const [gdprGeneral, setGdprGeneral] = useState({ enabled: false, retentionDays: "365" });
  const [gdprCookies, setGdprCookies] = useState({ bannerEnabled: true, analyticsEnabled: true, marketingEnabled: false });

  // ── SMS ────────────────────────────────────────────────────────────────────
  const [smsSettings, setSmsSettings] = useState({ provider: "twilio", accountSid: "", authToken: "", fromNumber: "", atApiKey: "", atUsername: "" });
  const [smsTemplates, setSmsTemplates] = useState<{ id: string; name: string; body: string }[]>([]);
  const [newSmsTemplate, setNewSmsTemplate] = useState({ name: "", body: "" });

  // ── Push ───────────────────────────────────────────────────────────────────
  const [pushGeneral, setPushGeneral] = useState({ enabled: false });
  const [fcmSettings, setFcmSettings] = useState({ serverKey: "", senderId: "", vapidKey: "" });

  // ── Webhooks ───────────────────────────────────────────────────────────────
  const [webhooksGeneral, setWebhooksGeneral] = useState({ enabled: false, maxRetries: "3" });
  const [webhooksList, setWebhooksList] = useState<{ id: string; url: string; event: string; enabled: boolean }[]>([]);
  const [newWebhook, setNewWebhook] = useState({ url: "", event: "invoice.created" });

  // ── API ────────────────────────────────────────────────────────────────────
  const [apiGeneral, setApiGeneral] = useState({ enabled: true, rateLimit: "100", rateLimitPer: "minute" });
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; permissions: string; createdAt: string }[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState("");

  // ── Cron ───────────────────────────────────────────────────────────────────
  const [cronGeneral, setCronGeneral] = useState({ enabled: true, defaultSchedule: "0 * * * *" });
  const [cronJobs, setCronJobs] = useState<{ id: string; name: string; schedule: string; enabled: boolean; lastRun: string }[]>([]);

  // ── reCAPTCHA ──────────────────────────────────────────────────────────────
  const [recaptcha, setRecaptcha] = useState({ version: "v2", siteKey: "", secretKey: "" });

  // ── Custom Fields (inline) ────────────────────────────────────────────────
  type CustomField = { id: string; name: string; type: string; entity: string; required: boolean; active: boolean };
  const [customFields, setCustomFields] = useState<CustomField[]>([
    { id: "1", name: "Company Size", type: "Dropdown", entity: "Client", required: false, active: true },
    { id: "2", name: "Industry", type: "Dropdown", entity: "Client", required: true, active: true },
    { id: "3", name: "Preferred Contact Method", type: "Dropdown", entity: "Client", required: false, active: true },
    { id: "4", name: "Internal Priority", type: "Dropdown", entity: "Project", required: false, active: true },
    { id: "5", name: "Story Points", type: "Number", entity: "Task", required: false, active: true },
    { id: "6", name: "Budget Range", type: "Currency", entity: "Lead", required: false, active: true },
    { id: "7", name: "Severity Level", type: "Dropdown", entity: "Ticket", required: true, active: true },
    { id: "8", name: "SKU Code", type: "Text", entity: "Product", required: true, active: true },
  ]);
  const [cfDialogOpen, setCfDialogOpen] = useState(false);
  const [cfForm, setCfForm] = useState({ name: "", type: "Text", entity: "Client", required: false });
  const [cfSearch, setCfSearch] = useState("");

  // ── Permissions state ─────────────────────────────────────────────────────
  const [permState, setPermState] = useState<Record<string, boolean>>({});

  // ── Integrations (inline) ─────────────────────────────────────────────────
  const [intAddOpen, setIntAddOpen] = useState(false);
  const [intForm, setIntForm] = useState({ provider: "", type: "api_key", apiKey: "", webhookUrl: "", clientId: "", clientSecret: "" });

  // ── Workflow Automation (inline) ──────────────────────────────────────────
  const [wfCreateOpen, setWfCreateOpen] = useState(false);
  const [wfForm, setWfForm] = useState({ name: "", description: "", triggerType: "invoice_created", isRecurring: false });

  // ── Integration Guides (inline) ──────────────────────────────────────────
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);
  const [guideSearch, setGuideSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: companyData, refetch: refetchCompany } = trpc.settings.getCompanyInfo.useQuery();
  const { data: docData, refetch: refetchDocs }        = trpc.settings.getDocumentNumberingSettings.useQuery();
  const { data: notifyData }                           = trpc.settings.getNotificationPreferences.useQuery();
  const { data: generalData }                          = trpc.settings.getByCategory.useQuery({ category: "general" });
  const { data: appearanceData }                       = trpc.settings.getByCategory.useQuery({ category: "appearance" });
  const { data: emailData }                            = trpc.settings.getByCategory.useQuery({ category: "email" });
  const { data: invoiceData }                          = trpc.settings.getByCategory.useQuery({ category: "invoice_settings" });
  const { data: bankPayData }                          = trpc.settings.getByCategory.useQuery({ category: "payment_bank" });
  const { data: stripeData }                           = trpc.settings.getByCategory.useQuery({ category: "payment_stripe" });
  const { data: mpesaData }                            = trpc.settings.getByCategory.useQuery({ category: "payment_mpesa" });
  const { data: taxData }                              = trpc.settings.getByCategory.useQuery({ category: "tax_rates" });
  const { data: tagsData }                             = trpc.settings.getByCategory.useQuery({ category: "global_tags" });
  // New category queries
  const { data: currencyData }        = trpc.settings.getByCategory.useQuery({ category: "currency" });
  const { data: flutterwaveData }     = trpc.settings.getByCategory.useQuery({ category: "payment_flutterwave" });
  const { data: razorpayData }        = trpc.settings.getByCategory.useQuery({ category: "payment_razorpay" });
  const { data: paypalData }          = trpc.settings.getByCategory.useQuery({ category: "payment_paypal" });
  const { data: paystackData }        = trpc.settings.getByCategory.useQuery({ category: "payment_paystack" });
  const { data: clientsGenData }      = trpc.settings.getByCategory.useQuery({ category: "clients_general" });
  const { data: clientsCatData }      = trpc.settings.getByCategory.useQuery({ category: "clients_categories" });
  const { data: projGenData }         = trpc.settings.getByCategory.useQuery({ category: "projects_general" });
  const { data: projCatData }         = trpc.settings.getByCategory.useQuery({ category: "projects_categories" });
  const { data: tasksGenData }        = trpc.settings.getByCategory.useQuery({ category: "tasks_general" });
  const { data: taskStatusData }      = trpc.settings.getByCategory.useQuery({ category: "task_statuses" });
  const { data: taskPriorityData }    = trpc.settings.getByCategory.useQuery({ category: "task_priorities" });
  const { data: leadsGenData }        = trpc.settings.getByCategory.useQuery({ category: "leads_general" });
  const { data: leadsCatData }        = trpc.settings.getByCategory.useQuery({ category: "leads_categories" });
  const { data: leadStageData }       = trpc.settings.getByCategory.useQuery({ category: "lead_stages" });
  const { data: leadSourceData }      = trpc.settings.getByCategory.useQuery({ category: "lead_sources" });
  const { data: milestonesGenData }   = trpc.settings.getByCategory.useQuery({ category: "milestones_general" });
  const { data: defaultMilData }      = trpc.settings.getByCategory.useQuery({ category: "default_milestones" });
  const { data: invCatData }          = trpc.settings.getByCategory.useQuery({ category: "invoice_categories" });
  const { data: invStatusData }       = trpc.settings.getByCategory.useQuery({ category: "invoice_statuses" });
  const { data: estGenData }          = trpc.settings.getByCategory.useQuery({ category: "estimates_general" });
  const { data: estCatData }          = trpc.settings.getByCategory.useQuery({ category: "estimate_categories" });
  const { data: tsGenData }           = trpc.settings.getByCategory.useQuery({ category: "timesheets_general" });
  const { data: propGenData }         = trpc.settings.getByCategory.useQuery({ category: "proposals_general" });
  const { data: propCatData }         = trpc.settings.getByCategory.useQuery({ category: "proposal_categories" });
  const { data: contGenData }         = trpc.settings.getByCategory.useQuery({ category: "contracts_general" });
  const { data: contCatData }         = trpc.settings.getByCategory.useQuery({ category: "contract_categories" });
  const { data: prodCatData }         = trpc.settings.getByCategory.useQuery({ category: "products_categories" });
  const { data: prodUnitData }        = trpc.settings.getByCategory.useQuery({ category: "product_units" });
  const { data: expGenData }          = trpc.settings.getByCategory.useQuery({ category: "expenses_general" });
  const { data: expCatData }          = trpc.settings.getByCategory.useQuery({ category: "expense_categories" });
  const { data: subsGenData }         = trpc.settings.getByCategory.useQuery({ category: "subscriptions_general" });
  const { data: tagsGenData }         = trpc.settings.getByCategory.useQuery({ category: "tags_general" });
  const { data: filesGenData }        = trpc.settings.getByCategory.useQuery({ category: "files_general" });
  const { data: fileFolderData }      = trpc.settings.getByCategory.useQuery({ category: "file_folders" });
  const { data: defaultFolderData }   = trpc.settings.getByCategory.useQuery({ category: "default_folders" });
  const { data: ticketsGenData }      = trpc.settings.getByCategory.useQuery({ category: "tickets_general" });
  const { data: ticketDeptData }      = trpc.settings.getByCategory.useQuery({ category: "ticket_departments" });
  const { data: ticketStatusData }    = trpc.settings.getByCategory.useQuery({ category: "ticket_statuses" });
  const { data: ticketCannedData }    = trpc.settings.getByCategory.useQuery({ category: "ticket_canned" });
  const { data: kbGenData }           = trpc.settings.getByCategory.useQuery({ category: "kb_general" });
  const { data: kbCatData }           = trpc.settings.getByCategory.useQuery({ category: "kb_categories" });
  const { data: announGenData }       = trpc.settings.getByCategory.useQuery({ category: "announcements_general" });
  const { data: announListData }      = trpc.settings.getByCategory.useQuery({ category: "announcements_list" });
  const { data: goalsGenData }        = trpc.settings.getByCategory.useQuery({ category: "goals_general" });
  const { data: goalsCatData }        = trpc.settings.getByCategory.useQuery({ category: "goals_categories" });
  const { data: remindersGenData }    = trpc.settings.getByCategory.useQuery({ category: "reminders_general" });
  const { data: secPassData }         = trpc.settings.getByCategory.useQuery({ category: "security_password" });
  const { data: twofaData }           = trpc.settings.getByCategory.useQuery({ category: "security_2fa" });
  const { data: gdprGenData }         = trpc.settings.getByCategory.useQuery({ category: "gdpr_general" });
  const { data: gdprCookieData }      = trpc.settings.getByCategory.useQuery({ category: "gdpr_cookies" });
  const { data: smsSettingsData }     = trpc.settings.getByCategory.useQuery({ category: "sms_settings" });
  const { data: smsTplData }          = trpc.settings.getByCategory.useQuery({ category: "sms_templates" });
  const { data: pushGenData }         = trpc.settings.getByCategory.useQuery({ category: "push_general" });
  const { data: fcmData }             = trpc.settings.getByCategory.useQuery({ category: "push_fcm" });
  const { data: webhooksGenData }     = trpc.settings.getByCategory.useQuery({ category: "webhooks_general" });
  const { data: webhooksListData }    = trpc.settings.getByCategory.useQuery({ category: "webhooks_list" });
  const { data: apiGenData }          = trpc.settings.getByCategory.useQuery({ category: "api_general" });
  const { data: apiKeysData }         = trpc.settings.getByCategory.useQuery({ category: "api_keys" });
  const { data: cronGenData }         = trpc.settings.getByCategory.useQuery({ category: "cron_general" });
  const { data: cronJobsData }        = trpc.settings.getByCategory.useQuery({ category: "cron_jobs" });
  const { data: recaptchaData }       = trpc.settings.getByCategory.useQuery({ category: "recaptcha" });
  // New crm.africa queries
  const { data: pesapalData }         = trpc.settings.getByCategory.useQuery({ category: "payment_pesapal" });
  const { data: mollieData }          = trpc.settings.getByCategory.useQuery({ category: "payment_mollie" });
  const { data: tapPayData }          = trpc.settings.getByCategory.useQuery({ category: "payment_tappay" });
  const { data: airtelData }          = trpc.settings.getByCategory.useQuery({ category: "payment_airtel" });
  const { data: mtnMomoData }         = trpc.settings.getByCategory.useQuery({ category: "payment_mtnmomo" });
  const { data: inventoryGenData }    = trpc.settings.getByCategory.useQuery({ category: "inventory_general" });
  const { data: inventoryCatData }    = trpc.settings.getByCategory.useQuery({ category: "inventory_categories" });
  const { data: inventoryStockData }  = trpc.settings.getByCategory.useQuery({ category: "inventory_stock" });
  const { data: servicesGenData }     = trpc.settings.getByCategory.useQuery({ category: "services_general" });
  const { data: servicesCatData }     = trpc.settings.getByCategory.useQuery({ category: "services_categories" });
  const { data: servicesCheckoutData }= trpc.settings.getByCategory.useQuery({ category: "services_checkout" });
  const { data: esignGenData }        = trpc.settings.getByCategory.useQuery({ category: "esign_general" });
  const { data: esignProvidersData }  = trpc.settings.getByCategory.useQuery({ category: "esign_providers" });
  const { data: esignTemplatesData }  = trpc.settings.getByCategory.useQuery({ category: "esign_templates" });
  const { data: docTemplatesData }    = trpc.settings.getByCategory.useQuery({ category: "document_templates" });
  const { data: emarketingGenData }   = trpc.settings.getByCategory.useQuery({ category: "emarketing_general" });
  const { data: emarketingListsData } = trpc.settings.getByCategory.useQuery({ category: "emarketing_lists" });
  const { data: portalGenData }       = trpc.settings.getByCategory.useQuery({ category: "portal_general" });
  const { data: portalBrandData }     = trpc.settings.getByCategory.useQuery({ category: "portal_branding" });
  const { data: portalPermsData }     = trpc.settings.getByCategory.useQuery({ category: "portal_permissions" });
  const { data: portalModulesData }   = trpc.settings.getByCategory.useQuery({ category: "portal_modules" });
  const { data: themeData }           = trpc.settings.getByCategory.useQuery({ category: "theme_settings" });
  const { data: companyLogosData }    = trpc.settings.getByCategory.useQuery({ category: "company_logos" });
  const { data: purchasingData }      = trpc.settings.getByCategory.useQuery({ category: "purchasing_settings" });
  const { data: servicesPaypalData }  = trpc.settings.getByCategory.useQuery({ category: "services_paypal" });
  const { data: projTeamPermsData }   = trpc.settings.getByCategory.useQuery({ category: "projects_team_perms" });
  const { data: projClientPermsData } = trpc.settings.getByCategory.useQuery({ category: "projects_client_perms" });
  const { data: projAutoData }        = trpc.settings.getByCategory.useQuery({ category: "projects_automation" });
  const { data: estAutoData }         = trpc.settings.getByCategory.useQuery({ category: "estimates_automation" });
  const { data: propAutoData }        = trpc.settings.getByCategory.useQuery({ category: "proposals_automation" });
  const { data: contAutoData }        = trpc.settings.getByCategory.useQuery({ category: "contracts_automation" });
  const { data: tweakData }           = trpc.settings.getByCategory.useQuery({ category: "tweak_settings" });
  const { data: permissionsData }     = trpc.settings.getByCategory.useQuery({ category: "permissions" });
  const { data: planPriceData }        = trpc.multiTenancy.getPlanPrices.useQuery(undefined, { staleTime: 60_000 });

  // ── Inline page queries ──────────────────────────────────────────────────
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: pricingTiers = [], isLoading: tiersLoading } = trpc.enterpriseTenants.getPricingTiers.useQuery(undefined, {
    enabled: currentUser?.role === 'super_admin',
    staleTime: 60_000,
  });
  const { data: integrationsData, refetch: refetchIntegrations } = trpc.thirdPartyIntegrations.listIntegrations.useQuery();
  const configureIntegration = trpc.thirdPartyIntegrations.configureIntegration.useMutation({ onSuccess: () => { toast.success("Integration configured"); refetchIntegrations(); setIntAddOpen(false); }, onError: (e: any) => toast.error(e.message) });
  const deleteIntegration = trpc.thirdPartyIntegrations.deleteIntegration.useMutation({ onSuccess: () => { toast.success("Integration removed"); refetchIntegrations(); }, onError: (e: any) => toast.error(e.message) });
  const testIntegration = trpc.thirdPartyIntegrations.testIntegration.useMutation({ onSuccess: () => toast.success("Integration test passed"), onError: (e: any) => toast.error(e.message) });

  const { data: workflowsData, refetch: refetchWorkflows } = trpc.workflows.list.useQuery();
  const { data: wfTemplatesData } = trpc.workflows.getTemplates.useQuery();
  const createWorkflow = trpc.workflows.create.useMutation({ onSuccess: () => { toast.success("Workflow created"); refetchWorkflows(); setWfCreateOpen(false); }, onError: (e: any) => toast.error(e.message) });

  const { data: healthStatus } = trpc.systemHealth.getStatus.useQuery(undefined, { refetchInterval: 30000, enabled: activeSection === "system-health" });
  const { data: healthComponents } = trpc.systemHealth.getComponents.useQuery(undefined, { refetchInterval: 30000, enabled: activeSection === "system-health" });
  const { data: healthMetrics } = trpc.systemHealth.getMetrics.useQuery(undefined, { refetchInterval: 15000, enabled: activeSection === "system-health" });



  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateCompanyMutation = trpc.settings.updateCompanyInfo.useMutation({
    onSuccess: () => { toast.success("Company info saved"); refetchCompany(); },
    onError: (e) => toast.error(e.message),
  });
  const updateDocPrefixMutation = trpc.settings.updateDocumentPrefix.useMutation({
    onSuccess: () => { toast.success("Prefix updated"); refetchDocs(); },
    onError: (e) => toast.error(e.message),
  });
  const updateNotifyMutation = trpc.settings.updateNotificationPreferences.useMutation({
    onSuccess: () => toast.success("Notification preferences saved"),
    onError: (e) => toast.error(e.message),
  });
  const updateByCategory = trpc.settings.updateByCategory.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      utils.settings.getPublicSettings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const utils = trpc.useUtils();

  // ── Populate state from queries ────────────────────────────────────────────
  useEffect(() => {
    if (companyData) {
      setCompanyInfo({
        companyName:        (companyData as any).companyName        || "",
        companyEmail:       (companyData as any).companyEmail       || "",
        companyPhone:       (companyData as any).companyPhone       || "",
        companyWebsite:     (companyData as any).companyWebsite     || "",
        companyAddress:     (companyData as any).companyAddress     || "",
        companyCity:        (companyData as any).companyCity        || "",
        companyCountry:     (companyData as any).companyCountry     || "Kenya",
        companyPostalCode:  (companyData as any).companyPostalCode  || "",
        taxId:              (companyData as any).taxId              || "",
        registrationNumber: (companyData as any).registrationNumber || "",
        companyLogo:        (companyData as any).companyLogo        || "",
      });
    }
  }, [companyData]);

  useEffect(() => {
    if (docData) {
      setDocumentNumbers({
        invoicePrefix:  (docData as any).invoice_prefix  || "INV",
        estimatePrefix: (docData as any).estimate_prefix || "EST",
        receiptPrefix:  (docData as any).receipt_prefix  || "REC",
        proposalPrefix: (docData as any).proposal_prefix || "PROP",
        expensePrefix:  (docData as any).expense_prefix  || "EXP",
      });
    }
  }, [docData]);

  useEffect(() => {
    if (notifyData) setNotifyPrefs((p) => ({ ...p, ...notifyData }));
  }, [notifyData]);

  useEffect(() => {
    if (generalData) {
      setGeneral({
        timezone:            generalData.timezone            || "Africa/Nairobi",
        dateFormat:          generalData.dateFormat          || "d-m-Y",
        dateSelectorFormat:  generalData.dateSelectorFormat  || "dd-mm-yyyy",
        leftMenuPosition:    generalData.leftMenuPosition    || "Collapsed",
        statsPanelPosition:  generalData.statsPanelPosition  || "Collapsed",
        tablePageSize:       generalData.tablePageSize       || "35",
        kanbanPageSize:      generalData.kanbanPageSize      || "35",
        closeModalOnClick:   generalData.closeModalOnClick   || "no",
        sessionTimeout:      generalData.sessionTimeout      || "enabled",
        language:            generalData.language            || "en",
        allowLanguageChange: generalData.allowLanguageChange || "yes",
        exportStripHtml:     generalData.exportStripHtml     || "yes",
      });
    }
  }, [generalData]);

  useEffect(() => {
    if (appearanceData) {
      setAppearance({
        theme:        appearanceData.theme        || "light",
        primaryColor: appearanceData.primaryColor || "#3b82f6",
      });
    }
  }, [appearanceData]);

  useEffect(() => {
    if (emailData) {
      setEmailSettings({
        mailDriver: emailData.mailDriver || "smtp",
        smtpHost:   emailData.smtpHost   || "",
        smtpPort:   emailData.smtpPort   || "587",
        smtpUser:   emailData.smtpUser   || "",
        smtpPass:   emailData.smtpPass   || "",
        fromName:   emailData.fromName   || "",
        fromEmail:  emailData.fromEmail  || "",
        replyTo:    emailData.replyTo    || "",
      });
    }
  }, [emailData]);

  useEffect(() => {
    if (invoiceData) {
      setInvoiceSettings({
        invoicePrefix:       invoiceData.invoicePrefix       || "INV",
        defaultDueDays:      invoiceData.defaultDueDays      || "7",
        overdueDays1:        invoiceData.overdueDays1        || "1",
        overdueDays2:        invoiceData.overdueDays2        || "7",
        overdueDays3:        invoiceData.overdueDays3        || "14",
        taxMode:             invoiceData.taxMode             || "summary",
        termsAndConditions:  invoiceData.termsAndConditions  || "",
        showProjectTitle:    invoiceData.showProjectTitle    === "true",
        showViewedIndicator: invoiceData.showViewedIndicator !== "false",
      });
    }
  }, [invoiceData]);

  useEffect(() => {
    if (bankPayData) {
      setBankPayment({
        enabled:     bankPayData.enabled     === "true",
        displayName: bankPayData.displayName || "Bank Transfer",
        details:     bankPayData.details     || "",
      });
    }
  }, [bankPayData]);

  useEffect(() => {
    if (stripeData) {
      setStripeSettings({
        enabled:        stripeData.enabled        === "true",
        publishableKey: stripeData.publishableKey || "",
        secretKey:      stripeData.secretKey      || "",
      });
    }
  }, [stripeData]);

  useEffect(() => {
    if (mpesaData) {
      setMpesaSettings({
        enabled:        mpesaData.enabled        === "true",
        consumerKey:    mpesaData.consumerKey     || "",
        consumerSecret: mpesaData.consumerSecret  || "",
        paybillNumber:  mpesaData.paybillNumber   || "",
        passkey:        mpesaData.passkey         || "",
        callbackUrl:    mpesaData.callbackUrl     || "",
      });
    }
  }, [mpesaData]);

  useEffect(() => {
    if (taxData) {
      try { setTaxRates(JSON.parse(taxData.rates || "[]")); }
      catch { setTaxRates([]); }
    }
  }, [taxData]);

  useEffect(() => {
    if (tagsData) {
      try { setTags(JSON.parse(tagsData.list || "[]")); }
      catch { setTags([]); }
    }
  }, [tagsData]);

  // ── New category effects ────────────────────────────────────────────────────
  useEffect(() => { if (currencyData)      setCurrency({ defaultCurrency: currencyData.defaultCurrency || "KES", symbolPosition: currencyData.symbolPosition || "before", thousandsSep: currencyData.thousandsSep || ",", decimalSep: currencyData.decimalSep || ".", decimalPlaces: currencyData.decimalPlaces || "2" }); }, [currencyData]);
  useEffect(() => { if (flutterwaveData)   setFlutterwave({ enabled: flutterwaveData.enabled === "true", publicKey: flutterwaveData.publicKey || "", secretKey: flutterwaveData.secretKey || "" }); }, [flutterwaveData]);
  useEffect(() => { if (razorpayData)      setRazorpay({ enabled: razorpayData.enabled === "true", keyId: razorpayData.keyId || "", keySecret: razorpayData.keySecret || "" }); }, [razorpayData]);
  useEffect(() => { if (paypalData)        setPaypal({ enabled: paypalData.enabled === "true", clientId: paypalData.clientId || "", clientSecret: paypalData.clientSecret || "", mode: paypalData.mode || "sandbox" }); }, [paypalData]);
  useEffect(() => { if (paystackData)      setPaystack({ enabled: paystackData.enabled === "true", publicKey: paystackData.publicKey || "", secretKey: paystackData.secretKey || "" }); }, [paystackData]);
  useEffect(() => { if (clientsGenData)    setClientsGeneral({ allowRegistration: clientsGenData.allowRegistration === "true", requireApproval: clientsGenData.requireApproval !== "false", showPortalLogin: clientsGenData.showPortalLogin !== "false", portalUrl: clientsGenData.portalUrl || "" }); }, [clientsGenData]);
  useEffect(() => { if (clientsCatData)    setClientsCategories(parseList(clientsCatData.list)); }, [clientsCatData]);
  useEffect(() => { if (projGenData)       setProjectsGeneral({ allowClientComments: projGenData.allowClientComments !== "false", allowClientBilling: projGenData.allowClientBilling === "true", notifyOnTaskCreate: projGenData.notifyOnTaskCreate !== "false", defaultBillingType: projGenData.defaultBillingType || "fixed" }); }, [projGenData]);
  useEffect(() => { if (projCatData)       setProjectsCategories(parseList(projCatData.list)); }, [projCatData]);
  useEffect(() => { if (tasksGenData)      setTasksGeneral({ enableMultipleCheckboxes: tasksGenData.enableMultipleCheckboxes === "true", notifyAssigneeByEmail: tasksGenData.notifyAssigneeByEmail !== "false", defaultStatus: tasksGenData.defaultStatus || "not_started" }); }, [tasksGenData]);
  useEffect(() => { if (taskStatusData)    setTaskStatuses(parseList(taskStatusData.list)); }, [taskStatusData]);
  useEffect(() => { if (taskPriorityData)  setTaskPriorities(parseList(taskPriorityData.list)); }, [taskPriorityData]);
  useEffect(() => { if (leadsGenData)      setLeadsGeneral({ requireSource: leadsGenData.requireSource === "true", requireCategory: leadsGenData.requireCategory === "true", defaultStage: leadsGenData.defaultStage || "new" }); }, [leadsGenData]);
  useEffect(() => { if (leadsCatData)      setLeadsCategories(parseList(leadsCatData.list)); }, [leadsCatData]);
  useEffect(() => { if (leadStageData)     setLeadStages(parseList(leadStageData.list)); }, [leadStageData]);
  useEffect(() => { if (leadSourceData)    setLeadSources(parseList(leadSourceData.list)); }, [leadSourceData]);
  useEffect(() => { if (milestonesGenData) setMilestonesGeneral({ notifyOnCreate: milestonesGenData.notifyOnCreate !== "false", clientVisible: milestonesGenData.clientVisible === "true" }); }, [milestonesGenData]);
  useEffect(() => { if (defaultMilData)    setDefaultMilestones(parseList(defaultMilData.list)); }, [defaultMilData]);
  useEffect(() => { if (invCatData)        setInvoicesCategories(parseList(invCatData.list)); }, [invCatData]);
  useEffect(() => { if (invStatusData)     setInvoicesStatuses(parseList(invStatusData.list)); }, [invStatusData]);
  useEffect(() => { if (estGenData)        setEstimatesGeneral({ allowClientApproval: estGenData.allowClientApproval !== "false", expiryDays: estGenData.expiryDays || "30" }); }, [estGenData]);
  useEffect(() => { if (estCatData)        setEstimateCategories(parseList(estCatData.list)); }, [estCatData]);
  useEffect(() => { if (tsGenData)         setTimesheetsGeneral({ requireNotes: tsGenData.requireNotes === "true", notifyPM: tsGenData.notifyPM !== "false", roundingMinutes: tsGenData.roundingMinutes || "0" }); }, [tsGenData]);
  useEffect(() => { if (propGenData)       setProposalsGeneral({ allowEsign: propGenData.allowEsign !== "false", expiryDays: propGenData.expiryDays || "30" }); }, [propGenData]);
  useEffect(() => { if (propCatData)       setProposalCategories(parseList(propCatData.list)); }, [propCatData]);
  useEffect(() => { if (contGenData)       setContractsGeneral({ allowEsign: contGenData.allowEsign !== "false", expiryReminderDays: contGenData.expiryReminderDays || "7" }); }, [contGenData]);
  useEffect(() => { if (contCatData)       setContractCategories(parseList(contCatData.list)); }, [contCatData]);
  useEffect(() => { if (prodCatData)       setProductsCategories(parseList(prodCatData.list)); }, [prodCatData]);
  useEffect(() => { if (prodUnitData)      setProductUnits(parseList(prodUnitData.list)); }, [prodUnitData]);
  useEffect(() => { if (expGenData)        setExpensesGeneral({ requireReceipt: expGenData.requireReceipt === "true", autoApproveBelow: expGenData.autoApproveBelow || "0" }); }, [expGenData]);
  useEffect(() => { if (expCatData)        setExpenseCategories(parseList(expCatData.list)); }, [expCatData]);
  useEffect(() => { if (subsGenData)       setSubsGeneral({ taxInclusive: subsGenData.taxInclusive === "true", roundAmounts: subsGenData.roundAmounts !== "false" }); }, [subsGenData]);
  useEffect(() => { if (tagsGenData)       setTagsGeneral({ allowUserCreate: tagsGenData.allowUserCreate !== "false", autoLowercase: tagsGenData.autoLowercase !== "false" }); }, [tagsGenData]);
  useEffect(() => { if (filesGenData)      setFilesGeneral({ maxSizeMb: filesGenData.maxSizeMb || "10", allowedTypes: filesGenData.allowedTypes || "pdf,doc,docx,xls,xlsx,png,jpg,jpeg", maxFilesPerUpload: filesGenData.maxFilesPerUpload || "10" }); }, [filesGenData]);
  useEffect(() => { if (fileFolderData)    setFileFolders(parseList(fileFolderData.list)); }, [fileFolderData]);
  useEffect(() => { if (defaultFolderData) setDefaultFolders(parseList(defaultFolderData.list)); }, [defaultFolderData]);
  useEffect(() => { if (ticketsGenData)    setTicketsGeneral({ allowClientTickets: ticketsGenData.allowClientTickets !== "false", autoAssign: ticketsGenData.autoAssign === "true", notifyAgents: ticketsGenData.notifyAgents !== "false", closeAfterDays: ticketsGenData.closeAfterDays || "7" }); }, [ticketsGenData]);
  useEffect(() => { if (ticketDeptData)    setTicketDepts(parseList(ticketDeptData.list)); }, [ticketDeptData]);
  useEffect(() => { if (ticketStatusData)  setTicketStatuses(parseList(ticketStatusData.list)); }, [ticketStatusData]);
  useEffect(() => { if (ticketCannedData)  setTicketCanned(parseList(ticketCannedData.list)); }, [ticketCannedData]);
  useEffect(() => { if (kbGenData)         setKbGeneral({ guestAccess: kbGenData.guestAccess !== "false", enableComments: kbGenData.enableComments !== "false", articlesPerPage: kbGenData.articlesPerPage || "10" }); }, [kbGenData]);
  useEffect(() => { if (kbCatData)         setKbCategories(parseList(kbCatData.list)); }, [kbCatData]);
  useEffect(() => { if (announGenData)     setAnnouncementsGeneral({ enabled: announGenData.enabled !== "false", defaultAudienceAll: announGenData.defaultAudienceAll !== "false" }); }, [announGenData]);
  useEffect(() => { if (announListData)    setAnnouncementsList(parseList(announListData.list)); }, [announListData]);
  useEffect(() => { if (goalsGenData)      setGoalsGeneral({ enableModule: goalsGenData.enableModule !== "false", allowTeamGoals: goalsGenData.allowTeamGoals !== "false" }); }, [goalsGenData]);
  useEffect(() => { if (goalsCatData)      setGoalsCategories(parseList(goalsCatData.list)); }, [goalsCatData]);
  useEffect(() => { if (remindersGenData)  setRemindersGeneral({ defaultMinutesBefore: remindersGenData.defaultMinutesBefore || "15", emailChannel: remindersGenData.emailChannel !== "false", pushChannel: remindersGenData.pushChannel === "true", smsChannel: remindersGenData.smsChannel === "true" }); }, [remindersGenData]);
  useEffect(() => { if (secPassData)       setSecurityPassword({ minLength: secPassData.minLength || "8", requireUppercase: secPassData.requireUppercase !== "false", requireNumbers: secPassData.requireNumbers !== "false", requireSpecial: secPassData.requireSpecial === "true", expiryDays: secPassData.expiryDays || "0" }); }, [secPassData]);
  useEffect(() => { if (twofaData)         setTwofa({ enabled: twofaData.enabled === "true", requireForAdmins: twofaData.requireForAdmins === "true", method: twofaData.method || "totp" }); }, [twofaData]);
  useEffect(() => { if (gdprGenData)       setGdprGeneral({ enabled: gdprGenData.enabled === "true", retentionDays: gdprGenData.retentionDays || "365" }); }, [gdprGenData]);
  useEffect(() => { if (gdprCookieData)    setGdprCookies({ bannerEnabled: gdprCookieData.bannerEnabled !== "false", analyticsEnabled: gdprCookieData.analyticsEnabled !== "false", marketingEnabled: gdprCookieData.marketingEnabled === "true" }); }, [gdprCookieData]);
  useEffect(() => { if (smsSettingsData)   setSmsSettings({ provider: smsSettingsData.provider || "twilio", accountSid: smsSettingsData.accountSid || "", authToken: smsSettingsData.authToken || "", fromNumber: smsSettingsData.fromNumber || "", atApiKey: smsSettingsData.atApiKey || "", atUsername: smsSettingsData.atUsername || "" }); }, [smsSettingsData]);
  useEffect(() => { if (smsTplData)        setSmsTemplates(parseList(smsTplData.list)); }, [smsTplData]);
  useEffect(() => { if (pushGenData)       setPushGeneral({ enabled: pushGenData.enabled === "true" }); }, [pushGenData]);
  useEffect(() => { if (fcmData)           setFcmSettings({ serverKey: fcmData.serverKey || "", senderId: fcmData.senderId || "", vapidKey: fcmData.vapidKey || "" }); }, [fcmData]);
  useEffect(() => { if (webhooksGenData)   setWebhooksGeneral({ enabled: webhooksGenData.enabled === "true", maxRetries: webhooksGenData.maxRetries || "3" }); }, [webhooksGenData]);
  useEffect(() => { if (webhooksListData)  setWebhooksList(parseList(webhooksListData.list)); }, [webhooksListData]);
  useEffect(() => { if (apiGenData)        setApiGeneral({ enabled: apiGenData.enabled !== "false", rateLimit: apiGenData.rateLimit || "100", rateLimitPer: apiGenData.rateLimitPer || "minute" }); }, [apiGenData]);
  useEffect(() => { if (apiKeysData)       setApiKeys(parseList(apiKeysData.list)); }, [apiKeysData]);
  useEffect(() => { if (cronGenData)       setCronGeneral({ enabled: cronGenData.enabled !== "false", defaultSchedule: cronGenData.defaultSchedule || "0 * * * *" }); }, [cronGenData]);
  useEffect(() => { if (cronJobsData)      setCronJobs(parseList(cronJobsData.list)); }, [cronJobsData]);
  useEffect(() => { if (recaptchaData)     setRecaptcha({ version: recaptchaData.version || "v2", siteKey: recaptchaData.siteKey || "", secretKey: recaptchaData.secretKey || "" }); }, [recaptchaData]);
  // ── crm.africa effects ──
  useEffect(() => { if (pesapalData)        setPesapal({ enabled: pesapalData.enabled === "true", consumerKey: pesapalData.consumerKey || "", consumerSecret: pesapalData.consumerSecret || "", environment: pesapalData.environment || "sandbox" }); }, [pesapalData]);
  useEffect(() => { if (mollieData)         setMollie({ enabled: mollieData.enabled === "true", apiKey: mollieData.apiKey || "", testMode: mollieData.testMode !== "false" }); }, [mollieData]);
  useEffect(() => { if (tapPayData)         setTapPay({ enabled: tapPayData.enabled === "true", merchantId: tapPayData.merchantId || "", apiKey: tapPayData.apiKey || "", environment: tapPayData.environment || "sandbox" }); }, [tapPayData]);
  useEffect(() => { if (airtelData)         setAirtelMoney({ enabled: airtelData.enabled === "true", clientId: airtelData.clientId || "", clientSecret: airtelData.clientSecret || "", environment: airtelData.environment || "sandbox" }); }, [airtelData]);
  useEffect(() => { if (mtnMomoData)        setMtnMomo({ enabled: mtnMomoData.enabled === "true", subscriptionKey: mtnMomoData.subscriptionKey || "", apiUser: mtnMomoData.apiUser || "", apiKey: mtnMomoData.apiKey || "", environment: mtnMomoData.environment || "sandbox" }); }, [mtnMomoData]);
  useEffect(() => { if (inventoryGenData)   setInventoryGeneral({ trackStock: inventoryGenData.trackStock !== "false", lowStockThreshold: inventoryGenData.lowStockThreshold || "10", autoReorder: inventoryGenData.autoReorder === "true", defaultWarehouse: inventoryGenData.defaultWarehouse || "" }); }, [inventoryGenData]);
  useEffect(() => { if (inventoryCatData)   setInventoryCategories(parseList(inventoryCatData.list)); }, [inventoryCatData]);
  useEffect(() => { if (inventoryStockData) setInventoryStock({ method: inventoryStockData.method || "fifo", allowNegative: inventoryStockData.allowNegative === "true", barcodeEnabled: inventoryStockData.barcodeEnabled === "true" }); }, [inventoryStockData]);
  useEffect(() => { if (servicesGenData)    setServicesGeneral({ enabled: servicesGenData.enabled !== "false", showPricing: servicesGenData.showPricing !== "false", allowOnlineBooking: servicesGenData.allowOnlineBooking === "true", bookingUrl: servicesGenData.bookingUrl || "" }); }, [servicesGenData]);
  useEffect(() => { if (servicesCatData)    setServicesCategories(parseList(servicesCatData.list)); }, [servicesCatData]);
  useEffect(() => { if (servicesCheckoutData) setServicesCheckout({ enabled: servicesCheckoutData.enabled === "true", requireLogin: servicesCheckoutData.requireLogin !== "false", allowGuestCheckout: servicesCheckoutData.allowGuestCheckout === "true", termsUrl: servicesCheckoutData.termsUrl || "" }); }, [servicesCheckoutData]);
  useEffect(() => { if (esignGenData)       setEsignGeneral({ enabled: esignGenData.enabled === "true", provider: esignGenData.provider || "built-in", requireAuth: esignGenData.requireAuth !== "false", expiryDays: esignGenData.expiryDays || "30" }); }, [esignGenData]);
  useEffect(() => { if (esignProvidersData) setEsignProviders({ docusign: esignProvidersData.docusign === "true", docusignApiKey: esignProvidersData.docusignApiKey || "", hellosign: esignProvidersData.hellosign === "true", hellosignApiKey: esignProvidersData.hellosignApiKey || "" }); }, [esignProvidersData]);
  useEffect(() => { if (esignTemplatesData) setEsignTemplates(parseList(esignTemplatesData.list)); }, [esignTemplatesData]);
  useEffect(() => { if (docTemplatesData)   setDocTemplates({ invoice: docTemplatesData.invoice || "", receipt: docTemplatesData.receipt || "", estimate: docTemplatesData.estimate || "" }); }, [docTemplatesData]);
  useEffect(() => { if (emarketingGenData)  setEmarketingGeneral({ enabled: emarketingGenData.enabled === "true", provider: emarketingGenData.provider || "built-in", unsubscribeUrl: emarketingGenData.unsubscribeUrl || "", fromName: emarketingGenData.fromName || "", fromEmail: emarketingGenData.fromEmail || "" }); }, [emarketingGenData]);
  useEffect(() => { if (emarketingListsData) setEmarketingLists(parseList(emarketingListsData.list)); }, [emarketingListsData]);
  useEffect(() => { if (portalGenData)      setPortalGeneral({ enabled: portalGenData.enabled !== "false", requireApproval: portalGenData.requireApproval !== "false", showInvoices: portalGenData.showInvoices !== "false", showProjects: portalGenData.showProjects !== "false", showTickets: portalGenData.showTickets !== "false", customDomain: portalGenData.customDomain || "" }); }, [portalGenData]);
  useEffect(() => { if (portalBrandData)    setPortalBranding({ logoUrl: portalBrandData.logoUrl || "", primaryColor: portalBrandData.primaryColor || "#3b82f6", welcomeMessage: portalBrandData.welcomeMessage || "", portalTitle: portalBrandData.portalTitle || "" }); }, [portalBrandData]);
  useEffect(() => { if (portalPermsData)    setPortalPermissions({ viewInvoices: portalPermsData.viewInvoices !== "false", payOnline: portalPermsData.payOnline !== "false", createTickets: portalPermsData.createTickets !== "false", viewProjects: portalPermsData.viewProjects !== "false", downloadFiles: portalPermsData.downloadFiles !== "false", viewEstimates: portalPermsData.viewEstimates !== "false" }); }, [portalPermsData]);
  useEffect(() => { if (portalModulesData)  setPortalModules({ invoices: portalModulesData.invoices !== "false", estimates: portalModulesData.estimates !== "false", projects: portalModulesData.projects !== "false", tickets: portalModulesData.tickets !== "false", contracts: portalModulesData.contracts !== "false", knowledgebase: portalModulesData.knowledgebase !== "false", announcements: portalModulesData.announcements !== "false" }); }, [portalModulesData]);

  useEffect(() => {
      if (themeData) {
        const savedColorMode = (themeData.colorMode === "dark" ? "dark" : "light") as "light" | "dark";
        setThemeSettings({ mainTheme: themeData.mainTheme || "Default", resetUsersTheme: themeData.resetUsersTheme === "true", primaryColor: themeData.primaryColor || "#3b82f6", sidebarColor: themeData.sidebarColor || "#1e293b", headerColor: themeData.headerColor || "#ffffff", fontFamily: themeData.fontFamily || "Inter", borderRadius: themeData.borderRadius || "8", sidebarStyle: themeData.sidebarStyle || "dark", compactMode: themeData.compactMode === "true", htmlHead: themeData.htmlHead || "", htmlBody: themeData.htmlBody || "", cssStyle: themeData.cssStyle || "", colorMode: savedColorMode });
        setTheme(savedColorMode);
      }
  }, [themeData]);
  useEffect(() => {
    if (companyLogosData) setCompanyLogos({ largeLogo: companyLogosData.largeLogo || "", smallLogo: companyLogosData.smallLogo || "" });
  }, [companyLogosData]);
  useEffect(() => {
    if (purchasingData) setPurchasingSettings({ enabled: purchasingData.enabled !== "false", defaultTaxRate: purchasingData.defaultTaxRate || "", approvalRequired: purchasingData.approvalRequired !== "false", defaultPaymentTerms: purchasingData.defaultPaymentTerms || "30" });
  }, [purchasingData]);
  useEffect(() => { if (projTeamPermsData) setProjTeamPerms({ viewOtherTasks: projTeamPermsData.viewOtherTasks === "true", editProject: projTeamPermsData.editProject === "true", deleteTasks: projTeamPermsData.deleteTasks === "true", manageMilestones: projTeamPermsData.manageMilestones === "true", viewBudget: projTeamPermsData.viewBudget === "true", createSubtasks: projTeamPermsData.createSubtasks === "true" }); }, [projTeamPermsData]);
  useEffect(() => { if (projClientPermsData) setProjClientPerms({ viewProgress: projClientPermsData.viewProgress === "true", viewTasks: projClientPermsData.viewTasks === "true", createTasks: projClientPermsData.createTasks === "true", commentTasks: projClientPermsData.commentTasks === "true", viewTeam: projClientPermsData.viewTeam === "true", uploadFiles: projClientPermsData.uploadFiles === "true", viewInvoices: projClientPermsData.viewInvoices === "true" }); }, [projClientPermsData]);
  useEffect(() => { if (projAutoData) setProjAutomation({ autoComplete: projAutoData.autoComplete === "true", emailOnStatusChange: projAutoData.emailOnStatusChange === "true", defaultTaskList: projAutoData.defaultTaskList === "true", autoAssignPM: projAutoData.autoAssignPM === "true" }); }, [projAutoData]);
  useEffect(() => { if (estAutoData) setEstAutomation({ autoConvertToInvoice: estAutoData.autoConvertToInvoice === "true", emailOnExpiry: estAutoData.emailOnExpiry === "true", notifyOnApproval: estAutoData.notifyOnApproval === "true", autoAddTax: estAutoData.autoAddTax === "true" }); }, [estAutoData]);
  useEffect(() => { if (propAutoData) setPropAutomation({ autoConvertToProject: propAutoData.autoConvertToProject === "true", remindBeforeExpiry: propAutoData.remindBeforeExpiry === "true", notifyOnSignature: propAutoData.notifyOnSignature === "true", autoGenerateInvoice: propAutoData.autoGenerateInvoice === "true" }); }, [propAutoData]);
  useEffect(() => { if (contAutoData) setContAutomation({ emailBeforeExpiry: contAutoData.emailBeforeExpiry === "true", autoRenew: contAutoData.autoRenew === "true", notifyOnSignature: contAutoData.notifyOnSignature === "true", archiveExpired: contAutoData.archiveExpired === "true" }); }, [contAutoData]);
  useEffect(() => { if (tweakData) setTweakSettings({ showPoweredBy: tweakData.showPoweredBy === "true", forceHttps: tweakData.forceHttps === "true", debugMode: tweakData.debugMode === "true", maintenanceMode: tweakData.maintenanceMode === "true", customCss: tweakData.customCss || "", customJs: tweakData.customJs || "" }); }, [tweakData]);
  useEffect(() => {
    if (!permissionsData) return;
    const cats = [
      { key: "clients", perms: ["View", "Create", "Edit", "Delete", "Export"] },
      { key: "invoices", perms: ["View", "Create", "Edit", "Delete", "Send"] },
      { key: "projects", perms: ["View", "Create", "Edit", "Delete", "Manage Members"] },
      { key: "tasks", perms: ["View", "Create", "Edit", "Delete", "Assign"] },
      { key: "leads", perms: ["View", "Create", "Edit", "Delete", "Convert"] },
      { key: "estimates", perms: ["View", "Create", "Edit", "Delete", "Send"] },
      { key: "proposals", perms: ["View", "Create", "Edit", "Delete", "Send"] },
      { key: "contracts", perms: ["View", "Create", "Edit", "Delete", "Sign"] },
      { key: "expenses", perms: ["View", "Create", "Edit", "Delete", "Approve"] },
      { key: "tickets", perms: ["View", "Create", "Edit", "Delete", "Assign"] },
      { key: "reports", perms: ["View", "Export", "Schedule"] },
      { key: "settings", perms: ["View", "Modify"] },
    ];
    const init: Record<string, boolean> = {};
    cats.forEach(cat => cat.perms.forEach(p => {
      const k = `${cat.key}_${p.toLowerCase().replace(/\s+/g, "_")}`;
      init[k] = permissionsData[k] !== "false";
    }));
    setPermState(init);
  }, [permissionsData]);

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (isLoadingPermission) {
    return <div className="flex items-center justify-center h-screen"><Spinner className="size-8" /></div>;
  }
  if (!allowed) return null;

  // ── Save helpers ───────────────────────────────────────────────────────────
  // ── Default values for Reset to Default ──────────────────────────────────
  const DEFAULTS = {
    general: { timezone: "Africa/Nairobi", dateFormat: "d-m-Y", dateSelectorFormat: "dd-mm-yyyy", leftMenuPosition: "Collapsed", statsPanelPosition: "Collapsed", tablePageSize: "35", kanbanPageSize: "35", closeModalOnClick: "no", sessionTimeout: "enabled", language: "en", allowLanguageChange: "yes", exportStripHtml: "yes" },
    theme: { mainTheme: "Default", resetUsersTheme: false, primaryColor: "#3b82f6", sidebarColor: "#1e293b", headerColor: "#ffffff", fontFamily: "Inter", borderRadius: "8", sidebarStyle: "dark", compactMode: false, htmlHead: "", htmlBody: "", cssStyle: "", colorMode: "light" as "light" | "dark" },
  };

  const resetSection = (section: string) => {
    switch (section) {
      case "general":
        setGeneral(DEFAULTS.general);
        toast.success("General settings reset to defaults");
        break;
      case "theme":
        setThemeSettings(DEFAULTS.theme);
        updateThemeConfig({
          accentColor: DEFAULTS.theme.primaryColor,
          customLightPrimary: DEFAULTS.theme.primaryColor,
          customDarkPrimary: DEFAULTS.theme.primaryColor,
          customDarkBackground: DEFAULTS.theme.sidebarColor,
          customLightSurface: DEFAULTS.theme.headerColor,
          fontFamily: DEFAULTS.theme.fontFamily,
          borderRadius: DEFAULTS.theme.borderRadius,
        });
        setTheme("light");
        toast.success("Theme settings reset to defaults");
        break;
      default:
        toast.info("No defaults defined for this section");
    }
  };

  const resetAllSettings = async () => {
    setGeneral(DEFAULTS.general);
    setThemeSettings(DEFAULTS.theme);
    updateThemeConfig({
      accentColor: DEFAULTS.theme.primaryColor,
      customLightPrimary: DEFAULTS.theme.primaryColor,
      customDarkPrimary: DEFAULTS.theme.primaryColor,
      customDarkBackground: DEFAULTS.theme.sidebarColor,
      customLightSurface: DEFAULTS.theme.headerColor,
      fontFamily: DEFAULTS.theme.fontFamily,
      borderRadius: DEFAULTS.theme.borderRadius,
    });
    setTheme("light");
    toast.success("All settings have been reset to defaults");
  };

  const save = async (key: string, fn: () => Promise<any>) => {
    setSavingKey(key, true);
    try { await fn(); } finally { setSavingKey(key, false); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setCompanyInfo((p) => ({ ...p, companyLogo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const addTaxRate = () => {
    if (!newTax.name || !newTax.rate) { toast.error("Name and rate are required"); return; }
    const updated = [...taxRates, { id: crypto.randomUUID(), ...newTax }];
    setTaxRates(updated);
    setNewTax({ name: "", rate: "", description: "" });
    updateByCategory.mutate({ category: "tax_rates", values: { rates: JSON.stringify(updated) } });
  };

  const removeTaxRate = (id: string) => {
    const updated = taxRates.filter((t) => t.id !== id);
    setTaxRates(updated);
    updateByCategory.mutate({ category: "tax_rates", values: { rates: JSON.stringify(updated) } });
  };

  const addTag = () => {
    if (!newTag.name) { toast.error("Tag name is required"); return; }
    const updated = [...tags, { id: crypto.randomUUID(), ...newTag }];
    setTags(updated);
    setNewTag({ name: "", color: "#3b82f6" });
    updateByCategory.mutate({ category: "global_tags", values: { list: JSON.stringify(updated) } });
  };

  const removeTag = (id: string) => {
    const updated = tags.filter((t) => t.id !== id);
    setTags(updated);
    updateByCategory.mutate({ category: "global_tags", values: { list: JSON.stringify(updated) } });
  };

  // ── Right-panel content ────────────────────────────────────────────────────
  function renderContent() {
    switch (activeSection) {

      // ── GENERAL ──────────────────────────────────────────────────────────
      case "general":
        return (
          <Section title="General Settings" description="Configure system-wide defaults">
            <div className="space-y-4">
              <Field label="Time Zone">
                <Select value={general.timezone} onValueChange={(v) => setGeneral((p) => ({ ...p, timezone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Africa/Nairobi","Africa/Lagos","Africa/Cairo","Africa/Johannesburg","Africa/Casablanca","Europe/London","Europe/Paris","Europe/Berlin","America/New_York","America/Chicago","America/Los_Angeles","America/Sao_Paulo","Asia/Dubai","Asia/Kolkata","Asia/Shanghai","Asia/Tokyo","Australia/Sydney","Pacific/Auckland","UTC"].map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date Format">
                <Select value={general.dateFormat} onValueChange={(v) => setGeneral((p) => ({ ...p, dateFormat: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="d-m-Y">d-m-Y</SelectItem>
                    <SelectItem value="m-d-Y">m-d-Y</SelectItem>
                    <SelectItem value="Y-m-d">Y-m-d</SelectItem>
                    <SelectItem value="d/m/Y">d/m/Y</SelectItem>
                    <SelectItem value="m/d/Y">m/d/Y</SelectItem>
                    <SelectItem value="d.m.Y">d.m.Y</SelectItem>
                    <SelectItem value="D M d, Y">D M d, Y</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date Selector Format">
                <Select value={general.dateSelectorFormat} onValueChange={(v) => setGeneral((p) => ({ ...p, dateSelectorFormat: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd-mm-yyyy">dd-mm-yyyy</SelectItem>
                    <SelectItem value="mm-dd-yyyy">mm-dd-yyyy</SelectItem>
                    <SelectItem value="yyyy-mm-dd">yyyy-mm-dd</SelectItem>
                    <SelectItem value="dd/mm/yyyy">dd/mm/yyyy</SelectItem>
                    <SelectItem value="mm/dd/yyyy">mm/dd/yyyy</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Left Menu Position - Default Position">
                <Select value={general.leftMenuPosition} onValueChange={(v) => setGeneral((p) => ({ ...p, leftMenuPosition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Collapsed">Collapsed</SelectItem>
                    <SelectItem value="Expanded">Expanded</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Stats Panel - Default Position">
                <Select value={general.statsPanelPosition} onValueChange={(v) => setGeneral((p) => ({ ...p, statsPanelPosition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Collapsed">Collapsed</SelectItem>
                    <SelectItem value="Expanded">Expanded</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Table Pagination Limits">
                <Input type="number" min="5" max="200" value={general.tablePageSize} onChange={(e) => setGeneral((p) => ({ ...p, tablePageSize: e.target.value }))} />
              </Field>
              <Field label="Kanban Pagination Limits">
                <Input type="number" min="5" max="200" value={general.kanbanPageSize} onChange={(e) => setGeneral((p) => ({ ...p, kanbanPageSize: e.target.value }))} />
              </Field>
              <Field label="Close Modal Window On Page Click">
                <Select value={general.closeModalOnClick} onValueChange={(v) => setGeneral((p) => ({ ...p, closeModalOnClick: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Show session timeout popup">
                <Select value={general.sessionTimeout} onValueChange={(v) => setGeneral((p) => ({ ...p, sessionTimeout: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default Language">
                <Select value={general.language} onValueChange={(v) => setGeneral((p) => ({ ...p, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Allow Users To Change Language">
                <Select value={general.allowLanguageChange} onValueChange={(v) => setGeneral((p) => ({ ...p, allowLanguageChange: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Exporting Content - (Strip HTML)">
                <Select value={general.exportStripHtml} onValueChange={(v) => setGeneral((p) => ({ ...p, exportStripHtml: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex items-center">
              <SaveButton
                saving={!!saving.general}
                onClick={() => save("general", () => updateByCategory.mutateAsync({ category: "general", values: general }))}
              />
              <ResetButton onClick={() => resetSection("general")} />
            </div>
          </Section>
        );

      // ── COMPANY ──────────────────────────────────────────────────────────
      case "company":
        return (
          <Section title="Company Details" description="Information shown on invoices and documents">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company Name">
                <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={companyInfo.companyName}
                  onChange={(e) => setCompanyInfo((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Melitech Solutions" />
              </Field>
              <Field label="Registration Number">
                <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={companyInfo.registrationNumber}
                  onChange={(e) => setCompanyInfo((p) => ({ ...p, registrationNumber: e.target.value }))}
                  placeholder="C123456" />
              </Field>
              <Field label="Email">
                <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  type="email" value={companyInfo.companyEmail}
                  onChange={(e) => setCompanyInfo((p) => ({ ...p, companyEmail: e.target.value }))}
                  placeholder="info@company.com" />
              </Field>
              <Field label="Phone">
                <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={companyInfo.companyPhone}
                  onChange={(e) => setCompanyInfo((p) => ({ ...p, companyPhone: e.target.value }))}
                  placeholder="+254 700 000 000" />
              </Field>
              <Field label="Website">
                <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={companyInfo.companyWebsite}
                  onChange={(e) => setCompanyInfo((p) => ({ ...p, companyWebsite: e.target.value }))}
                  placeholder="www.company.com" />
              </Field>
              <Field label="Tax ID / KRA PIN">
                <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={companyInfo.taxId}
                  onChange={(e) => setCompanyInfo((p) => ({ ...p, taxId: e.target.value }))}
                  placeholder="A123456789X" />
              </Field>
            </div>
            <Field label="Physical Address">
              <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                rows={2} value={companyInfo.companyAddress}
                onChange={(e) => setCompanyInfo((p) => ({ ...p, companyAddress: e.target.value }))}
                placeholder="Street address" />
            </Field>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="City">
                <CitySelect value={companyInfo.companyCity} onChange={(v) => setCompanyInfo((p) => ({ ...p, companyCity: v }))} label="" />
              </Field>
              <Field label="Country">
                <CountrySelect value={companyInfo.companyCountry} onChange={(v) => setCompanyInfo((p) => ({ ...p, companyCountry: v }))} label="" />
              </Field>
              <Field label="Postal Code">
                <input className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={companyInfo.companyPostalCode}
                  onChange={(e) => setCompanyInfo((p) => ({ ...p, companyPostalCode: e.target.value }))}
                  placeholder="00100" />
              </Field>
            </div>
            <Separator />
            <Field label="Company Logo">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                  {companyInfo.companyLogo
                    ? <img src={companyInfo.companyLogo} alt="Logo" className="h-full w-full object-contain" />
                    : <Building2 className="h-7 w-7 text-muted-foreground" />}
                </div>
                <div className="space-y-1">
                  <input type="file" accept="image/*" onChange={handleLogoUpload}
                    title="Upload company logo" aria-label="Upload company logo" className="text-sm" />
                  <p className="text-xs text-muted-foreground">Square or horizontal. Max 2 MB.</p>
                </div>
              </div>
            </Field>
            <SaveButton
              saving={!!saving.company}
              onClick={() => save("company", () => mutateAsync(updateCompanyMutation, companyInfo))}
            />
          </Section>
        );

      // ── THEME (crm.africa) ─────────────────────────────────────────────
      case "theme": {
        const themePresets: Record<string, { primaryColor: string; sidebarColor: string; headerColor: string; fontFamily: string; borderRadius: string; sidebarStyle: string; description: string }> = {
          Default: { primaryColor: "#3b82f6", sidebarColor: "#1e293b", headerColor: "#ffffff", fontFamily: "Inter", borderRadius: "8", sidebarStyle: "dark", description: "Clean modern look with blue accents and a dark sidebar" },
          Prestige: { primaryColor: "#8b5cf6", sidebarColor: "#1e1b4b", headerColor: "#faf5ff", fontFamily: "Poppins", borderRadius: "12", sidebarStyle: "dark", description: "Premium corporate look with violet tones and refined typography" },
          Midnight: { primaryColor: "#38bdf8", sidebarColor: "#020617", headerColor: "#0f172a", fontFamily: "Inter", borderRadius: "8", sidebarStyle: "dark", description: "Full dark mode with sky-blue accents for low-light environments" },
                  "Dark Mode": { primaryColor: "#6366f1", sidebarColor: "#111827", headerColor: "#1f2937", fontFamily: "Inter", borderRadius: "8", sidebarStyle: "dark", description: "Full dark mode with indigo accents" },
        };
        const applyPreset = (name: string) => {
          const p = themePresets[name];
          const isDarkPreset = name === "Midnight" || name === "Dark Mode";
          if (p) setThemeSettings((prev) => ({ ...prev, mainTheme: name, ...p, colorMode: isDarkPreset ? "dark" : "light" }));
          else setThemeSettings((prev) => ({ ...prev, mainTheme: name, colorMode: isDarkPreset ? "dark" : "light" }));
        };
        return (
          <Section title="Theme & Appearance" description="Customize the look and feel of your CRM application">
            <div className="space-y-6">
              {/* Theme Preset */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Theme Preset</h4>
                <Field label="Main Theme">
                  <Select value={themeSettings.mainTheme} onValueChange={applyPreset}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Default">Default</SelectItem>
                      <SelectItem value="Prestige">Prestige</SelectItem>
                      <SelectItem value="Midnight">Midnight</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {/* Visual Preview Cards */}
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(themePresets).map(([name, preset]) => (
                    <button key={name} type="button" onClick={() => applyPreset(name)}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${themeSettings.mainTheme === name ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
                      <div className="flex gap-1.5 mb-2 h-8 rounded overflow-hidden">
                        <div className="w-6 rounded-sm" style={{ backgroundColor: preset.sidebarColor }} />
                        <div className="flex-1 rounded-sm flex flex-col">
                          <div className="h-2 rounded-t-sm" style={{ backgroundColor: preset.headerColor, border: preset.headerColor === "#ffffff" ? "1px solid #e2e8f0" : "none" }} />
                          <div className="flex-1 rounded-b-sm" style={{ backgroundColor: preset.headerColor === "#ffffff" ? "#f8fafc" : preset.headerColor === "#faf5ff" ? "#f5f3ff" : "#1e293b" }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primaryColor }} />
                        <span className="text-sm font-semibold">{name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-tight">{preset.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={themeSettings.resetUsersTheme}
                    onChange={(e) => setThemeSettings((p) => ({ ...p, resetUsersTheme: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300" id="reset-theme" />
                  <label htmlFor="reset-theme" className="text-sm cursor-pointer">Reset all users to this theme</label>
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Colors</h4>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Primary Color">
                    <div className="flex items-center gap-2">
                      <input type="color" value={themeSettings.primaryColor} onChange={(e) => setThemeSettings((p) => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                      <Input value={themeSettings.primaryColor} onChange={(e) => setThemeSettings((p) => ({ ...p, primaryColor: e.target.value }))} className="flex-1" />
                    </div>
                  </Field>
                  <Field label="Sidebar Color">
                    <div className="flex items-center gap-2">
                      <input type="color" value={themeSettings.sidebarColor} onChange={(e) => setThemeSettings((p) => ({ ...p, sidebarColor: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                      <Input value={themeSettings.sidebarColor} onChange={(e) => setThemeSettings((p) => ({ ...p, sidebarColor: e.target.value }))} className="flex-1" />
                    </div>
                  </Field>
                  <Field label="Header Color">
                    <div className="flex items-center gap-2">
                      <input type="color" value={themeSettings.headerColor} onChange={(e) => setThemeSettings((p) => ({ ...p, headerColor: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                      <Input value={themeSettings.headerColor} onChange={(e) => setThemeSettings((p) => ({ ...p, headerColor: e.target.value }))} className="flex-1" />
                    </div>
                  </Field>
                </div>
              </div>

              {/* Typography & Layout */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Typography & Layout</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Font Family">
                    <Select value={themeSettings.fontFamily} onValueChange={(v) => setThemeSettings((p) => ({ ...p, fontFamily: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Roboto">Roboto</SelectItem>
                        <SelectItem value="Open Sans">Open Sans</SelectItem>
                        <SelectItem value="Lato">Lato</SelectItem>
                        <SelectItem value="Poppins">Poppins</SelectItem>
                        <SelectItem value="Nunito">Nunito</SelectItem>
                        <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                        <SelectItem value="system-ui">System Default</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Border Radius (px)">
                    <Input type="number" min="0" max="24" value={themeSettings.borderRadius} onChange={(e) => setThemeSettings((p) => ({ ...p, borderRadius: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Sidebar Style">
                  <Select value={themeSettings.sidebarStyle} onValueChange={(v) => setThemeSettings((p) => ({ ...p, sidebarStyle: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark Sidebar</SelectItem>
                      <SelectItem value="light">Light Sidebar</SelectItem>
                      <SelectItem value="gradient">Gradient Sidebar</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">Compact Mode</p><p className="text-xs text-muted-foreground">Reduce spacing and padding throughout the UI</p></div>
                  <Switch checked={themeSettings.compactMode} onCheckedChange={(v) => setThemeSettings((p) => ({ ...p, compactMode: v }))} />
                                <div className="flex items-center justify-between">
                                  <div><p className="text-sm font-medium">Dark Mode</p><p className="text-xs text-muted-foreground">Switch the entire interface to dark color scheme</p></div>
                                  <Switch checked={themeSettings.colorMode === "dark"} onCheckedChange={(v) => setThemeSettings((p) => ({ ...p, colorMode: v ? "dark" : "light" }))} />
                                </div>
                </div>
              </div>

              {/* Advanced Customization */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Advanced Customization</h4>
                <Field label="HTML Head Section">
                  <Input value={themeSettings.htmlHead} onChange={(e) => setThemeSettings((p) => ({ ...p, htmlHead: e.target.value }))} placeholder="Custom HTML for <head>" />
                </Field>
                <Field label="HTML Body Section">
                  <Input value={themeSettings.htmlBody} onChange={(e) => setThemeSettings((p) => ({ ...p, htmlBody: e.target.value }))} placeholder="Custom HTML for <body>" />
                </Field>
                <Field label="CSS Style">
                  <textarea className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm"
                    rows={6} value={themeSettings.cssStyle}
                    onChange={(e) => setThemeSettings((p) => ({ ...p, cssStyle: e.target.value }))}
                    placeholder="/* Custom CSS styles */" />
                </Field>
              </div>
            </div>
            <div className="flex items-center">
              <SaveButton
                saving={!!saving.theme}
                onClick={() => save("theme", async () => {
                  await updateByCategory.mutateAsync({ category: "theme_settings", values: { ...themeSettings, resetUsersTheme: String(themeSettings.resetUsersTheme), compactMode: String(themeSettings.compactMode) } });
                  // Push theme changes to the live context so they apply immediately
                  updateThemeConfig({
                    accentColor: themeSettings.primaryColor,
                    customLightPrimary: themeSettings.primaryColor,
                    customDarkPrimary: themeSettings.primaryColor,
                    customDarkBackground: themeSettings.sidebarColor,
                    customLightSurface: themeSettings.headerColor,
                    fontFamily: themeSettings.fontFamily,
                  });
                  // Apply dark/light color mode immediately
                  setTheme(themeSettings.colorMode);
                })}
              />
              <ResetButton onClick={() => resetSection("theme")} />
            </div>
          </Section>
        );
      }

      // ── COMPANY LOGO ──────────────────────────────────────────────────────
      case "company-logo":
        return (
          <Section title="Company Logo" description="Upload your company logos">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold">Large Logo</h4>
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-3">
                  {companyLogos.largeLogo
                    ? <img src={companyLogos.largeLogo} alt="Large Logo" className="max-h-12 object-contain" />
                    : <Building2 className="h-12 w-12 text-muted-foreground" />}
                  <p className="text-xs text-muted-foreground">Used when the main menu is expanded</p>
                  <p className="text-xs text-muted-foreground">Also used on invoices, estimates, etc.</p>
                  <p className="text-xs text-muted-foreground font-medium">Best image dimensions: (185px X 45px)</p>
                  <label className="text-sm text-primary cursor-pointer hover:underline">
                    Change Logo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader(); reader.onloadend = () => setCompanyLogos((p) => ({ ...p, largeLogo: reader.result as string })); reader.readAsDataURL(file);
                    }} />
                  </label>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Small Logo</h4>
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-3">
                  {companyLogos.smallLogo
                    ? <img src={companyLogos.smallLogo} alt="Small Logo" className="max-h-12 w-12 object-contain" />
                    : <Building2 className="h-12 w-12 text-muted-foreground" />}
                  <p className="text-xs text-muted-foreground">Used when the main menu is collapsed</p>
                  <p className="text-xs text-muted-foreground font-medium">Best image dimensions: (45px X 45px)</p>
                  <label className="text-sm text-primary cursor-pointer hover:underline">
                    Change Logo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader(); reader.onloadend = () => setCompanyLogos((p) => ({ ...p, smallLogo: reader.result as string })); reader.readAsDataURL(file);
                    }} />
                  </label>
                </div>
              </div>
            </div>
            <SaveButton
              saving={!!saving["company-logo"]}
              onClick={() => save("company-logo", () => updateByCategory.mutateAsync({ category: "company_logos", values: companyLogos }))}
            />
          </Section>
        );

      // ── EMAIL ─────────────────────────────────────────────────────────────
      case "email":
        return (
          <Section title="Email Settings" description="Configure how outgoing emails are sent">
            <Field label="Mail Driver">
              <Select value={emailSettings.mailDriver} onValueChange={(v) => setEmailSettings((p) => ({ ...p, mailDriver: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP (Custom)</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {emailSettings.mailDriver === "smtp" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="SMTP Host">
                  <Input value={emailSettings.smtpHost} onChange={(e) => setEmailSettings((p) => ({ ...p, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" />
                </Field>
                <Field label="SMTP Port">
                  <Input value={emailSettings.smtpPort} onChange={(e) => setEmailSettings((p) => ({ ...p, smtpPort: e.target.value }))} placeholder="587" />
                </Field>
                <Field label="SMTP Username">
                  <Input value={emailSettings.smtpUser} onChange={(e) => setEmailSettings((p) => ({ ...p, smtpUser: e.target.value }))} placeholder="user@gmail.com" />
                </Field>
                <Field label="SMTP Password">
                  <Input type="password" value={emailSettings.smtpPass} onChange={(e) => setEmailSettings((p) => ({ ...p, smtpPass: e.target.value }))} placeholder="••••••••" />
                </Field>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <Field label="From Name">
                <Input value={emailSettings.fromName} onChange={(e) => setEmailSettings((p) => ({ ...p, fromName: e.target.value }))} placeholder="Melitech Solutions" />
              </Field>
              <Field label="From Email">
                <Input type="email" value={emailSettings.fromEmail} onChange={(e) => setEmailSettings((p) => ({ ...p, fromEmail: e.target.value }))} placeholder="no-reply@company.com" />
              </Field>
              <Field label="Reply-To Email">
                <Input type="email" value={emailSettings.replyTo} onChange={(e) => setEmailSettings((p) => ({ ...p, replyTo: e.target.value }))} placeholder="support@company.com" />
              </Field>
            </div>
            <SaveButton
              saving={!!saving.email}
              onClick={() => save("email", () => updateByCategory.mutateAsync({ category: "email", values: { ...emailSettings } }))}
            />
          </Section>
        );

      // ── INVOICES ──────────────────────────────────────────────────────────
      case "invoices":
        return (
          <Section title="Invoice Settings" description="Defaults applied to new invoices">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Invoice Prefix">
                <Input value={invoiceSettings.invoicePrefix} onChange={(e) => setInvoiceSettings((p) => ({ ...p, invoicePrefix: e.target.value }))} placeholder="INV" />
              </Field>
              <Field label="Default Due Days">
                <Input type="number" min="1" value={invoiceSettings.defaultDueDays} onChange={(e) => setInvoiceSettings((p) => ({ ...p, defaultDueDays: e.target.value }))} placeholder="7" />
              </Field>
              <Field label="Default Tax Mode">
                <Select value={invoiceSettings.taxMode} onValueChange={(v) => setInvoiceSettings((p) => ({ ...p, taxMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary Tax</SelectItem>
                    <SelectItem value="item">Per-Item Tax</SelectItem>
                    <SelectItem value="none">No Tax</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Separator />
            <p className="text-sm font-medium">Overdue Reminders</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="1st reminder (days overdue)">
                <Input type="number" min="0" value={invoiceSettings.overdueDays1} onChange={(e) => setInvoiceSettings((p) => ({ ...p, overdueDays1: e.target.value }))} />
              </Field>
              <Field label="2nd reminder">
                <Input type="number" min="0" value={invoiceSettings.overdueDays2} onChange={(e) => setInvoiceSettings((p) => ({ ...p, overdueDays2: e.target.value }))} />
              </Field>
              <Field label="3rd reminder">
                <Input type="number" min="0" value={invoiceSettings.overdueDays3} onChange={(e) => setInvoiceSettings((p) => ({ ...p, overdueDays3: e.target.value }))} />
              </Field>
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Show project title on invoice</p>
                <Switch checked={invoiceSettings.showProjectTitle} onCheckedChange={(c) => setInvoiceSettings((p) => ({ ...p, showProjectTitle: c }))} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Show "viewed by client" indicator</p>
                <Switch checked={invoiceSettings.showViewedIndicator} onCheckedChange={(c) => setInvoiceSettings((p) => ({ ...p, showViewedIndicator: c }))} />
              </div>
            </div>
            <Separator />
            <Field label="Terms &amp; Conditions">
              <RichTextEditor
                value={invoiceSettings.termsAndConditions}
                onChange={(v: string) => setInvoiceSettings((p) => ({ ...p, termsAndConditions: v }))}
                placeholder="Enter default terms and conditions for invoices…"
                minHeight="160px"
              />
            </Field>
            <SaveButton
              saving={!!saving.invoices}
              onClick={() => save("invoices", () => updateByCategory.mutateAsync({
                category: "invoice_settings",
                values: {
                  ...invoiceSettings,
                  showProjectTitle:    String(invoiceSettings.showProjectTitle),
                  showViewedIndicator: String(invoiceSettings.showViewedIndicator),
                },
              }))}
            />
          </Section>
        );

      // ── DOCUMENT NUMBERS ──────────────────────────────────────────────────
      case "numbering":
        return (
          <Section title="Document Number Prefixes" description="Prefix used when generating document IDs">
            <div className="grid grid-cols-2 gap-4">
              {(["invoice", "estimate", "receipt", "proposal", "expense"] as const).map((type) => {
                const key = (type + "Prefix") as keyof typeof documentNumbers;
                return (
                  <Field key={type} label={type.charAt(0).toUpperCase() + type.slice(1) + " Prefix"}>
                    <div className="flex gap-2">
                      <Input
                        value={documentNumbers[key]}
                        onChange={(e) => setDocumentNumbers((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={type.toUpperCase().slice(0, 3)}
                      />
                      <Button
                        variant="outline" size="sm"
                        disabled={!!saving["doc_" + type]}
                        onClick={() => save("doc_" + type, () => mutateAsync(updateDocPrefixMutation, { documentType: type, prefix: documentNumbers[key] }))}
                      >
                        {saving["doc_" + type] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </Field>
                );
              })}
            </div>
          </Section>
        );

      // ── PAYMENTS – BANK TRANSFER ──────────────────────────────────────────
      case "payments-bank":
        return (
          <Section title="Bank Transfer" description="Display banking details on invoices for manual payments">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Enable Bank Transfer payment method</p>
              <Switch checked={bankPayment.enabled} onCheckedChange={(c) => setBankPayment((p) => ({ ...p, enabled: c }))} />
            </div>
            <Field label="Display Name">
              <Input value={bankPayment.displayName} onChange={(e) => setBankPayment((p) => ({ ...p, displayName: e.target.value }))} placeholder="Bank Transfer" />
            </Field>
            <Field label="Banking Details">
              <p className="text-xs text-muted-foreground mb-1">
                Variables:{" "}
                <code className="bg-muted px-1 rounded">{"{invoice_id}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{invoice_total}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{balance_due}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{client_company_name}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{due_date}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{company_name}"}</code>
              </p>
              <RichTextEditor
                value={bankPayment.details}
                onChange={(v: string) => setBankPayment((p) => ({ ...p, details: v }))}
                placeholder="Enter banking details shown to clients on invoices…"
                minHeight="140px"
              />
            </Field>
            <SaveButton
              saving={!!saving.bankpay}
              onClick={() => save("bankpay", () => updateByCategory.mutateAsync({
                category: "payment_bank",
                values: { ...bankPayment, enabled: String(bankPayment.enabled) },
              }))}
            />
          </Section>
        );

      // ── PAYMENTS – STRIPE ─────────────────────────────────────────────────
      case "payments-stripe":
        return (
          <Section title="Stripe" description="Accept card payments via Stripe">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Enable Stripe</p>
              <Switch checked={stripeSettings.enabled} onCheckedChange={(c) => setStripeSettings((p) => ({ ...p, enabled: c }))} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Publishable Key">
                <Input value={stripeSettings.publishableKey} onChange={(e) => setStripeSettings((p) => ({ ...p, publishableKey: e.target.value }))} placeholder="pk_live_…" />
              </Field>
              <Field label="Secret Key">
                <Input type="password" value={stripeSettings.secretKey} onChange={(e) => setStripeSettings((p) => ({ ...p, secretKey: e.target.value }))} placeholder="sk_live_…" />
              </Field>
            </div>
            <SaveButton
              saving={!!saving.stripe}
              onClick={() => save("stripe", () => updateByCategory.mutateAsync({
                category: "payment_stripe",
                values: { ...stripeSettings, enabled: String(stripeSettings.enabled) },
              }))}
            />
          </Section>
        );

      // ── PAYMENTS – M-PESA ─────────────────────────────────────────────────
      case "payments-mpesa":
        return (
          <Section title="M-Pesa (Safaricom)" description="Accept M-Pesa STK Push payments">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Enable M-Pesa</p>
              <Switch checked={mpesaSettings.enabled} onCheckedChange={(c) => setMpesaSettings((p) => ({ ...p, enabled: c }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Consumer Key">
                <Input value={mpesaSettings.consumerKey} onChange={(e) => setMpesaSettings((p) => ({ ...p, consumerKey: e.target.value }))} placeholder="Consumer Key" />
              </Field>
              <Field label="Consumer Secret">
                <Input type="password" value={mpesaSettings.consumerSecret} onChange={(e) => setMpesaSettings((p) => ({ ...p, consumerSecret: e.target.value }))} placeholder="Consumer Secret" />
              </Field>
              <Field label="Paybill / Till Number">
                <Input value={mpesaSettings.paybillNumber} onChange={(e) => setMpesaSettings((p) => ({ ...p, paybillNumber: e.target.value }))} placeholder="174379" />
              </Field>
              <Field label="Passkey">
                <Input type="password" value={mpesaSettings.passkey} onChange={(e) => setMpesaSettings((p) => ({ ...p, passkey: e.target.value }))} placeholder="Passkey" />
              </Field>
              <Field label="Callback URL">
                <Input value={mpesaSettings.callbackUrl} onChange={(e) => setMpesaSettings((p) => ({ ...p, callbackUrl: e.target.value }))} placeholder="https://your-domain.com/api/mpesa/callback" />
              </Field>
            </div>
            <SaveButton
              saving={!!saving.mpesa}
              onClick={() => save("mpesa", () => updateByCategory.mutateAsync({
                category: "payment_mpesa",
                values: { ...mpesaSettings, enabled: String(mpesaSettings.enabled) },
              }))}
            />
          </Section>
        );

      // ── TAX ───────────────────────────────────────────────────────────────
      case "tax":
        return (
          <Section title="Tax Rates" description="Define reusable tax rates for invoices">
            <div className="space-y-2">
              {taxRates.length === 0 && (
                <p className="text-sm text-muted-foreground">No tax rates defined. Add one below.</p>
              )}
              {taxRates.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 border rounded-md bg-muted/40">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <Badge variant="secondary">{t.rate}%</Badge>
                  <button onClick={() => removeTaxRate(t.id)} aria-label="Remove tax rate" title="Remove" className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Separator />
            <p className="text-sm font-semibold">Add Tax Rate</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Name">
                <Input value={newTax.name} onChange={(e) => setNewTax((p) => ({ ...p, name: e.target.value }))} placeholder="VAT" />
              </Field>
              <Field label="Rate (%)">
                <Input type="number" min="0" max="100" step="0.01" value={newTax.rate} onChange={(e) => setNewTax((p) => ({ ...p, rate: e.target.value }))} placeholder="16" />
              </Field>
              <Field label="Description (optional)">
                <Input value={newTax.description} onChange={(e) => setNewTax((p) => ({ ...p, description: e.target.value }))} placeholder="Value Added Tax" />
              </Field>
            </div>
            <Button onClick={addTaxRate} size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Tax Rate
            </Button>
          </Section>
        );

      // ── TAGS ──────────────────────────────────────────────────────────────
      case "tags":
        return (
          <Section title="Global Tags" description="Tags available across clients, projects, and tasks">
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
              {tags.map((t) => (
                <Badge
                  key={t.id}
                  style={{ backgroundColor: t.color, color: "#fff" }}
                  className="flex items-center gap-1 pr-1 cursor-default"
                >
                  {t.name}
                  <button onClick={() => removeTag(t.id)} aria-label="Remove tag" title="Remove" className="ml-1 hover:opacity-70">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Separator />
            <p className="text-sm font-semibold">Add Tag</p>
            <div className="flex gap-3 items-end">
              <Field label="Tag Name">
                <Input value={newTag.name} onChange={(e) => setNewTag((p) => ({ ...p, name: e.target.value }))} placeholder="Important" />
              </Field>
              <Field label="Color">
                <input type="color" value={newTag.color} onChange={(e) => setNewTag((p) => ({ ...p, color: e.target.value }))}
                  title="Tag color picker" aria-label="Tag color"
                  className="h-9 w-14 cursor-pointer rounded border border-input p-1" />
              </Field>
              <Button onClick={addTag} size="sm">
                <Plus className="mr-1 h-4 w-4" /> Add Tag
              </Button>
            </div>
          </Section>
        );

      // ── NOTIFICATIONS ─────────────────────────────────────────────────────
      case "notifications":
        return (
          <Section title="Notification Preferences" description="Choose which events trigger in-app notifications">
            <div className="space-y-3">
              {([
                { key: "invoiceDue",         label: "Invoice due reminders" },
                { key: "paymentReceived",     label: "Payment received alerts" },
                { key: "newClient",           label: "New client added" },
                { key: "companyAnnouncement", label: "Company announcements" },
                { key: "projectDeadline",     label: "Project deadline reminders" },
                { key: "taskAssigned",        label: "Task assigned to me" },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="font-normal">{label}</Label>
                  <Switch
                    checked={(notifyPrefs as any)[key] ?? false}
                    onCheckedChange={(c) => setNotifyPrefs((p) => ({ ...p, [key]: c }))}
                  />
                </div>
              ))}
            </div>
            <SaveButton
              saving={!!saving.notify}
              onClick={() => save("notify", () => mutateAsync(updateNotifyMutation, {
                invoiceDue:          notifyPrefs.invoiceDue,
                paymentReceived:     notifyPrefs.paymentReceived,
                newClient:           notifyPrefs.newClient,
                companyAnnouncement: notifyPrefs.companyAnnouncement,
              }))}
            />
          </Section>
        );

      // ── ROLES ─────────────────────────────────────────────────────────────
      case "roles":
        return (
          <Section title="User Roles &amp; Permissions" description="Manage roles and what each role can access">
            <p className="text-sm text-muted-foreground">
              Role management is available in <strong>Admin → Roles &amp; Permissions</strong>. Changes take effect on the user's next login.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={() => navigate("/admin/roles")}>
                <ArrowUpRight className="mr-2 h-4 w-4" /> Open Roles &amp; Permissions
              </Button>
              <Button variant="outline" onClick={() => navigate("/tools/permissions")}>
                <Shield className="mr-2 h-4 w-4" /> Advanced Permissions Matrix
              </Button>
            </div>
          </Section>
        );

      // ── BACKUP ────────────────────────────────────────────────────────────
      case "backup":
        return (
          <Section title="Backup &amp; Restore" description="Download or restore a system backup">
            <BackupRestore />
          </Section>
        );

      // ── CSV IMPORT/EXPORT ─────────────────────────────────────────────────
      case "csvimport":
        return (
          <Section title="CSV Import / Export" description="Bulk import records or export data as CSV">
            <CSVImportExport />
          </Section>
        );


      // ── CURRENCY ──────────────────────────────────────────────────────────
      case "currency":
        return (
          <Section title="Currency Settings" description="Configure default currency and number formatting">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Default Currency">
                <Select value={currency.defaultCurrency} onValueChange={(v) => setCurrency((p) => ({ ...p, defaultCurrency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES – Kenyan Shilling</SelectItem>
                    <SelectItem value="USD">USD – US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR – Euro</SelectItem>
                    <SelectItem value="GBP">GBP – British Pound</SelectItem>
                    <SelectItem value="NGN">NGN – Nigerian Naira</SelectItem>
                    <SelectItem value="ZAR">ZAR – South African Rand</SelectItem>
                    <SelectItem value="TZS">TZS – Tanzanian Shilling</SelectItem>
                    <SelectItem value="UGX">UGX – Ugandan Shilling</SelectItem>
                    <SelectItem value="GHS">GHS – Ghanaian Cedi</SelectItem>
                    <SelectItem value="INR">INR – Indian Rupee</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Symbol Position">
                <Select value={currency.symbolPosition} onValueChange={(v) => setCurrency((p) => ({ ...p, symbolPosition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before amount ($ 100)</SelectItem>
                    <SelectItem value="after">After amount (100 $)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Thousands Separator">
                <Select value={currency.thousandsSep} onValueChange={(v) => setCurrency((p) => ({ ...p, thousandsSep: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Comma (1,000)</SelectItem>
                    <SelectItem value=".">Period (1.000)</SelectItem>
                    <SelectItem value=" ">Space (1 000)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Decimal Separator">
                <Select value={currency.decimalSep} onValueChange={(v) => setCurrency((p) => ({ ...p, decimalSep: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=".">Period (.)</SelectItem>
                    <SelectItem value=",">Comma (,)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Decimal Places">
                <Select value={currency.decimalPlaces} onValueChange={(v) => setCurrency((p) => ({ ...p, decimalPlaces: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["currency"]} onClick={() => save("currency", () => updateByCategory.mutateAsync({ category: "currency", values: currency }))} />
          </Section>
        );

      // ── BILLING ───────────────────────────────────────────────────────────
      case "billing-account":
        return (
          <Section title="Billing Account" description="Your current plan and account information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Plan"><Input value={billing.planName} readOnly className="bg-muted" /></Field>
              <Field label="Plan Expiry"><Input value={billing.planExpiry} readOnly className="bg-muted" /></Field>
              <Field label="Email Quota"><Input value={billing.emailQuota} readOnly className="bg-muted" /></Field>
              <Field label="User Limit"><Input value={billing.userLimit} readOnly className="bg-muted" /></Field>
            </div>
          </Section>
        );

      case "billing-plans": {
        // Fallback to API prices or hardcoded defaults
        const apiPrices = (planPriceData?.prices as Record<string, any>) || {};
        const planKeys =Object.keys(apiPrices);

        // Build plan cards from database tiers or API data
        const planCards = pricingTiers.length > 0
          ? pricingTiers.map((tier: any) => ({
              id: tier.id,
              name: tier.planName,
              tier: tier.tier,
              price: tier.monthlyPrice ? `KES ${(Number(tier.monthlyPrice) || 0).toLocaleString()}/mo` : "Free",
              annualPrice: tier.annualPrice ? `KES ${(Number(tier.annualPrice) || 0).toLocaleString()}/yr` : undefined,
              features: tier.features || [],
              maxUsers: tier.maxUsers,
              key: tier.planSlug,
            }))
          : planKeys.length > 0
          ? planKeys.map((key) => {
              const p = apiPrices[key];
              return {
                name: p.label || key.charAt(0).toUpperCase() + key.slice(1),
                price: p.monthlyKes ? `KES ${(p.monthlyKes / 100).toLocaleString()}/mo` : "Free",
                annualPrice: p.annualKes ? `KES ${(p.annualKes / 100).toLocaleString()}/yr` : undefined,
                features: [
                  `${p.maxUsers || "Unlimited"} Users`,
                  ...(p.description ? [p.description] : []),
                ],
                key,
              };
            })
          : [
              { name: "Trial", price: "Free", features: ["5 Users", "14-day evaluation"], key: "trial", maxUsers: 5 },
              { name: "Starter", price: "KES 5,999/mo", features: ["10 Users", "Core business tools"], key: "starter", maxUsers: 10 },
              { name: "Professional", price: "KES 18,999/mo", features: ["50 Users", "Full operations suite"], key: "professional", maxUsers: 50 },
              { name: "Enterprise", price: "KES 49,999/mo", features: ["500 Users", "All modules + priority support"], key: "enterprise", maxUsers: 500 },
            ];

        return (
          <Section title="Available Plans" description="Plans are managed by your platform administrator. Upgrade or change your subscription plan.">
            {tiersLoading ? (
              <div className="flex items-center justify-center p-8">
                <Spinner className="mr-2" />
                <span>Loading pricing plans...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {planCards.map((plan) => (
                  <Card key={plan.key} className={plan.name.toLowerCase() === billing.planName.toLowerCase() ? "border-primary ring-2 ring-primary/20" : ""}>
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-xl font-bold">{plan.price}</CardDescription>
                      {plan.annualPrice && (
                        <p className="text-xs text-muted-foreground">{plan.annualPrice}</p>
                      )}
                      {plan.maxUsers && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                          {plan.maxUsers === -1 ? "Unlimited" : plan.maxUsers} users
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {(Array.isArray(plan.features) ? plan.features : [
                          `${plan.maxUsers || "Unlimited"} Users`,
                          ...(plan.features ? [plan.features] : []),
                        ]).map((f: any) => (
                          <li key={f} className="flex items-center gap-2">
                            <CheckSquare className="h-3 w-3 text-green-500" />
                            {typeof f === 'object' ? f.name || JSON.stringify(f) : f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={plan.name.toLowerCase() === billing.planName.toLowerCase() ? "secondary" : "default"}
                        className="w-full mt-4"
                        disabled={plan.name.toLowerCase() === billing.planName.toLowerCase()}
                        onClick={() => toast.info(`Plan upgrade to ${plan.name} — contact your administrator`)}
                      >
                        {plan.name.toLowerCase() === billing.planName.toLowerCase() ? "Current Plan" : "Upgrade"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        );
      }

      case "billing-payments":
        return (
          <Section title="Payment History" description="View past invoices and payments">
            <p className="text-sm text-muted-foreground">No payment history available.</p>
          </Section>
        );

      case "billing-notices":
        return (
          <Section title="Billing Notices" description="Notifications about your billing and subscription">
            <p className="text-sm text-muted-foreground">No billing notices at this time.</p>
          </Section>
        );

      // ── EMAIL EXTENDED ────────────────────────────────────────────────────
      case "email-templates": {
        const EMAIL_TEMPLATE_GROUPS: Record<string, { label: string; templates: { id: string; name: string; subject: string; body: string; vars: string[] }[] }> = {
          contracts: { label: "Contracts", templates: [
            { id: "contract-new-client", name: "New Contract - (Client)", subject: "New Contract - #{contract_id}", body: "<h2>New Contract</h2><p>Hi {first_name},</p><p>A new contract has been created for you.</p>", vars: ["first_name","last_name","contract_id","contract_subject","contract_value","contract_start_date","contract_end_date","client_name","client_id"] },
            { id: "contract-signed-team", name: "Contract Signed - (Team)", subject: "Contract Signed - #{contract_id}", body: "<h2>Contract Signed</h2><p>Hi {first_name},</p><p>A contract has been signed by the client.</p>", vars: ["first_name","last_name","contract_id","contract_subject","client_name"] },
          ]},
          estimates: { label: "Estimates", templates: [
            { id: "estimate-new-client", name: "New Estimate - (Client)", subject: "New Estimate - #{estimate_id}", body: "<h2>New Estimate</h2><p>Hi {first_name},</p><p>A new estimate has been prepared for you.</p>", vars: ["first_name","last_name","estimate_id","estimate_amount","estimate_date","client_name","client_id"] },
            { id: "estimate-accepted-team", name: "Estimate Accepted - (Team)", subject: "Estimate Accepted - #{estimate_id}", body: "<h2>Estimate Accepted</h2><p>Hi {first_name},</p><p>An estimate has been accepted.</p>", vars: ["first_name","last_name","estimate_id","estimate_amount","client_name"] },
            { id: "estimate-declined-team", name: "Estimate Declined - (Team)", subject: "Estimate Declined - #{estimate_id}", body: "<h2>Estimate Declined</h2><p>Hi {first_name},</p><p>An estimate has been declined.</p>", vars: ["first_name","last_name","estimate_id","client_name"] },
            { id: "estimate-revised-client", name: "Estimate Revised - (Client)", subject: "Estimate Revised - #{estimate_id}", body: "<h2>Estimate Revised</h2><p>Hi {first_name},</p><p>Your estimate has been revised.</p>", vars: ["first_name","last_name","estimate_id","estimate_amount","client_name"] },
          ]},
          financial: { label: "Financial", templates: [
            { id: "invoice-new-client", name: "New Invoice - (Client)", subject: "New Invoice - #{invoice_id}", body: "<h2>New Invoice</h2><p>Hi {first_name},</p><p>Please find attached your invoice.</p>", vars: ["first_name","last_name","invoice_id","invoice_amount","invoice_amount_due","invoice_date_created","invoice_date_due","project_title","project_id","client_name","client_id","invoice_status","invoice_url"] },
            { id: "invoice-reminder-client", name: "Invoice Reminder - (Client)", subject: "Invoice Reminder - #{invoice_id}", body: "<h2>Invoice Reminder</h2><p>Hi {first_name},</p><p>This is a reminder about your outstanding invoice.</p>", vars: ["first_name","last_name","invoice_id","invoice_amount","invoice_amount_due","invoice_date_due","client_name","invoice_url"] },
            { id: "payment-thankyou-client", name: "Thank You For Payment - (Client)", subject: "Payment Received - Thank You", body: "<h2>Thank You</h2><p>Hi {first_name},</p><p>Thank you for your payment.</p>", vars: ["first_name","last_name","invoice_id","payment_amount","client_name"] },
            { id: "payment-new-team", name: "New Payment - (Team)", subject: "New Payment Received - #{invoice_id}", body: "<h2>New Payment</h2><p>Hi {first_name},</p><p>A new payment has been received.</p>", vars: ["first_name","last_name","invoice_id","payment_amount","client_name"] },
          ]},
          leads: { label: "Leads", templates: [
            { id: "lead-status-team", name: "Lead Status Change - (Team)", subject: "Lead Status Changed", body: "<p>Hi {first_name},</p><p>A lead status has been updated.</p>", vars: ["first_name","last_name","lead_name","lead_status","lead_value"] },
            { id: "lead-comment-team", name: "Lead Comment - (Team)", subject: "New Lead Comment", body: "<p>Hi {first_name},</p><p>A new comment was added to a lead.</p>", vars: ["first_name","last_name","lead_name","comment"] },
            { id: "lead-assignment-team", name: "Lead Assignment - (Team)", subject: "Lead Assigned To You", body: "<p>Hi {first_name},</p><p>A lead has been assigned to you.</p>", vars: ["first_name","last_name","lead_name","lead_value"] },
            { id: "lead-file-team", name: "Lead File Uploaded - (Team)", subject: "File Uploaded To Lead", body: "<p>Hi {first_name},</p><p>A file was uploaded to a lead.</p>", vars: ["first_name","last_name","lead_name","file_name"] },
            { id: "lead-webform-team", name: "New Web Form Submitted - (Team)", subject: "New Web Form Submission", body: "<p>Hi {first_name},</p><p>A new web form has been submitted.</p>", vars: ["first_name","last_name","lead_name","lead_email"] },
          ]},
          projects: { label: "Projects", templates: [
            { id: "project-new-client", name: "New Project Created - (Client)", subject: "New Project - {project_title}", body: "<h2>New Project</h2><p>Hi {first_name},</p><p>A new project has been created for you.</p>", vars: ["first_name","last_name","project_title","project_id","client_name"] },
            { id: "project-status-client", name: "Project Status Change - (Client)", subject: "Project Status Updated", body: "<p>Hi {first_name},</p><p>Your project status has been updated.</p>", vars: ["first_name","last_name","project_title","project_status"] },
            { id: "project-file-all", name: "Project File Uploaded - (All)", subject: "File Uploaded To Project", body: "<p>Hi {first_name},</p><p>A file was uploaded to a project.</p>", vars: ["first_name","last_name","project_title","file_name"] },
            { id: "project-comment-all", name: "Project Comment - (All)", subject: "New Project Comment", body: "<p>Hi {first_name},</p><p>A new comment was added to a project.</p>", vars: ["first_name","last_name","project_title","comment"] },
            { id: "project-assignment-team", name: "Project Assignment - (Team)", subject: "Project Assigned To You", body: "<p>Hi {first_name},</p><p>You have been assigned to a project.</p>", vars: ["first_name","last_name","project_title","project_id"] },
          ]},
          proposals: { label: "Proposals", templates: [
            { id: "proposal-new-client", name: "New Proposal - (Client)", subject: "New Proposal - #{proposal_id}", body: "<h2>New Proposal</h2><p>Hi {first_name},</p><p>A new proposal has been created for you.</p>", vars: ["first_name","last_name","proposal_id","proposal_subject","proposal_total","client_name"] },
            { id: "proposal-accepted-team", name: "Proposal Accepted - (Team)", subject: "Proposal Accepted", body: "<p>Hi {first_name},</p><p>A proposal has been accepted.</p>", vars: ["first_name","last_name","proposal_id","client_name"] },
            { id: "proposal-declined-team", name: "Proposal Decline - (Team)", subject: "Proposal Declined", body: "<p>Hi {first_name},</p><p>A proposal has been declined.</p>", vars: ["first_name","last_name","proposal_id","client_name"] },
            { id: "proposal-revised-client", name: "Proposal Revised - (Client)", subject: "Proposal Revised - #{proposal_id}", body: "<p>Hi {first_name},</p><p>Your proposal has been revised.</p>", vars: ["first_name","last_name","proposal_id","proposal_total","client_name"] },
          ]},
          subscriptions: { label: "Subscriptions", templates: [
            { id: "sub-new-client", name: "New Subscription Created - (Client)", subject: "New Subscription Created", body: "<p>Hi {first_name},</p><p>A new subscription has been created.</p>", vars: ["first_name","last_name","subscription_name","subscription_amount"] },
            { id: "sub-renewal-failed-client", name: "Subscription Renewal Failed - (Client)", subject: "Subscription Renewal Failed", body: "<p>Hi {first_name},</p><p>Your subscription renewal failed.</p>", vars: ["first_name","last_name","subscription_name"] },
            { id: "sub-renewed-client", name: "Subscription Renewed - (Client)", subject: "Subscription Renewed", body: "<p>Hi {first_name},</p><p>Your subscription has been renewed.</p>", vars: ["first_name","last_name","subscription_name","subscription_amount"] },
            { id: "sub-started-client", name: "Subscription Started - (Client)", subject: "Subscription Started", body: "<p>Hi {first_name},</p><p>Your subscription has started.</p>", vars: ["first_name","last_name","subscription_name"] },
          ]},
          system: { label: "System", templates: [
            { id: "system-notification", name: "System Notification", subject: "System Notification", body: "<p>Hi {first_name},</p><p>{message}</p>", vars: ["first_name","last_name","message"] },
          ]},
          tasks: { label: "Tasks", templates: [
            { id: "task-status-all", name: "Task Status Change - (All)", subject: "Task Status Changed", body: "<p>Hi {first_name},</p><p>A task status has been updated.</p>", vars: ["first_name","last_name","task_name","task_status","project_title"] },
            { id: "task-assignment-all", name: "Task Assignment - (All)", subject: "Task Assigned To You", body: "<p>Hi {first_name},</p><p>A task has been assigned to you.</p>", vars: ["first_name","last_name","task_name","project_title","task_due_date"] },
            { id: "task-file-all", name: "Task File Uploaded - (All)", subject: "File Uploaded To Task", body: "<p>Hi {first_name},</p><p>A file was uploaded to a task.</p>", vars: ["first_name","last_name","task_name","file_name"] },
            { id: "task-comment-all", name: "Task Comment - (All)", subject: "New Task Comment", body: "<p>Hi {first_name},</p><p>A new comment was added to a task.</p>", vars: ["first_name","last_name","task_name","comment"] },
            { id: "task-overdue-team", name: "Task Overdue - (Team)", subject: "Task Overdue", body: "<p>Hi {first_name},</p><p>A task is overdue.</p>", vars: ["first_name","last_name","task_name","task_due_date","project_title"] },
          ]},
          tickets: { label: "Tickets", templates: [
            { id: "ticket-new-all", name: "New Ticket - (All)", subject: "New Ticket - #{ticket_id}", body: "<p>Hi {first_name},</p><p>A new ticket has been created.</p>", vars: ["first_name","last_name","ticket_id","ticket_subject","ticket_department"] },
            { id: "ticket-reply-all", name: "New Ticket Reply - (All)", subject: "New Ticket Reply - #{ticket_id}", body: "<p>Hi {first_name},</p><p>A new reply was added to a ticket.</p>", vars: ["first_name","last_name","ticket_id","ticket_subject","reply_message"] },
            { id: "ticket-closed-client", name: "Ticket Closed - (Client)", subject: "Ticket Closed - #{ticket_id}", body: "<p>Hi {first_name},</p><p>Your ticket has been closed.</p>", vars: ["first_name","last_name","ticket_id","ticket_subject"] },
          ]},
          users: { label: "Users", templates: [
            { id: "user-welcome-all", name: "New User Welcome - (All)", subject: "Welcome to {our_company_name}", body: "<h2>Welcome!</h2><p>Hi {first_name},</p><p>Your account has been created.</p>", vars: ["first_name","last_name","email","dashboard_url"] },
            { id: "user-reset-all", name: "Reset Password Request - (All)", subject: "Password Reset Request", body: "<p>Hi {first_name},</p><p>A password reset was requested for your account.</p>", vars: ["first_name","last_name","reset_url"] },
          ]},
          other: { label: "Other", templates: [
            { id: "email-signature-all", name: "Email Signature - (All)", subject: "", body: "<p>Best regards,<br/>{our_company_name}</p>", vars: ["our_company_name","dashboard_url"] },
            { id: "email-footer-all", name: "Email Footer - (All)", subject: "", body: "<p style='font-size:12px;color:#666;'>© {our_company_name}. All rights reserved.</p>", vars: ["our_company_name","todays_date"] },
            { id: "reminder-all", name: "Reminder - (All)", subject: "Reminder: {reminder_title}", body: "<p>Hi {first_name},</p><p>This is a reminder: {reminder_description}.</p>", vars: ["first_name","last_name","reminder_title","reminder_description"] },
            { id: "calendar-reminder-team", name: "Calendar Reminder - (Team)", subject: "Calendar Reminder", body: "<p>Hi {first_name},</p><p>Reminder for your calendar event.</p>", vars: ["first_name","last_name","event_title","event_date","event_time"] },
          ]},
        };
        const GENERAL_VARS = ["{our_company_name}", "{todays_date}", "{email_signature}", "{email_footer}", "{dashboard_url}"];
        const allTemplates = Object.values(EMAIL_TEMPLATE_GROUPS).flatMap(g => g.templates);
        const currentTpl = allTemplates.find(t => t.id === selectedTemplate);
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Email Templates</h3>
                <p className="text-sm text-muted-foreground">APP &gt; SETTINGS &gt; EMAIL &gt; EMAIL TEMPLATES</p>
              </div>
              <Select value={selectedTemplate} onValueChange={async (v) => {
                setSelectedTemplate(v);
                const tpl = allTemplates.find(t => t.id === v);
                // Try loading saved version from settings first
                try {
                  const saved = await utils.settings.getByCategory.fetch({ category: `email_template:${v}` });
                  if (saved && (saved.subject || saved.body)) {
                    setTemplateSubject(saved.subject || tpl?.subject || "");
                    setTemplateBody(saved.body || tpl?.body || "");
                    return;
                  }
                } catch { /* ignore - use defaults */ }
                if (tpl) { setTemplateSubject(tpl.subject); setTemplateBody(tpl.body); }
              }}>
                <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select A Template" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EMAIL_TEMPLATE_GROUPS).map(([key, group]) => (
                    <div key={key}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">[ {group.label} ]</div>
                      {group.templates.map(tpl => (
                        <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!currentTpl ? (
              <Card className="py-16">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium">Select an email template from the dropdown menu</h4>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-[1fr_280px] gap-4">
                <div className="space-y-4">
                  <Field label="Subject">
                    <Input value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} placeholder="Email subject line" />
                  </Field>
                  <Field label="Email Body">
                    <RichTextEditor value={templateBody} onChange={setTemplateBody} minHeight="300px" />
                  </Field>
                  <SaveButton
                    saving={!!saving["email-templates"]}
                    onClick={() => save("email-templates", () => updateByCategory.mutateAsync({ category: `email_template:${selectedTemplate}`, values: { subject: templateSubject, body: templateBody } }))}
                  />
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Template Variables</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {currentTpl.vars.map(v => <div key={v} className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => { setTemplateBody(prev => prev + `{${v}}`); }}>{`{${v}}`}</div>)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">General Variables</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {GENERAL_VARS.map(v => <div key={v} className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => { setTemplateBody(prev => prev + v); }}>{v}</div>)}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        );
      }

      case "email-queue":
        return (
          <Section title="Email Queue" description="Emails pending delivery">
            <p className="text-sm text-muted-foreground">No emails currently in queue.</p>
          </Section>
        );

      case "email-log":
        return (
          <Section title="Email Log" description="History of sent emails">
            <p className="text-sm text-muted-foreground">Email log is empty. Sent emails will appear here.</p>
          </Section>
        );

      // ── CLIENTS ───────────────────────────────────────────────────────────
      case "clients-general":
        return (
          <Section title="Client Settings" description="Configure client portal and registration options">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow Self-Registration</p><p className="text-xs text-muted-foreground">Clients can create their own portal accounts</p></div>
                <Switch checked={clientsGeneral.allowRegistration} onCheckedChange={(v) => setClientsGeneral((p) => ({ ...p, allowRegistration: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require Admin Approval</p><p className="text-xs text-muted-foreground">New registrations must be approved before access</p></div>
                <Switch checked={clientsGeneral.requireApproval} onCheckedChange={(v) => setClientsGeneral((p) => ({ ...p, requireApproval: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Show Portal Login</p><p className="text-xs text-muted-foreground">Display login link on public-facing pages</p></div>
                <Switch checked={clientsGeneral.showPortalLogin} onCheckedChange={(v) => setClientsGeneral((p) => ({ ...p, showPortalLogin: v }))} /></div>
              <Field label="Client Portal URL"><Input value={clientsGeneral.portalUrl} onChange={(e) => setClientsGeneral((p) => ({ ...p, portalUrl: e.target.value }))} placeholder="https://portal.company.com" /></Field>
            </div>
            <SaveButton saving={!!saving["clients-general"]} onClick={() => save("clients-general", () => updateByCategory.mutateAsync({ category: "clients_general", values: { ...clientsGeneral, allowRegistration: String(clientsGeneral.allowRegistration), requireApproval: String(clientsGeneral.requireApproval), showPortalLogin: String(clientsGeneral.showPortalLogin) } }))} />
          </Section>
        );

      case "clients-categories":
        return (
          <Section title="Client Categories" description="Organize clients into categories">
            <div className="space-y-2">
              {clientsCategories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} /><span className="text-sm">{cat.name}</span></div>
                  <button onClick={() => { const u = clientsCategories.filter((c) => c.id !== cat.id); setClientsCategories(u); updateByCategory.mutate({ category: "clients_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end mt-3">
              <Field label="Name"><Input value={newClientsCat.name} onChange={(e) => setNewClientsCat((p) => ({ ...p, name: e.target.value }))} placeholder="Category name" /></Field>
              <Field label="Color"><input type="color" value={newClientsCat.color} onChange={(e) => setNewClientsCat((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-input p-1" /></Field>
              <Button size="sm" onClick={() => { if (!newClientsCat.name) { toast.error("Name required"); return; } const u = [...clientsCategories, { id: crypto.randomUUID(), ...newClientsCat }]; setClientsCategories(u); setNewClientsCat({ name: "", color: "#3b82f6" }); updateByCategory.mutate({ category: "clients_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
          </Section>
        );

      case "clients-email-templates": {
        const CLIENT_EMAIL_TEMPLATES: Record<string, { label: string; templates: { id: string; name: string; subject: string; body: string; vars: string[] }[] }> = {
          onboarding: { label: "Onboarding", templates: [
            { id: "client-welcome", name: "Client Welcome - (Client)", subject: "Welcome to {our_company_name}", body: "<h2>Welcome!</h2><p>Hi {first_name},</p><p>Thank you for choosing {our_company_name}. We're excited to have you on board.</p><p>You can access your client portal at any time using the link below.</p><p><a href=\"{dashboard_url}\">Go to Client Portal</a></p>", vars: ["first_name","last_name","client_name","client_id","dashboard_url"] },
            { id: "client-portal-access", name: "Client Portal Access - (Client)", subject: "Your Portal Access Credentials", body: "<h2>Portal Access</h2><p>Hi {first_name},</p><p>Your client portal account has been set up. Here are your login details:</p><p><strong>Email:</strong> {email}<br/><strong>Portal URL:</strong> <a href=\"{dashboard_url}\">{dashboard_url}</a></p><p>Please change your password upon first login.</p>", vars: ["first_name","last_name","email","client_name","dashboard_url"] },
          ]},
          billing: { label: "Billing", templates: [
            { id: "client-invoice", name: "Client Invoice - (Client)", subject: "Invoice #{invoice_id} from {our_company_name}", body: "<h2>Invoice</h2><p>Hi {first_name},</p><p>Please find your invoice details below:</p><table><tr><th>Invoice #</th><th>Amount</th><th>Due Date</th><th>Status</th></tr><tr><td>{invoice_id}</td><td>{invoice_amount}</td><td>{invoice_date_due}</td><td>{invoice_status}</td></tr></table><p>Please make payment before the due date.</p><p><a href=\"{invoice_url}\">View & Pay Invoice</a></p>", vars: ["first_name","last_name","client_name","invoice_id","invoice_amount","invoice_amount_due","invoice_date_due","invoice_status","invoice_url"] },
            { id: "client-statement", name: "Client Statement - (Client)", subject: "Account Statement from {our_company_name}", body: "<h2>Account Statement</h2><p>Hi {first_name},</p><p>Please find your account statement for the period <strong>{statement_from}</strong> to <strong>{statement_to}</strong>.</p><p><strong>Total Invoiced:</strong> {total_invoiced}<br/><strong>Total Paid:</strong> {total_paid}<br/><strong>Balance Due:</strong> {balance_due}</p><p>If you have any questions, please don't hesitate to reach out.</p>", vars: ["first_name","last_name","client_name","statement_from","statement_to","total_invoiced","total_paid","balance_due"] },
            { id: "client-payment-receipt", name: "Payment Receipt - (Client)", subject: "Payment Receipt - {our_company_name}", body: "<h2>Payment Receipt</h2><p>Hi {first_name},</p><p>We have received your payment. Thank you!</p><table><tr><th>Invoice #</th><th>Amount Paid</th><th>Payment Date</th><th>Method</th></tr><tr><td>{invoice_id}</td><td>{payment_amount}</td><td>{payment_date}</td><td>{payment_method}</td></tr></table>", vars: ["first_name","last_name","client_name","invoice_id","payment_amount","payment_date","payment_method"] },
            { id: "client-overdue-notice", name: "Overdue Notice - (Client)", subject: "Overdue Invoice #{invoice_id}", body: "<h2>Overdue Notice</h2><p>Hi {first_name},</p><p>This is a reminder that invoice <strong>#{invoice_id}</strong> for <strong>{invoice_amount}</strong> was due on <strong>{invoice_date_due}</strong> and is now overdue.</p><p>Please arrange payment at your earliest convenience.</p><p><a href=\"{invoice_url}\">Pay Now</a></p>", vars: ["first_name","last_name","client_name","invoice_id","invoice_amount","invoice_date_due","invoice_url"] },
          ]},
          updates: { label: "Updates", templates: [
            { id: "client-project-update", name: "Project Update - (Client)", subject: "Project Update: {project_title}", body: "<p>Hi {first_name},</p><p>Here is an update on your project <strong>{project_title}</strong>:</p><p><strong>Status:</strong> {project_status}<br/><strong>Progress:</strong> {project_progress}%</p><p>{update_message}</p>", vars: ["first_name","last_name","client_name","project_title","project_status","project_progress","update_message"] },
            { id: "client-contract-renewal", name: "Contract Renewal - (Client)", subject: "Contract Renewal Reminder", body: "<p>Hi {first_name},</p><p>Your contract <strong>#{contract_id}</strong> is due for renewal on <strong>{contract_end_date}</strong>.</p><p>Please review the terms and let us know if you'd like to renew.</p>", vars: ["first_name","last_name","client_name","contract_id","contract_end_date","contract_value"] },
          ]},
        };
        const CLIENT_GENERAL_VARS = ["{our_company_name}", "{todays_date}", "{email_signature}", "{email_footer}", "{dashboard_url}"];
        const allClientTpls = Object.values(CLIENT_EMAIL_TEMPLATES).flatMap(g => g.templates);
        const currentClientTpl = allClientTpls.find(t => t.id === selectedClientTpl);
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Client Email Templates</h3>
                <p className="text-sm text-muted-foreground">APP &gt; SETTINGS &gt; CLIENTS &gt; EMAIL TEMPLATES</p>
              </div>
              <Select value={selectedClientTpl} onValueChange={async (v) => {
                setSelectedClientTpl(v);
                const tpl = allClientTpls.find(t => t.id === v);
                try {
                  const saved = await utils.settings.getByCategory.fetch({ category: `email_template:${v}` });
                  if (saved && (saved.subject || saved.body)) {
                    setClientTplSubject(saved.subject || tpl?.subject || "");
                    setClientTplBody(saved.body || tpl?.body || "");
                    return;
                  }
                } catch { /* use defaults */ }
                if (tpl) { setClientTplSubject(tpl.subject); setClientTplBody(tpl.body); }
              }}>
                <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select A Template" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_EMAIL_TEMPLATES).map(([key, group]) => (
                    <div key={key}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">[ {group.label} ]</div>
                      {group.templates.map(tpl => (
                        <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!currentClientTpl ? (
              <Card className="py-16">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium">Select a client email template from the dropdown</h4>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-[1fr_280px] gap-4">
                <div className="space-y-4">
                  <Field label="Subject">
                    <Input value={clientTplSubject} onChange={(e) => setClientTplSubject(e.target.value)} placeholder="Email subject line" />
                  </Field>
                  <Field label="Email Body">
                    <RichTextEditor value={clientTplBody} onChange={setClientTplBody} minHeight="300px" />
                  </Field>
                  <SaveButton
                    saving={!!saving["clients-email-templates"]}
                    onClick={() => save("clients-email-templates", () => updateByCategory.mutateAsync({ category: `email_template:${selectedClientTpl}`, values: { subject: clientTplSubject, body: clientTplBody } }))}
                  />
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Template Variables</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {currentClientTpl.vars.map(v => <div key={v} className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => { setClientTplBody(prev => prev + `{${v}}`); }}>{`{${v}}`}</div>)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">General Variables</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {CLIENT_GENERAL_VARS.map(v => <div key={v} className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => { setClientTplBody(prev => prev + v); }}>{v}</div>)}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── PROJECTS ──────────────────────────────────────────────────────────
      case "projects-general":
        return (
          <Section title="Project Settings" description="Configure default project behavior">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow Client Comments</p><p className="text-xs text-muted-foreground">Clients can comment on project updates</p></div>
                <Switch checked={projectsGeneral.allowClientComments} onCheckedChange={(v) => setProjectsGeneral((p) => ({ ...p, allowClientComments: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow Client Billing Access</p><p className="text-xs text-muted-foreground">Clients can view billing info for their projects</p></div>
                <Switch checked={projectsGeneral.allowClientBilling} onCheckedChange={(v) => setProjectsGeneral((p) => ({ ...p, allowClientBilling: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Notify on Task Create</p><p className="text-xs text-muted-foreground">Send notification when tasks are created</p></div>
                <Switch checked={projectsGeneral.notifyOnTaskCreate} onCheckedChange={(v) => setProjectsGeneral((p) => ({ ...p, notifyOnTaskCreate: v }))} /></div>
              <Field label="Default Billing Type">
                <Select value={projectsGeneral.defaultBillingType} onValueChange={(v) => setProjectsGeneral((p) => ({ ...p, defaultBillingType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fixed">Fixed Price</SelectItem><SelectItem value="hourly">Hourly Rate</SelectItem><SelectItem value="milestone">Milestone-Based</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["projects-general"]} onClick={() => save("projects-general", () => updateByCategory.mutateAsync({ category: "projects_general", values: { ...projectsGeneral, allowClientComments: String(projectsGeneral.allowClientComments), allowClientBilling: String(projectsGeneral.allowClientBilling), notifyOnTaskCreate: String(projectsGeneral.notifyOnTaskCreate) } }))} />
          </Section>
        );

      case "projects-categories":
        return (
          <Section title="Project Categories" description="Organize projects into categories">
            <div className="space-y-2">{projectsCategories.map((cat) => (<div key={cat.id} className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} /><span className="text-sm">{cat.name}</span></div><button onClick={() => { const u = projectsCategories.filter((c) => c.id !== cat.id); setProjectsCategories(u); updateByCategory.mutate({ category: "projects_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Name"><Input value={newProjectsCat.name} onChange={(e) => setNewProjectsCat((p) => ({ ...p, name: e.target.value }))} placeholder="Category name" /></Field><Field label="Color"><input type="color" value={newProjectsCat.color} onChange={(e) => setNewProjectsCat((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-input p-1" /></Field>
              <Button size="sm" onClick={() => { if (!newProjectsCat.name) { toast.error("Name required"); return; } const u = [...projectsCategories, { id: crypto.randomUUID(), ...newProjectsCat }]; setProjectsCategories(u); setNewProjectsCat({ name: "", color: "#3b82f6" }); updateByCategory.mutate({ category: "projects_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "projects-team-perms": {
        const teamPermKeys: [string, string][] = [["viewOtherTasks", "View tasks assigned to others"], ["editProject", "Edit project details"], ["deleteTasks", "Delete tasks"], ["manageMilestones", "Manage milestones"], ["viewBudget", "View budget info"], ["createSubtasks", "Create sub-tasks"]];
        return (
          <Section title="Team Permissions" description="Control what team members can do within projects">
            <div className="space-y-3">
              {teamPermKeys.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><p className="text-sm">{label}</p><Switch checked={!!projTeamPerms[key]} onCheckedChange={(v) => setProjTeamPerms((p) => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <SaveButton saving={!!saving["proj-team-perms"]} onClick={() => save("proj-team-perms", () => updateByCategory.mutateAsync({ category: "projects_team_perms", values: Object.fromEntries(Object.entries(projTeamPerms).map(([k, v]) => [k, String(v)])) }))} />
          </Section>
        );
      }

      case "projects-client-perms": {
        const clientPermKeys: [string, string][] = [["viewProgress", "View project progress"], ["viewTasks", "View tasks"], ["createTasks", "Create tasks"], ["commentTasks", "Comment on tasks"], ["viewTeam", "View team members"], ["uploadFiles", "Upload files"], ["viewInvoices", "View invoices"]];
        return (
          <Section title="Client Permissions" description="Control what clients can see and do in their portal">
            <div className="space-y-3">
              {clientPermKeys.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><p className="text-sm">{label}</p><Switch checked={!!projClientPerms[key]} onCheckedChange={(v) => setProjClientPerms((p) => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <SaveButton saving={!!saving["proj-client-perms"]} onClick={() => save("proj-client-perms", () => updateByCategory.mutateAsync({ category: "projects_client_perms", values: Object.fromEntries(Object.entries(projClientPerms).map(([k, v]) => [k, String(v)])) }))} />
          </Section>
        );
      }

      case "projects-automation": {
        const projAutoKeys: [string, string][] = [["autoComplete", "Auto-mark complete when all tasks done"], ["emailOnStatusChange", "Email client on status change"], ["defaultTaskList", "Create default task list on new project"], ["autoAssignPM", "Auto-assign project manager"]];
        return (
          <Section title="Project Automation" description="Automatic actions when project events occur">
            <div className="space-y-3">
              {projAutoKeys.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><p className="text-sm">{label}</p><Switch checked={!!projAutomation[key]} onCheckedChange={(v) => setProjAutomation((p) => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <SaveButton saving={!!saving["proj-auto"]} onClick={() => save("proj-auto", () => updateByCategory.mutateAsync({ category: "projects_automation", values: Object.fromEntries(Object.entries(projAutomation).map(([k, v]) => [k, String(v)])) }))} />
          </Section>
        );
      }

      // ── TASKS ─────────────────────────────────────────────────────────────
      case "tasks-general":
        return (
          <Section title="Task Settings" description="Configure default task behavior">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Multiple Checkbox Items</p><p className="text-xs text-muted-foreground">Allow multiple checklist items per task</p></div>
                <Switch checked={tasksGeneral.enableMultipleCheckboxes} onCheckedChange={(v) => setTasksGeneral((p) => ({ ...p, enableMultipleCheckboxes: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Email Assignee</p><p className="text-xs text-muted-foreground">Send email notification to assigned team member</p></div>
                <Switch checked={tasksGeneral.notifyAssigneeByEmail} onCheckedChange={(v) => setTasksGeneral((p) => ({ ...p, notifyAssigneeByEmail: v }))} /></div>
              <Field label="Default Status">
                <Select value={tasksGeneral.defaultStatus} onValueChange={(v) => setTasksGeneral((p) => ({ ...p, defaultStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["tasks-general"]} onClick={() => save("tasks-general", () => updateByCategory.mutateAsync({ category: "tasks_general", values: { ...tasksGeneral, enableMultipleCheckboxes: String(tasksGeneral.enableMultipleCheckboxes), notifyAssigneeByEmail: String(tasksGeneral.notifyAssigneeByEmail) } }))} />
          </Section>
        );

      case "tasks-statuses":
        return (
          <Section title="Task Statuses" description="Define the statuses tasks can have">
            <div className="space-y-2">{taskStatuses.map((s) => (<div key={s.id} className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-sm">{s.name}</span></div><button onClick={() => { const u = taskStatuses.filter((x) => x.id !== s.id); setTaskStatuses(u); updateByCategory.mutate({ category: "task_statuses", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Name"><Input value={newTaskStatus.name} onChange={(e) => setNewTaskStatus((p) => ({ ...p, name: e.target.value }))} placeholder="Status name" /></Field><Field label="Color"><input type="color" value={newTaskStatus.color} onChange={(e) => setNewTaskStatus((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-input p-1" /></Field>
              <Button size="sm" onClick={() => { if (!newTaskStatus.name) { toast.error("Name required"); return; } const u = [...taskStatuses, { id: crypto.randomUUID(), ...newTaskStatus }]; setTaskStatuses(u); setNewTaskStatus({ name: "", color: "#3b82f6" }); updateByCategory.mutate({ category: "task_statuses", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "tasks-priorities":
        return (
          <Section title="Task Priorities" description="Define priority levels for tasks">
            <div className="space-y-2">{taskPriorities.map((p) => (<div key={p.id} className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} /><span className="text-sm">{p.name}</span></div><button onClick={() => { const u = taskPriorities.filter((x) => x.id !== p.id); setTaskPriorities(u); updateByCategory.mutate({ category: "task_priorities", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Name"><Input value={newTaskPriority.name} onChange={(e) => setNewTaskPriority((p) => ({ ...p, name: e.target.value }))} placeholder="Priority name" /></Field><Field label="Color"><input type="color" value={newTaskPriority.color} onChange={(e) => setNewTaskPriority((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-input p-1" /></Field>
              <Button size="sm" onClick={() => { if (!newTaskPriority.name) { toast.error("Name required"); return; } const u = [...taskPriorities, { id: crypto.randomUUID(), ...newTaskPriority }]; setTaskPriorities(u); setNewTaskPriority({ name: "", color: "#ef4444" }); updateByCategory.mutate({ category: "task_priorities", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── LEADS ─────────────────────────────────────────────────────────────
      case "leads-general":
        return (
          <Section title="Lead Settings" description="Configure lead management defaults">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require Source</p><p className="text-xs text-muted-foreground">Leads must have a source assigned</p></div>
                <Switch checked={leadsGeneral.requireSource} onCheckedChange={(v) => setLeadsGeneral((p) => ({ ...p, requireSource: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require Category</p><p className="text-xs text-muted-foreground">Leads must be categorized</p></div>
                <Switch checked={leadsGeneral.requireCategory} onCheckedChange={(v) => setLeadsGeneral((p) => ({ ...p, requireCategory: v }))} /></div>
              <Field label="Default Stage">
                <Select value={leadsGeneral.defaultStage} onValueChange={(v) => setLeadsGeneral((p) => ({ ...p, defaultStage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="qualified">Qualified</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["leads-general"]} onClick={() => save("leads-general", () => updateByCategory.mutateAsync({ category: "leads_general", values: { ...leadsGeneral, requireSource: String(leadsGeneral.requireSource), requireCategory: String(leadsGeneral.requireCategory) } }))} />
          </Section>
        );

      case "leads-categories":
        return (
          <Section title="Lead Categories" description="Organize leads by category">
            <div className="space-y-2">{leadsCategories.map((cat) => (<div key={cat.id} className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} /><span className="text-sm">{cat.name}</span></div><button onClick={() => { const u = leadsCategories.filter((c) => c.id !== cat.id); setLeadsCategories(u); updateByCategory.mutate({ category: "leads_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Name"><Input value={newLeadsCat.name} onChange={(e) => setNewLeadsCat((p) => ({ ...p, name: e.target.value }))} placeholder="Category name" /></Field><Field label="Color"><input type="color" value={newLeadsCat.color} onChange={(e) => setNewLeadsCat((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-input p-1" /></Field>
              <Button size="sm" onClick={() => { if (!newLeadsCat.name) { toast.error("Name required"); return; } const u = [...leadsCategories, { id: crypto.randomUUID(), ...newLeadsCat }]; setLeadsCategories(u); setNewLeadsCat({ name: "", color: "#3b82f6" }); updateByCategory.mutate({ category: "leads_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "leads-stages":
        return (
          <Section title="Lead Stages" description="Define the pipeline stages for leads">
            <div className="space-y-2">{leadStages.map((s) => (<div key={s.id} className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-sm">{s.name}</span><Badge variant="secondary" className="text-xs">{s.probability}%</Badge></div><button onClick={() => { const u = leadStages.filter((x) => x.id !== s.id); setLeadStages(u); updateByCategory.mutate({ category: "lead_stages", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Name"><Input value={newLeadStage.name} onChange={(e) => setNewLeadStage((p) => ({ ...p, name: e.target.value }))} placeholder="Stage name" /></Field><Field label="Color"><input type="color" value={newLeadStage.color} onChange={(e) => setNewLeadStage((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-input p-1" /></Field><Field label="Probability %"><Input type="number" min="0" max="100" value={newLeadStage.probability} onChange={(e) => setNewLeadStage((p) => ({ ...p, probability: e.target.value }))} /></Field>
              <Button size="sm" onClick={() => { if (!newLeadStage.name) { toast.error("Name required"); return; } const u = [...leadStages, { id: crypto.randomUUID(), ...newLeadStage }]; setLeadStages(u); setNewLeadStage({ name: "", color: "#3b82f6", probability: "50" }); updateByCategory.mutate({ category: "lead_stages", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "leads-sources":
        return (
          <Section title="Lead Sources" description="Track where leads come from">
            <div className="space-y-2">{leadSources.map((s) => (<div key={s.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{s.name}</span><button onClick={() => { const u = leadSources.filter((x) => x.id !== s.id); setLeadSources(u); updateByCategory.mutate({ category: "lead_sources", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Source Name"><Input value={newLeadSource.name} onChange={(e) => setNewLeadSource({ name: e.target.value })} placeholder="e.g. Google, Referral" /></Field>
              <Button size="sm" onClick={() => { if (!newLeadSource.name) { toast.error("Name required"); return; } const u = [...leadSources, { id: crypto.randomUUID(), ...newLeadSource }]; setLeadSources(u); setNewLeadSource({ name: "" }); updateByCategory.mutate({ category: "lead_sources", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "leads-webforms":
        return (
          <Section title="Web-to-Lead Forms" description="Embed forms on your website to capture leads automatically">
            <p className="text-sm text-muted-foreground">Generate HTML embed code for your lead capture forms.</p>
            <Card className="bg-muted/40">
              <CardContent className="pt-4">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{
                  '<form action="/api/leads/web-form" method="POST">\n  <input name="name" placeholder="Full Name" required />\n  <input name="email" type="email" placeholder="Email" required />\n  <input name="phone" placeholder="Phone" />\n  <input name="company" placeholder="Company" />\n  <textarea name="message" placeholder="Message"></textarea>\n  <button type="submit">Submit</button>\n</form>'
                }</pre>
              </CardContent>
            </Card>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText('<form action="/api/leads/web-form" method="POST">...</form>'); toast.success("Copied to clipboard"); }}>Copy Embed Code</Button>
          </Section>
        );

      case "leads-email-templates": {
        const LEAD_EMAIL_TEMPLATES: Record<string, { label: string; templates: { id: string; name: string; subject: string; body: string; vars: string[] }[] }> = {
          followup: { label: "Follow-up", templates: [
            { id: "lead-followup-initial", name: "Initial Follow-up - (Lead)", subject: "Following Up - {our_company_name}", body: "<p>Hi {lead_name},</p><p>Thank you for your interest in {our_company_name}. I wanted to follow up and see if you have any questions about our services.</p><p>I'd love to schedule a brief call to discuss how we can help. Would any of the following times work for you?</p><p>Looking forward to hearing from you.</p>", vars: ["lead_name","lead_email","lead_phone","lead_company","lead_source","assigned_to"] },
            { id: "lead-followup-second", name: "Second Follow-up - (Lead)", subject: "Just Checking In - {our_company_name}", body: "<p>Hi {lead_name},</p><p>I wanted to check in again. I understand you're busy, but I'd love a chance to show you how we can add value to your business.</p><p>If now isn't the right time, just let me know and I can follow up later.</p>", vars: ["lead_name","lead_email","lead_company","assigned_to"] },
            { id: "lead-followup-final", name: "Final Follow-up - (Lead)", subject: "Last Chance to Connect", body: "<p>Hi {lead_name},</p><p>I've reached out a couple of times and haven't heard back. I don't want to be a bother, so this will be my last follow-up for now.</p><p>If your needs change in the future, don't hesitate to reach out. We're always here to help.</p>", vars: ["lead_name","lead_email","lead_company","assigned_to"] },
          ]},
          qualification: { label: "Qualification", templates: [
            { id: "lead-qualified", name: "Lead Qualified - (Team)", subject: "Lead Qualified: {lead_name}", body: "<p>Hi {first_name},</p><p>A lead has been qualified and is ready for the next stage.</p><table><tr><th>Field</th><th>Details</th></tr><tr><td>Name</td><td>{lead_name}</td></tr><tr><td>Company</td><td>{lead_company}</td></tr><tr><td>Value</td><td>{lead_value}</td></tr><tr><td>Source</td><td>{lead_source}</td></tr></table>", vars: ["first_name","last_name","lead_name","lead_email","lead_company","lead_value","lead_source","lead_status"] },
            { id: "lead-disqualified", name: "Lead Disqualified - (Team)", subject: "Lead Disqualified: {lead_name}", body: "<p>Hi {first_name},</p><p>A lead has been marked as disqualified.</p><p><strong>Lead:</strong> {lead_name}<br/><strong>Reason:</strong> {disqualify_reason}</p>", vars: ["first_name","last_name","lead_name","lead_company","disqualify_reason"] },
          ]},
          assignment: { label: "Assignment", templates: [
            { id: "lead-assigned-rep", name: "Lead Assigned - (Rep)", subject: "New Lead Assigned: {lead_name}", body: "<p>Hi {first_name},</p><p>A new lead has been assigned to you.</p><table><tr><th>Field</th><th>Details</th></tr><tr><td>Name</td><td>{lead_name}</td></tr><tr><td>Company</td><td>{lead_company}</td></tr><tr><td>Phone</td><td>{lead_phone}</td></tr><tr><td>Email</td><td>{lead_email}</td></tr><tr><td>Value</td><td>{lead_value}</td></tr></table><p>Please reach out within 24 hours.</p>", vars: ["first_name","last_name","lead_name","lead_email","lead_phone","lead_company","lead_value","lead_source"] },
            { id: "lead-reassigned", name: "Lead Reassigned - (Team)", subject: "Lead Reassigned: {lead_name}", body: "<p>Hi {first_name},</p><p>Lead <strong>{lead_name}</strong> has been reassigned from {previous_owner} to {new_owner}.</p>", vars: ["first_name","last_name","lead_name","previous_owner","new_owner"] },
          ]},
          nurture: { label: "Nurture", templates: [
            { id: "lead-nurture-intro", name: "Nurture: Introduction - (Lead)", subject: "Getting to Know {our_company_name}", body: "<p>Hi {lead_name},</p><p>I wanted to share a bit more about what we do at {our_company_name} and how we've been helping businesses like yours.</p><p>We specialise in delivering solutions that drive real results. I'd love to show you how.</p>", vars: ["lead_name","lead_email","lead_company"] },
            { id: "lead-nurture-value", name: "Nurture: Value Proposition - (Lead)", subject: "How We Can Help {lead_company}", body: "<p>Hi {lead_name},</p><p>Companies like {lead_company} have seen significant improvements after partnering with us. Here's what we can offer:</p><ul><li>Streamlined operations</li><li>Increased revenue</li><li>Better customer engagement</li></ul><p>Interested in learning more?</p>", vars: ["lead_name","lead_email","lead_company"] },
            { id: "lead-nurture-cta", name: "Nurture: Call to Action - (Lead)", subject: "Let's Schedule a Call", body: "<p>Hi {lead_name},</p><p>I hope the information I've shared has been helpful. I'd love to discuss your specific needs in more detail.</p><p>Would you be available for a quick 15-minute call this week? You can book a time directly here: {booking_url}</p>", vars: ["lead_name","lead_email","lead_company","booking_url"] },
          ]},
        };
        const LEAD_GENERAL_VARS = ["{our_company_name}", "{todays_date}", "{email_signature}", "{email_footer}", "{dashboard_url}"];
        const allLeadTpls = Object.values(LEAD_EMAIL_TEMPLATES).flatMap(g => g.templates);
        const currentLeadTpl = allLeadTpls.find(t => t.id === selectedLeadTpl);
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Lead Email Templates</h3>
                <p className="text-sm text-muted-foreground">APP &gt; SETTINGS &gt; LEADS &gt; EMAIL TEMPLATES</p>
              </div>
              <Select value={selectedLeadTpl} onValueChange={async (v) => {
                setSelectedLeadTpl(v);
                const tpl = allLeadTpls.find(t => t.id === v);
                try {
                  const saved = await utils.settings.getByCategory.fetch({ category: `email_template:${v}` });
                  if (saved && (saved.subject || saved.body)) {
                    setLeadTplSubject(saved.subject || tpl?.subject || "");
                    setLeadTplBody(saved.body || tpl?.body || "");
                    return;
                  }
                } catch { /* use defaults */ }
                if (tpl) { setLeadTplSubject(tpl.subject); setLeadTplBody(tpl.body); }
              }}>
                <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select A Template" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_EMAIL_TEMPLATES).map(([key, group]) => (
                    <div key={key}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">[ {group.label} ]</div>
                      {group.templates.map(tpl => (
                        <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!currentLeadTpl ? (
              <Card className="py-16">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium">Select a lead email template from the dropdown</h4>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-[1fr_280px] gap-4">
                <div className="space-y-4">
                  <Field label="Subject">
                    <Input value={leadTplSubject} onChange={(e) => setLeadTplSubject(e.target.value)} placeholder="Email subject line" />
                  </Field>
                  <Field label="Email Body">
                    <RichTextEditor value={leadTplBody} onChange={setLeadTplBody} minHeight="300px" />
                  </Field>
                  <SaveButton
                    saving={!!saving["leads-email-templates"]}
                    onClick={() => save("leads-email-templates", () => updateByCategory.mutateAsync({ category: `email_template:${selectedLeadTpl}`, values: { subject: leadTplSubject, body: leadTplBody } }))}
                  />
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Template Variables</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {currentLeadTpl.vars.map(v => <div key={v} className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => { setLeadTplBody(prev => prev + `{${v}}`); }}>{`{${v}}`}</div>)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">General Variables</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {LEAD_GENERAL_VARS.map(v => <div key={v} className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => { setLeadTplBody(prev => prev + v); }}>{v}</div>)}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── MILESTONES ────────────────────────────────────────────────────────
      case "milestones-general":
        return (
          <Section title="Milestone Settings" description="Configure milestone behavior">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Notify on Create</p><p className="text-xs text-muted-foreground">Send notification when milestone is created</p></div>
                <Switch checked={milestonesGeneral.notifyOnCreate} onCheckedChange={(v) => setMilestonesGeneral((p) => ({ ...p, notifyOnCreate: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Visible to Clients</p><p className="text-xs text-muted-foreground">Clients can see milestones in their portal</p></div>
                <Switch checked={milestonesGeneral.clientVisible} onCheckedChange={(v) => setMilestonesGeneral((p) => ({ ...p, clientVisible: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["milestones-general"]} onClick={() => save("milestones-general", () => updateByCategory.mutateAsync({ category: "milestones_general", values: { notifyOnCreate: String(milestonesGeneral.notifyOnCreate), clientVisible: String(milestonesGeneral.clientVisible) } }))} />
          </Section>
        );

      case "milestones-defaults":
        return (
          <Section title="Default Milestones" description="Milestones automatically added to new projects">
            <div className="space-y-2">{defaultMilestones.map((m) => (<div key={m.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{m.name}</span><button onClick={() => { const u = defaultMilestones.filter((x) => x.id !== m.id); setDefaultMilestones(u); updateByCategory.mutate({ category: "default_milestones", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Milestone Name"><Input value={newDefaultMilestone.name} onChange={(e) => setNewDefaultMilestone({ name: e.target.value })} placeholder="e.g. Design Phase" /></Field>
              <Button size="sm" onClick={() => { if (!newDefaultMilestone.name) { toast.error("Name required"); return; } const u = [...defaultMilestones, { id: crypto.randomUUID(), ...newDefaultMilestone }]; setDefaultMilestones(u); setNewDefaultMilestone({ name: "" }); updateByCategory.mutate({ category: "default_milestones", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── INVOICES EXTENDED ─────────────────────────────────────────────────
      case "invoices-categories":
        return (
          <Section title="Invoice Categories" description="Organize invoices by category">
            <div className="space-y-2">{invoicesCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = invoicesCategories.filter((x) => x.id !== c.id); setInvoicesCategories(u); updateByCategory.mutate({ category: "invoices_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newInvoiceCat.name} onChange={(e) => setNewInvoiceCat({ name: e.target.value })} placeholder="Category name" /></Field>
              <Button size="sm" onClick={() => { if (!newInvoiceCat.name) { toast.error("Name required"); return; } const u = [...invoicesCategories, { id: crypto.randomUUID(), ...newInvoiceCat }]; setInvoicesCategories(u); setNewInvoiceCat({ name: "" }); updateByCategory.mutate({ category: "invoices_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "invoices-statuses":
        return (
          <Section title="Invoice Statuses" description="Define custom statuses for invoices">
            <div className="space-y-2">{invoicesStatuses.map((s) => (<div key={s.id} className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-sm">{s.name}</span></div><button onClick={() => { const u = invoicesStatuses.filter((x) => x.id !== s.id); setInvoicesStatuses(u); updateByCategory.mutate({ category: "invoices_statuses", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Name"><Input value={newInvoiceStatus.name} onChange={(e) => setNewInvoiceStatus((p) => ({ ...p, name: e.target.value }))} placeholder="Status name" /></Field><Field label="Color"><input type="color" value={newInvoiceStatus.color} onChange={(e) => setNewInvoiceStatus((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-input p-1" /></Field>
              <Button size="sm" onClick={() => { if (!newInvoiceStatus.name) { toast.error("Name required"); return; } const u = [...invoicesStatuses, { id: crypto.randomUUID(), ...newInvoiceStatus }]; setInvoicesStatuses(u); setNewInvoiceStatus({ name: "", color: "#3b82f6" }); updateByCategory.mutate({ category: "invoices_statuses", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── ESTIMATES ─────────────────────────────────────────────────────────
      case "estimates-general":
        return (
          <Section title="Estimate Settings" description="Configure estimate defaults">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow Client Approval</p><p className="text-xs text-muted-foreground">Clients can approve or decline estimates</p></div>
                <Switch checked={estimatesGeneral.allowClientApproval} onCheckedChange={(v) => setEstimatesGeneral((p) => ({ ...p, allowClientApproval: v }))} /></div>
              <Field label="Default Expiry (days)"><Input type="number" min="1" value={estimatesGeneral.expiryDays} onChange={(e) => setEstimatesGeneral((p) => ({ ...p, expiryDays: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving["estimates-general"]} onClick={() => save("estimates-general", () => updateByCategory.mutateAsync({ category: "estimates_general", values: { ...estimatesGeneral, allowClientApproval: String(estimatesGeneral.allowClientApproval) } }))} />
          </Section>
        );

      case "estimates-categories":
        return (
          <Section title="Estimate Categories" description="Organize estimates by category">
            <div className="space-y-2">{estimateCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = estimateCategories.filter((x) => x.id !== c.id); setEstimateCategories(u); updateByCategory.mutate({ category: "estimate_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newEstimateCat.name} onChange={(e) => setNewEstimateCat({ name: e.target.value })} placeholder="Category name" /></Field>
              <Button size="sm" onClick={() => { if (!newEstimateCat.name) { toast.error("Name required"); return; } const u = [...estimateCategories, { id: crypto.randomUUID(), ...newEstimateCat }]; setEstimateCategories(u); setNewEstimateCat({ name: "" }); updateByCategory.mutate({ category: "estimate_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "estimates-automation": {
        const estAutoKeys: [string, string][] = [["autoConvertToInvoice", "Auto-convert approved estimate to invoice"], ["emailOnExpiry", "Email client when estimate expires"], ["notifyOnApproval", "Notify admin on estimate approval"], ["autoAddTax", "Auto-add tax from client's region"]];
        return (
          <Section title="Estimate Automation" description="Automatic actions for estimates">
            <div className="space-y-3">
              {estAutoKeys.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><p className="text-sm">{label}</p><Switch checked={!!estAutomation[key]} onCheckedChange={(v) => setEstAutomation((p) => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <SaveButton saving={!!saving["est-auto"]} onClick={() => save("est-auto", () => updateByCategory.mutateAsync({ category: "estimates_automation", values: Object.fromEntries(Object.entries(estAutomation).map(([k, v]) => [k, String(v)])) }))} />
          </Section>
        );
      }

      // ── TIMESHEETS ────────────────────────────────────────────────────────
      case "timesheets-general":
        return (
          <Section title="Timesheet Settings" description="Configure timesheet tracking">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require Notes</p><p className="text-xs text-muted-foreground">Entries must include a description</p></div>
                <Switch checked={timesheetsGeneral.requireNotes} onCheckedChange={(v) => setTimesheetsGeneral((p) => ({ ...p, requireNotes: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Notify Project Manager</p><p className="text-xs text-muted-foreground">PM gets notified on new timesheet entries</p></div>
                <Switch checked={timesheetsGeneral.notifyPM} onCheckedChange={(v) => setTimesheetsGeneral((p) => ({ ...p, notifyPM: v }))} /></div>
              <Field label="Rounding (minutes)"><Input type="number" min="0" step="5" value={timesheetsGeneral.roundingMinutes} onChange={(e) => setTimesheetsGeneral((p) => ({ ...p, roundingMinutes: e.target.value }))} placeholder="0 = no rounding" /></Field>
            </div>
            <SaveButton saving={!!saving["timesheets-general"]} onClick={() => save("timesheets-general", () => updateByCategory.mutateAsync({ category: "timesheets_general", values: { ...timesheetsGeneral, requireNotes: String(timesheetsGeneral.requireNotes), notifyPM: String(timesheetsGeneral.notifyPM) } }))} />
          </Section>
        );

      // ── PROPOSALS ─────────────────────────────────────────────────────────
      case "proposals-general":
        return (
          <Section title="Proposal Settings" description="Configure proposal defaults">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow E-Signature</p><p className="text-xs text-muted-foreground">Clients can sign proposals electronically</p></div>
                <Switch checked={proposalsGeneral.allowEsign} onCheckedChange={(v) => setProposalsGeneral((p) => ({ ...p, allowEsign: v }))} /></div>
              <Field label="Default Expiry (days)"><Input type="number" min="1" value={proposalsGeneral.expiryDays} onChange={(e) => setProposalsGeneral((p) => ({ ...p, expiryDays: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving["proposals-general"]} onClick={() => save("proposals-general", () => updateByCategory.mutateAsync({ category: "proposals_general", values: { ...proposalsGeneral, allowEsign: String(proposalsGeneral.allowEsign) } }))} />
          </Section>
        );

      case "proposals-categories":
        return (
          <Section title="Proposal Categories" description="Organize proposals by category">
            <div className="space-y-2">{proposalCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = proposalCategories.filter((x) => x.id !== c.id); setProposalCategories(u); updateByCategory.mutate({ category: "proposal_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newProposalCat.name} onChange={(e) => setNewProposalCat({ name: e.target.value })} placeholder="Category name" /></Field>
              <Button size="sm" onClick={() => { if (!newProposalCat.name) { toast.error("Name required"); return; } const u = [...proposalCategories, { id: crypto.randomUUID(), ...newProposalCat }]; setProposalCategories(u); setNewProposalCat({ name: "" }); updateByCategory.mutate({ category: "proposal_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "proposals-automation": {
        const propAutoKeys: [string, string][] = [["autoConvertToProject", "Auto-convert signed proposal to project"], ["remindBeforeExpiry", "Remind client before expiry"], ["notifyOnSignature", "Notify admin on signature"], ["autoGenerateInvoice", "Auto-generate invoice on acceptance"]];
        return (
          <Section title="Proposal Automation" description="Automatic actions for proposals">
            <div className="space-y-3">
              {propAutoKeys.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><p className="text-sm">{label}</p><Switch checked={!!propAutomation[key]} onCheckedChange={(v) => setPropAutomation((p) => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <SaveButton saving={!!saving["prop-auto"]} onClick={() => save("prop-auto", () => updateByCategory.mutateAsync({ category: "proposals_automation", values: Object.fromEntries(Object.entries(propAutomation).map(([k, v]) => [k, String(v)])) }))} />
          </Section>
        );
      }

      // ── CONTRACTS ─────────────────────────────────────────────────────────
      case "contracts-general":
        return (
          <Section title="Contract Settings" description="Configure contract defaults">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow E-Signature</p><p className="text-xs text-muted-foreground">Clients can sign contracts electronically</p></div>
                <Switch checked={contractsGeneral.allowEsign} onCheckedChange={(v) => setContractsGeneral((p) => ({ ...p, allowEsign: v }))} /></div>
              <Field label="Expiry Reminder (days before)"><Input type="number" min="1" value={contractsGeneral.expiryReminderDays} onChange={(e) => setContractsGeneral((p) => ({ ...p, expiryReminderDays: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving["contracts-general"]} onClick={() => save("contracts-general", () => updateByCategory.mutateAsync({ category: "contracts_general", values: { ...contractsGeneral, allowEsign: String(contractsGeneral.allowEsign) } }))} />
          </Section>
        );

      case "contracts-categories":
        return (
          <Section title="Contract Categories" description="Organize contracts by category">
            <div className="space-y-2">{contractCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = contractCategories.filter((x) => x.id !== c.id); setContractCategories(u); updateByCategory.mutate({ category: "contract_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newContractCat.name} onChange={(e) => setNewContractCat({ name: e.target.value })} placeholder="Category name" /></Field>
              <Button size="sm" onClick={() => { if (!newContractCat.name) { toast.error("Name required"); return; } const u = [...contractCategories, { id: crypto.randomUUID(), ...newContractCat }]; setContractCategories(u); setNewContractCat({ name: "" }); updateByCategory.mutate({ category: "contract_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "contracts-automation": {
        const contAutoKeys: [string, string][] = [["emailBeforeExpiry", "Email reminder before expiry"], ["autoRenew", "Auto-renew recurring contracts"], ["notifyOnSignature", "Notify admin on signature"], ["archiveExpired", "Archive expired contracts"]];
        return (
          <Section title="Contract Automation" description="Automatic actions for contracts">
            <div className="space-y-3">
              {contAutoKeys.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><p className="text-sm">{label}</p><Switch checked={!!contAutomation[key]} onCheckedChange={(v) => setContAutomation((p) => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <SaveButton saving={!!saving["cont-auto"]} onClick={() => save("cont-auto", () => updateByCategory.mutateAsync({ category: "contracts_automation", values: Object.fromEntries(Object.entries(contAutomation).map(([k, v]) => [k, String(v)])) }))} />
          </Section>
        );
      }

      // ── PRODUCTS ──────────────────────────────────────────────────────────
      case "products-categories":
        return (
          <Section title="Product Categories" description="Organize products by category">
            <div className="space-y-2">{productsCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = productsCategories.filter((x) => x.id !== c.id); setProductsCategories(u); updateByCategory.mutate({ category: "products_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newProductsCat.name} onChange={(e) => setNewProductsCat({ name: e.target.value })} placeholder="Category name" /></Field>
              <Button size="sm" onClick={() => { if (!newProductsCat.name) { toast.error("Name required"); return; } const u = [...productsCategories, { id: crypto.randomUUID(), ...newProductsCat }]; setProductsCategories(u); setNewProductsCat({ name: "" }); updateByCategory.mutate({ category: "products_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "products-units":
        return (
          <Section title="Product Units" description="Measurement units for products and services">
            <div className="space-y-2">{productUnits.map((u) => (<div key={u.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{u.name}</span><button onClick={() => { const n = productUnits.filter((x) => x.id !== u.id); setProductUnits(n); updateByCategory.mutate({ category: "product_units", values: { list: JSON.stringify(n) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Unit Name"><Input value={newProductUnit.name} onChange={(e) => setNewProductUnit({ name: e.target.value })} placeholder="e.g. Hours, Pieces, Kg" /></Field>
              <Button size="sm" onClick={() => { if (!newProductUnit.name) { toast.error("Name required"); return; } const u = [...productUnits, { id: crypto.randomUUID(), ...newProductUnit }]; setProductUnits(u); setNewProductUnit({ name: "" }); updateByCategory.mutate({ category: "product_units", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── EXPENSES ──────────────────────────────────────────────────────────
      case "expenses-general":
        return (
          <Section title="Expense Settings" description="Configure expense tracking">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require Receipt</p><p className="text-xs text-muted-foreground">Expenses must have an attached receipt</p></div>
                <Switch checked={expensesGeneral.requireReceipt} onCheckedChange={(v) => setExpensesGeneral((p) => ({ ...p, requireReceipt: v }))} /></div>
              <Field label="Auto-Approve Below Amount"><Input type="number" min="0" value={expensesGeneral.autoApproveBelow} onChange={(e) => setExpensesGeneral((p) => ({ ...p, autoApproveBelow: e.target.value }))} placeholder="0 = all require approval" /></Field>
            </div>
            <SaveButton saving={!!saving["expenses-general"]} onClick={() => save("expenses-general", () => updateByCategory.mutateAsync({ category: "expenses_general", values: { ...expensesGeneral, requireReceipt: String(expensesGeneral.requireReceipt) } }))} />
          </Section>
        );

      case "expenses-categories":
        return (
          <Section title="Expense Categories" description="Organize expenses by category">
            <div className="space-y-2">{expenseCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = expenseCategories.filter((x) => x.id !== c.id); setExpenseCategories(u); updateByCategory.mutate({ category: "expense_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newExpenseCat.name} onChange={(e) => setNewExpenseCat({ name: e.target.value })} placeholder="Category name" /></Field>
              <Button size="sm" onClick={() => { if (!newExpenseCat.name) { toast.error("Name required"); return; } const u = [...expenseCategories, { id: crypto.randomUUID(), ...newExpenseCat }]; setExpenseCategories(u); setNewExpenseCat({ name: "" }); updateByCategory.mutate({ category: "expense_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────
      case "subscriptions-general":
        return (
          <Section title="Subscription Settings" description="Configure recurring subscription defaults">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Tax Inclusive</p><p className="text-xs text-muted-foreground">Subscription prices include tax</p></div>
                <Switch checked={subsGeneral.taxInclusive} onCheckedChange={(v) => setSubsGeneral((p) => ({ ...p, taxInclusive: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Round Amounts</p><p className="text-xs text-muted-foreground">Round subscription amounts to nearest whole number</p></div>
                <Switch checked={subsGeneral.roundAmounts} onCheckedChange={(v) => setSubsGeneral((p) => ({ ...p, roundAmounts: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["subs-general"]} onClick={() => save("subs-general", () => updateByCategory.mutateAsync({ category: "subscriptions_general", values: { taxInclusive: String(subsGeneral.taxInclusive), roundAmounts: String(subsGeneral.roundAmounts) } }))} />
          </Section>
        );

      // ── TAGS GENERAL ──────────────────────────────────────────────────────
      case "tags-general":
        return (
          <Section title="Tag Settings" description="Configure tag behavior">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow User-Created Tags</p><p className="text-xs text-muted-foreground">Any user can create new tags</p></div>
                <Switch checked={tagsGeneral.allowUserCreate} onCheckedChange={(v) => setTagsGeneral((p) => ({ ...p, allowUserCreate: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Auto Lowercase</p><p className="text-xs text-muted-foreground">Convert tag names to lowercase automatically</p></div>
                <Switch checked={tagsGeneral.autoLowercase} onCheckedChange={(v) => setTagsGeneral((p) => ({ ...p, autoLowercase: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["tags-general"]} onClick={() => save("tags-general", () => updateByCategory.mutateAsync({ category: "tags_general", values: { allowUserCreate: String(tagsGeneral.allowUserCreate), autoLowercase: String(tagsGeneral.autoLowercase) } }))} />
          </Section>
        );

      // ── FILES ─────────────────────────────────────────────────────────────
      case "files-general":
        return (
          <Section title="File Settings" description="Configure file upload limits and types">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Max File Size (MB)"><Input type="number" min="1" value={filesGeneral.maxSizeMb} onChange={(e) => setFilesGeneral((p) => ({ ...p, maxSizeMb: e.target.value }))} /></Field>
              <Field label="Max Files Per Upload"><Input type="number" min="1" value={filesGeneral.maxFilesPerUpload} onChange={(e) => setFilesGeneral((p) => ({ ...p, maxFilesPerUpload: e.target.value }))} /></Field>
            </div>
            <Field label="Allowed File Types"><Input value={filesGeneral.allowedTypes} onChange={(e) => setFilesGeneral((p) => ({ ...p, allowedTypes: e.target.value }))} placeholder="pdf,doc,docx,xls,xlsx,png,jpg" /></Field>
            <SaveButton saving={!!saving["files-general"]} onClick={() => save("files-general", () => updateByCategory.mutateAsync({ category: "files_general", values: filesGeneral }))} />
          </Section>
        );

      case "files-folders":
        return (
          <Section title="File Folders" description="Manage organizational folders for file storage">
            <div className="space-y-2">{fileFolders.map((f) => (<div key={f.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{f.name}</span><button onClick={() => { const u = fileFolders.filter((x) => x.id !== f.id); setFileFolders(u); updateByCategory.mutate({ category: "file_folders", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Folder Name"><Input value={newFileFolder.name} onChange={(e) => setNewFileFolder({ name: e.target.value })} placeholder="e.g. Contracts, Reports" /></Field>
              <Button size="sm" onClick={() => { if (!newFileFolder.name) { toast.error("Name required"); return; } const u = [...fileFolders, { id: crypto.randomUUID(), ...newFileFolder }]; setFileFolders(u); setNewFileFolder({ name: "" }); updateByCategory.mutate({ category: "file_folders", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "files-default-folders":
        return (
          <Section title="Default Folders" description="Folders automatically created for new projects/clients">
            <div className="space-y-2">{defaultFolders.map((f) => (<div key={f.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{f.name}</span><button onClick={() => { const u = defaultFolders.filter((x) => x.id !== f.id); setDefaultFolders(u); updateByCategory.mutate({ category: "default_folders", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Folder Name"><Input value={newDefaultFolder.name} onChange={(e) => setNewDefaultFolder({ name: e.target.value })} placeholder="e.g. Documents, Invoices" /></Field>
              <Button size="sm" onClick={() => { if (!newDefaultFolder.name) { toast.error("Name required"); return; } const u = [...defaultFolders, { id: crypto.randomUUID(), ...newDefaultFolder }]; setDefaultFolders(u); setNewDefaultFolder({ name: "" }); updateByCategory.mutate({ category: "default_folders", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── PAYMENT GATEWAYS ──────────────────────────────────────────────────
      case "payments-flutterwave":
        return (
          <Section title="Flutterwave" description="Accept payments via Flutterwave">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable Flutterwave</p><Switch checked={flutterwave.enabled} onCheckedChange={(c) => setFlutterwave((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Public Key"><Input value={flutterwave.publicKey} onChange={(e) => setFlutterwave((p) => ({ ...p, publicKey: e.target.value }))} placeholder="FLWPUBK-…" /></Field>
              <Field label="Secret Key"><Input type="password" value={flutterwave.secretKey} onChange={(e) => setFlutterwave((p) => ({ ...p, secretKey: e.target.value }))} placeholder="FLWSECK-…" /></Field>
            </div>
            <SaveButton saving={!!saving["flutterwave"]} onClick={() => save("flutterwave", () => updateByCategory.mutateAsync({ category: "payment_flutterwave", values: { ...flutterwave, enabled: String(flutterwave.enabled) } }))} />
          </Section>
        );

      case "payments-razorpay":
        return (
          <Section title="Razorpay" description="Accept payments via Razorpay">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable Razorpay</p><Switch checked={razorpay.enabled} onCheckedChange={(c) => setRazorpay((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Key ID"><Input value={razorpay.keyId} onChange={(e) => setRazorpay((p) => ({ ...p, keyId: e.target.value }))} placeholder="rzp_live_…" /></Field>
              <Field label="Key Secret"><Input type="password" value={razorpay.keySecret} onChange={(e) => setRazorpay((p) => ({ ...p, keySecret: e.target.value }))} placeholder="Key Secret" /></Field>
            </div>
            <SaveButton saving={!!saving["razorpay"]} onClick={() => save("razorpay", () => updateByCategory.mutateAsync({ category: "payment_razorpay", values: { ...razorpay, enabled: String(razorpay.enabled) } }))} />
          </Section>
        );

      case "payments-paypal":
        return (
          <Section title="PayPal" description="Accept payments via PayPal">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable PayPal</p><Switch checked={paypal.enabled} onCheckedChange={(c) => setPaypal((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Client ID"><Input value={paypal.clientId} onChange={(e) => setPaypal((p) => ({ ...p, clientId: e.target.value }))} placeholder="Client ID" /></Field>
              <Field label="Client Secret"><Input type="password" value={paypal.clientSecret} onChange={(e) => setPaypal((p) => ({ ...p, clientSecret: e.target.value }))} placeholder="Client Secret" /></Field>
              <Field label="Mode">
                <Select value={paypal.mode} onValueChange={(v) => setPaypal((p) => ({ ...p, mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["paypal"]} onClick={() => save("paypal", () => updateByCategory.mutateAsync({ category: "payment_paypal", values: { ...paypal, enabled: String(paypal.enabled) } }))} />
          </Section>
        );

      case "payments-paystack":
        return (
          <Section title="Paystack" description="Accept payments via Paystack">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable Paystack</p><Switch checked={paystack.enabled} onCheckedChange={(c) => setPaystack((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Public Key"><Input value={paystack.publicKey} onChange={(e) => setPaystack((p) => ({ ...p, publicKey: e.target.value }))} placeholder="pk_live_…" /></Field>
              <Field label="Secret Key"><Input type="password" value={paystack.secretKey} onChange={(e) => setPaystack((p) => ({ ...p, secretKey: e.target.value }))} placeholder="sk_live_…" /></Field>
            </div>
            <SaveButton saving={!!saving["paystack"]} onClick={() => save("paystack", () => updateByCategory.mutateAsync({ category: "payment_paystack", values: { ...paystack, enabled: String(paystack.enabled) } }))} />
          </Section>
        );

      // ── TICKETS ───────────────────────────────────────────────────────────
      case "tickets-general":
        return (
          <Section title="Ticket Settings" description="Configure support ticket system">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow Client Tickets</p><p className="text-xs text-muted-foreground">Clients can create tickets from portal</p></div>
                <Switch checked={ticketsGeneral.allowClientTickets} onCheckedChange={(v) => setTicketsGeneral((p) => ({ ...p, allowClientTickets: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Auto-Assign</p><p className="text-xs text-muted-foreground">Automatically assign tickets to available agents</p></div>
                <Switch checked={ticketsGeneral.autoAssign} onCheckedChange={(v) => setTicketsGeneral((p) => ({ ...p, autoAssign: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Notify Agents</p><p className="text-xs text-muted-foreground">Email agents when new ticket is created</p></div>
                <Switch checked={ticketsGeneral.notifyAgents} onCheckedChange={(v) => setTicketsGeneral((p) => ({ ...p, notifyAgents: v }))} /></div>
              <Field label="Auto-close after (days)"><Input type="number" min="1" value={ticketsGeneral.closeAfterDays} onChange={(e) => setTicketsGeneral((p) => ({ ...p, closeAfterDays: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving["tickets-general"]} onClick={() => save("tickets-general", () => updateByCategory.mutateAsync({ category: "tickets_general", values: { ...ticketsGeneral, allowClientTickets: String(ticketsGeneral.allowClientTickets), autoAssign: String(ticketsGeneral.autoAssign), notifyAgents: String(ticketsGeneral.notifyAgents) } }))} />
          </Section>
        );

      case "tickets-departments":
        return (
          <Section title="Ticket Departments" description="Organize tickets by department">
            <div className="space-y-2">{ticketDepts.map((d) => (<div key={d.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{d.name}</span><button onClick={() => { const u = ticketDepts.filter((x) => x.id !== d.id); setTicketDepts(u); updateByCategory.mutate({ category: "ticket_departments", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Department Name"><Input value={newTicketDept.name} onChange={(e) => setNewTicketDept({ name: e.target.value })} placeholder="e.g. Technical Support" /></Field>
              <Button size="sm" onClick={() => { if (!newTicketDept.name) { toast.error("Name required"); return; } const u = [...ticketDepts, { id: crypto.randomUUID(), ...newTicketDept }]; setTicketDepts(u); setNewTicketDept({ name: "" }); updateByCategory.mutate({ category: "ticket_departments", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "tickets-statuses":
        return (
          <Section title="Ticket Statuses" description="Define statuses for support tickets">
            <div className="space-y-2">{ticketStatuses.map((s) => (<div key={s.id} className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} /><span className="text-sm">{s.name}</span></div><button onClick={() => { const u = ticketStatuses.filter((x) => x.id !== s.id); setTicketStatuses(u); updateByCategory.mutate({ category: "ticket_statuses", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Name"><Input value={newTicketStatus.name} onChange={(e) => setNewTicketStatus((p) => ({ ...p, name: e.target.value }))} placeholder="Status name" /></Field><Field label="Color"><input type="color" value={newTicketStatus.color} onChange={(e) => setNewTicketStatus((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-input p-1" /></Field>
              <Button size="sm" onClick={() => { if (!newTicketStatus.name) { toast.error("Name required"); return; } const u = [...ticketStatuses, { id: crypto.randomUUID(), ...newTicketStatus }]; setTicketStatuses(u); setNewTicketStatus({ name: "", color: "#3b82f6" }); updateByCategory.mutate({ category: "ticket_statuses", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "tickets-canned":
        return (
          <Section title="Canned Responses" description="Pre-written responses for common ticket replies">
            <div className="space-y-2">{ticketCanned.map((c) => (<div key={c.id} className="flex items-center justify-between p-3 border rounded"><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground line-clamp-1">{c.body}</p></div><button onClick={() => { const u = ticketCanned.filter((x) => x.id !== c.id); setTicketCanned(u); updateByCategory.mutate({ category: "ticket_canned", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <Separator />
            <div className="space-y-3"><Field label="Response Name"><Input value={newCanned.name} onChange={(e) => setNewCanned((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Greeting" /></Field>
              <Field label="Response Body"><RichTextEditor value={newCanned.body} onChange={(html) => setNewCanned((p) => ({ ...p, body: html }))} placeholder="Type the canned response text..." minHeight="100px" /></Field>
              <Button size="sm" onClick={() => { if (!newCanned.name || !newCanned.body) { toast.error("Name and body required"); return; } const u = [...ticketCanned, { id: crypto.randomUUID(), ...newCanned }]; setTicketCanned(u); setNewCanned({ name: "", body: "" }); updateByCategory.mutate({ category: "ticket_canned", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── KNOWLEDGEBASE ─────────────────────────────────────────────────────
      case "kb-general":
        return (
          <Section title="Knowledgebase Settings" description="Configure the self-service knowledgebase">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Guest Access</p><p className="text-xs text-muted-foreground">Non-logged-in users can view articles</p></div>
                <Switch checked={kbGeneral.guestAccess} onCheckedChange={(v) => setKbGeneral((p) => ({ ...p, guestAccess: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Comments</p><p className="text-xs text-muted-foreground">Users can comment on articles</p></div>
                <Switch checked={kbGeneral.enableComments} onCheckedChange={(v) => setKbGeneral((p) => ({ ...p, enableComments: v }))} /></div>
              <Field label="Articles Per Page"><Input type="number" min="5" value={kbGeneral.articlesPerPage} onChange={(e) => setKbGeneral((p) => ({ ...p, articlesPerPage: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving["kb-general"]} onClick={() => save("kb-general", () => updateByCategory.mutateAsync({ category: "kb_general", values: { guestAccess: String(kbGeneral.guestAccess), enableComments: String(kbGeneral.enableComments), articlesPerPage: kbGeneral.articlesPerPage } }))} />
          </Section>
        );

      case "kb-categories":
        return (
          <Section title="KB Categories" description="Organize knowledgebase articles by category">
            <div className="space-y-2">{kbCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = kbCategories.filter((x) => x.id !== c.id); setKbCategories(u); updateByCategory.mutate({ category: "kb_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newKbCat.name} onChange={(e) => setNewKbCat({ name: e.target.value })} placeholder="Category name" /></Field>
              <Button size="sm" onClick={() => { if (!newKbCat.name) { toast.error("Name required"); return; } const u = [...kbCategories, { id: crypto.randomUUID(), ...newKbCat }]; setKbCategories(u); setNewKbCat({ name: "" }); updateByCategory.mutate({ category: "kb_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── ANNOUNCEMENTS ─────────────────────────────────────────────────────
      case "announcements-general":
        return (
          <Section title="Announcement Settings" description="Configure system announcements">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Announcements</p><p className="text-xs text-muted-foreground">Show announcements to users</p></div>
                <Switch checked={announcementsGeneral.enabled} onCheckedChange={(v) => setAnnouncementsGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Default Audience: All</p><p className="text-xs text-muted-foreground">New announcements visible to everyone by default</p></div>
                <Switch checked={announcementsGeneral.defaultAudienceAll} onCheckedChange={(v) => setAnnouncementsGeneral((p) => ({ ...p, defaultAudienceAll: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["announcements-general"]} onClick={() => save("announcements-general", () => updateByCategory.mutateAsync({ category: "announcements_general", values: { enabled: String(announcementsGeneral.enabled), defaultAudienceAll: String(announcementsGeneral.defaultAudienceAll) } }))} />
          </Section>
        );

      case "announcements-list":
        return (
          <Section title="Manage Announcements" description="Create and manage system announcements">
            <div className="space-y-2">{announcementsList.map((a) => (<div key={a.id} className="flex items-center justify-between p-3 border rounded"><div><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.audience} &middot; {a.date || "No date"}</p></div><button onClick={() => { const u = announcementsList.filter((x) => x.id !== a.id); setAnnouncementsList(u); updateByCategory.mutate({ category: "announcements_list", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <Separator />
            <div className="grid grid-cols-2 gap-3"><Field label="Title"><Input value={newAnnouncement.title} onChange={(e) => setNewAnnouncement((p) => ({ ...p, title: e.target.value }))} placeholder="Announcement title" /></Field>
              <Field label="Audience"><Select value={newAnnouncement.audience} onValueChange={(v) => setNewAnnouncement((p) => ({ ...p, audience: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Users</SelectItem><SelectItem value="staff">Staff Only</SelectItem><SelectItem value="clients">Clients Only</SelectItem></SelectContent></Select></Field></div>
            <Field label="Message"><RichTextEditor value={newAnnouncement.message} onChange={(html) => setNewAnnouncement((p) => ({ ...p, message: html }))} placeholder="Announcement message" minHeight="80px" /></Field>
            <Button size="sm" onClick={() => { if (!newAnnouncement.title) { toast.error("Title required"); return; } const u = [...announcementsList, { id: crypto.randomUUID(), ...newAnnouncement, date: new Date().toISOString().slice(0, 10) }]; setAnnouncementsList(u); setNewAnnouncement({ title: "", message: "", audience: "all", date: "" }); updateByCategory.mutate({ category: "announcements_list", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add Announcement</Button>
          </Section>
        );

      // ── GOALS ─────────────────────────────────────────────────────────────
      case "goals-general":
        return (
          <Section title="Goal Settings" description="Configure goal tracking">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Goals Module</p><p className="text-xs text-muted-foreground">Allow teams to set and track goals</p></div>
                <Switch checked={goalsGeneral.enableModule} onCheckedChange={(v) => setGoalsGeneral((p) => ({ ...p, enableModule: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow Team Goals</p><p className="text-xs text-muted-foreground">Teams can collaborate on shared goals</p></div>
                <Switch checked={goalsGeneral.allowTeamGoals} onCheckedChange={(v) => setGoalsGeneral((p) => ({ ...p, allowTeamGoals: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["goals-general"]} onClick={() => save("goals-general", () => updateByCategory.mutateAsync({ category: "goals_general", values: { enableModule: String(goalsGeneral.enableModule), allowTeamGoals: String(goalsGeneral.allowTeamGoals) } }))} />
          </Section>
        );

      case "goals-categories":
        return (
          <Section title="Goal Categories" description="Organize goals by category">
            <div className="space-y-2">{goalsCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = goalsCategories.filter((x) => x.id !== c.id); setGoalsCategories(u); updateByCategory.mutate({ category: "goals_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newGoalsCat.name} onChange={(e) => setNewGoalsCat({ name: e.target.value })} placeholder="Category name" /></Field>
              <Button size="sm" onClick={() => { if (!newGoalsCat.name) { toast.error("Name required"); return; } const u = [...goalsCategories, { id: crypto.randomUUID(), ...newGoalsCat }]; setGoalsCategories(u); setNewGoalsCat({ name: "" }); updateByCategory.mutate({ category: "goals_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      // ── REMINDERS ─────────────────────────────────────────────────────────
      case "reminders-general":
        return (
          <Section title="Reminder Settings" description="Configure default reminder channels and timing">
            <Field label="Default Reminder (minutes before)"><Input type="number" min="1" value={remindersGeneral.defaultMinutesBefore} onChange={(e) => setRemindersGeneral((p) => ({ ...p, defaultMinutesBefore: e.target.value }))} /></Field>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between"><p className="text-sm">Email Channel</p><Switch checked={remindersGeneral.emailChannel} onCheckedChange={(v) => setRemindersGeneral((p) => ({ ...p, emailChannel: v }))} /></div>
              <div className="flex items-center justify-between"><p className="text-sm">Push Notification Channel</p><Switch checked={remindersGeneral.pushChannel} onCheckedChange={(v) => setRemindersGeneral((p) => ({ ...p, pushChannel: v }))} /></div>
              <div className="flex items-center justify-between"><p className="text-sm">SMS Channel</p><Switch checked={remindersGeneral.smsChannel} onCheckedChange={(v) => setRemindersGeneral((p) => ({ ...p, smsChannel: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["reminders-general"]} onClick={() => save("reminders-general", () => updateByCategory.mutateAsync({ category: "reminders_general", values: { defaultMinutesBefore: remindersGeneral.defaultMinutesBefore, emailChannel: String(remindersGeneral.emailChannel), pushChannel: String(remindersGeneral.pushChannel), smsChannel: String(remindersGeneral.smsChannel) } }))} />
          </Section>
        );

      // ── SECURITY ──────────────────────────────────────────────────────────
      case "security-password":
        return (
          <Section title="Password Policy" description="Configure password requirements for all users">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Minimum Length"><Input type="number" min="6" value={securityPassword.minLength} onChange={(e) => setSecurityPassword((p) => ({ ...p, minLength: e.target.value }))} /></Field>
              <Field label="Password Expiry (days)"><Input type="number" min="0" value={securityPassword.expiryDays} onChange={(e) => setSecurityPassword((p) => ({ ...p, expiryDays: e.target.value }))} placeholder="0 = never" /></Field>
            </div>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between"><p className="text-sm">Require Uppercase Letter</p><Switch checked={securityPassword.requireUppercase} onCheckedChange={(v) => setSecurityPassword((p) => ({ ...p, requireUppercase: v }))} /></div>
              <div className="flex items-center justify-between"><p className="text-sm">Require Number</p><Switch checked={securityPassword.requireNumbers} onCheckedChange={(v) => setSecurityPassword((p) => ({ ...p, requireNumbers: v }))} /></div>
              <div className="flex items-center justify-between"><p className="text-sm">Require Special Character</p><Switch checked={securityPassword.requireSpecial} onCheckedChange={(v) => setSecurityPassword((p) => ({ ...p, requireSpecial: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["security-password"]} onClick={() => save("security-password", () => updateByCategory.mutateAsync({ category: "security_password", values: { ...securityPassword, requireUppercase: String(securityPassword.requireUppercase), requireNumbers: String(securityPassword.requireNumbers), requireSpecial: String(securityPassword.requireSpecial) } }))} />
          </Section>
        );

      case "security-2fa":
        return (
          <Section title="Two-Factor Authentication" description="Configure 2FA settings for the organization">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable 2FA</p><p className="text-xs text-muted-foreground">Allow users to enable two-factor authentication</p></div>
                <Switch checked={twofa.enabled} onCheckedChange={(v) => setTwofa((p) => ({ ...p, enabled: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require for Admins</p><p className="text-xs text-muted-foreground">Force 2FA for admin-level users</p></div>
                <Switch checked={twofa.requireForAdmins} onCheckedChange={(v) => setTwofa((p) => ({ ...p, requireForAdmins: v }))} /></div>
              <Field label="Authentication Method">
                <Select value={twofa.method} onValueChange={(v) => setTwofa((p) => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="totp">TOTP (Authenticator App)</SelectItem><SelectItem value="sms">SMS Code</SelectItem><SelectItem value="email">Email Code</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["security-2fa"]} onClick={() => save("security-2fa", () => updateByCategory.mutateAsync({ category: "security_2fa", values: { ...twofa, enabled: String(twofa.enabled), requireForAdmins: String(twofa.requireForAdmins) } }))} />
          </Section>
        );

      case "security-sessions":
        return (
          <Section title="Active Sessions" description="View and manage active user sessions">
            <p className="text-sm text-muted-foreground">Active session management will show currently logged-in users and allow terminating sessions.</p>
            <div className="border rounded-md p-4 bg-muted/40"><div className="flex items-center gap-3"><Activity className="h-5 w-5 text-green-500" /><div><p className="text-sm font-medium">Current Session</p><p className="text-xs text-muted-foreground">Browser &middot; Active now</p></div></div></div>
          </Section>
        );

      case "security-log":
        return (
          <Section title="Login History" description="View recent login attempts">
            <p className="text-sm text-muted-foreground">Login history will be displayed here showing successful and failed login attempts with IP addresses and timestamps.</p>
          </Section>
        );

      // ── GDPR ──────────────────────────────────────────────────────────────
      case "gdpr-general":
        return (
          <Section title="GDPR Settings" description="Configure data protection compliance">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable GDPR Module</p><p className="text-xs text-muted-foreground">Activate GDPR compliance features</p></div>
                <Switch checked={gdprGeneral.enabled} onCheckedChange={(v) => setGdprGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <Field label="Data Retention (days)"><Input type="number" min="30" value={gdprGeneral.retentionDays} onChange={(e) => setGdprGeneral((p) => ({ ...p, retentionDays: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving["gdpr-general"]} onClick={() => save("gdpr-general", () => updateByCategory.mutateAsync({ category: "gdpr_general", values: { enabled: String(gdprGeneral.enabled), retentionDays: gdprGeneral.retentionDays } }))} />
          </Section>
        );

      case "gdpr-cookies":
        return (
          <Section title="Cookie Consent" description="Configure cookie consent banner">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Show Cookie Banner</p><p className="text-xs text-muted-foreground">Display cookie consent to visitors</p></div>
                <Switch checked={gdprCookies.bannerEnabled} onCheckedChange={(v) => setGdprCookies((p) => ({ ...p, bannerEnabled: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Analytics Cookies</p><p className="text-xs text-muted-foreground">Allow analytics tracking cookies</p></div>
                <Switch checked={gdprCookies.analyticsEnabled} onCheckedChange={(v) => setGdprCookies((p) => ({ ...p, analyticsEnabled: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Marketing Cookies</p><p className="text-xs text-muted-foreground">Allow marketing and advertising cookies</p></div>
                <Switch checked={gdprCookies.marketingEnabled} onCheckedChange={(v) => setGdprCookies((p) => ({ ...p, marketingEnabled: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["gdpr-cookies"]} onClick={() => save("gdpr-cookies", () => updateByCategory.mutateAsync({ category: "gdpr_cookies", values: { bannerEnabled: String(gdprCookies.bannerEnabled), analyticsEnabled: String(gdprCookies.analyticsEnabled), marketingEnabled: String(gdprCookies.marketingEnabled) } }))} />
          </Section>
        );

      case "gdpr-data-requests":
        return (
          <Section title="Data Requests" description="Manage user data access and export requests">
            <p className="text-sm text-muted-foreground">No pending data requests. When users request their data under GDPR, requests will appear here.</p>
          </Section>
        );

      case "gdpr-deletion":
        return (
          <Section title="Data Deletion" description="Manage data deletion requests">
            <p className="text-sm text-muted-foreground">No pending deletion requests. When users request data deletion under their right to be forgotten, requests will appear here.</p>
          </Section>
        );

      // ── SMS ───────────────────────────────────────────────────────────────
      case "sms-settings":
        return (
          <Section title="SMS Settings" description="Configure SMS provider and credentials">
            <Field label="SMS Provider">
              <Select value={smsSettings.provider} onValueChange={(v) => setSmsSettings((p) => ({ ...p, provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="twilio">Twilio</SelectItem><SelectItem value="africastalking">Africa's Talking</SelectItem></SelectContent>
              </Select>
            </Field>
            {smsSettings.provider === "twilio" ? (
              <div className="grid grid-cols-1 gap-4">
                <Field label="Account SID"><Input value={smsSettings.accountSid} onChange={(e) => setSmsSettings((p) => ({ ...p, accountSid: e.target.value }))} placeholder="AC…" /></Field>
                <Field label="Auth Token"><Input type="password" value={smsSettings.authToken} onChange={(e) => setSmsSettings((p) => ({ ...p, authToken: e.target.value }))} /></Field>
                <Field label="From Number"><Input value={smsSettings.fromNumber} onChange={(e) => setSmsSettings((p) => ({ ...p, fromNumber: e.target.value }))} placeholder="+1234567890" /></Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <Field label="API Key"><Input value={smsSettings.atApiKey} onChange={(e) => setSmsSettings((p) => ({ ...p, atApiKey: e.target.value }))} /></Field>
                <Field label="Username"><Input value={smsSettings.atUsername} onChange={(e) => setSmsSettings((p) => ({ ...p, atUsername: e.target.value }))} /></Field>
              </div>
            )}
            <SaveButton saving={!!saving["sms-settings"]} onClick={() => save("sms-settings", () => updateByCategory.mutateAsync({ category: "sms_settings", values: smsSettings }))} />
          </Section>
        );

      case "sms-templates":
        return (
          <Section title="SMS Templates" description="Manage SMS message templates">
            <div className="space-y-2">{smsTemplates.map((t) => (<div key={t.id} className="flex items-center justify-between p-3 border rounded"><div><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground line-clamp-1">{t.body}</p></div><button onClick={() => { const u = smsTemplates.filter((x) => x.id !== t.id); setSmsTemplates(u); updateByCategory.mutate({ category: "sms_templates", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <Separator />
            <div className="space-y-3"><Field label="Template Name"><Input value={newSmsTemplate.name} onChange={(e) => setNewSmsTemplate((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Payment Reminder" /></Field>
              <Field label="Message Body"><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={newSmsTemplate.body} onChange={(e) => setNewSmsTemplate((p) => ({ ...p, body: e.target.value }))} placeholder="Hi {name}, your payment of {amount} is due..." /></Field>
              <Button size="sm" onClick={() => { if (!newSmsTemplate.name) { toast.error("Name required"); return; } const u = [...smsTemplates, { id: crypto.randomUUID(), ...newSmsTemplate }]; setSmsTemplates(u); setNewSmsTemplate({ name: "", body: "" }); updateByCategory.mutate({ category: "sms_templates", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "sms-log":
        return (
          <Section title="SMS Log" description="History of sent SMS messages">
            <p className="text-sm text-muted-foreground">SMS log is empty. Sent messages will appear here with delivery status.</p>
          </Section>
        );

      // ── PUSH NOTIFICATIONS ────────────────────────────────────────────────
      case "push-general":
        return (
          <Section title="Push Notification Settings" description="Configure browser and mobile push notifications">
            <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Push Notifications</p><p className="text-xs text-muted-foreground">Send push notifications to users</p></div>
              <Switch checked={pushGeneral.enabled} onCheckedChange={(v) => setPushGeneral({ enabled: v })} /></div>
            <SaveButton saving={!!saving["push-general"]} onClick={() => save("push-general", () => updateByCategory.mutateAsync({ category: "push_general", values: { enabled: String(pushGeneral.enabled) } }))} />
          </Section>
        );

      case "push-fcm":
        return (
          <Section title="Firebase Cloud Messaging" description="Configure FCM for push notifications">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Server Key"><Input type="password" value={fcmSettings.serverKey} onChange={(e) => setFcmSettings((p) => ({ ...p, serverKey: e.target.value }))} placeholder="FCM Server Key" /></Field>
              <Field label="Sender ID"><Input value={fcmSettings.senderId} onChange={(e) => setFcmSettings((p) => ({ ...p, senderId: e.target.value }))} placeholder="123456789" /></Field>
              <Field label="VAPID Key"><Input value={fcmSettings.vapidKey} onChange={(e) => setFcmSettings((p) => ({ ...p, vapidKey: e.target.value }))} placeholder="VAPID public key" /></Field>
            </div>
            <SaveButton saving={!!saving["push-fcm"]} onClick={() => save("push-fcm", () => updateByCategory.mutateAsync({ category: "push_fcm", values: fcmSettings }))} />
          </Section>
        );

      // ── WEBHOOKS ──────────────────────────────────────────────────────────
      case "webhooks-general":
        return (
          <Section title="Webhook Settings" description="Configure webhook delivery settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Webhooks</p><p className="text-xs text-muted-foreground">Allow sending event data to external URLs</p></div>
                <Switch checked={webhooksGeneral.enabled} onCheckedChange={(v) => setWebhooksGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <Field label="Max Retries"><Input type="number" min="0" max="10" value={webhooksGeneral.maxRetries} onChange={(e) => setWebhooksGeneral((p) => ({ ...p, maxRetries: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving["webhooks-general"]} onClick={() => save("webhooks-general", () => updateByCategory.mutateAsync({ category: "webhooks_general", values: { enabled: String(webhooksGeneral.enabled), maxRetries: webhooksGeneral.maxRetries } }))} />
          </Section>
        );

      case "webhooks-list":
        return (
          <Section title="Manage Webhooks" description="Create and manage webhook endpoints">
            <div className="space-y-2">{webhooksList.map((w) => (<div key={w.id} className="flex items-center justify-between p-3 border rounded"><div><p className="text-sm font-medium">{w.url}</p><p className="text-xs text-muted-foreground">{w.event} &middot; {w.enabled ? "Active" : "Disabled"}</p></div><button onClick={() => { const u = webhooksList.filter((x) => x.id !== w.id); setWebhooksList(u); updateByCategory.mutate({ category: "webhooks_list", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <Separator />
            <div className="grid grid-cols-2 gap-3"><Field label="Endpoint URL"><Input value={newWebhook.url} onChange={(e) => setNewWebhook((p) => ({ ...p, url: e.target.value }))} placeholder="https://example.com/webhook" /></Field>
              <Field label="Event"><Select value={newWebhook.event} onValueChange={(v) => setNewWebhook((p) => ({ ...p, event: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="invoice.created">Invoice Created</SelectItem><SelectItem value="invoice.paid">Invoice Paid</SelectItem><SelectItem value="client.created">Client Created</SelectItem><SelectItem value="project.created">Project Created</SelectItem><SelectItem value="task.completed">Task Completed</SelectItem><SelectItem value="lead.created">Lead Created</SelectItem></SelectContent></Select></Field></div>
            <Button size="sm" onClick={() => { if (!newWebhook.url) { toast.error("URL required"); return; } const u = [...webhooksList, { id: crypto.randomUUID(), ...newWebhook, enabled: true }]; setWebhooksList(u); setNewWebhook({ url: "", event: "invoice.created" }); updateByCategory.mutate({ category: "webhooks_list", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add Webhook</Button>
          </Section>
        );

      case "webhooks-log":
        return (
          <Section title="Webhook Delivery Log" description="View webhook delivery attempts and responses">
            <p className="text-sm text-muted-foreground">No webhook deliveries recorded yet. Delivery attempts will appear here with status codes and response times.</p>
          </Section>
        );

      // ── API ACCESS ────────────────────────────────────────────────────────
      case "api-general":
        return (
          <Section title="API Settings" description="Configure REST API access">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable API</p><p className="text-xs text-muted-foreground">Allow external applications to access your CRM data</p></div>
                <Switch checked={apiGeneral.enabled} onCheckedChange={(v) => setApiGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Rate Limit"><Input type="number" min="1" value={apiGeneral.rateLimit} onChange={(e) => setApiGeneral((p) => ({ ...p, rateLimit: e.target.value }))} /></Field>
                <Field label="Per"><Select value={apiGeneral.rateLimitPer} onValueChange={(v) => setApiGeneral((p) => ({ ...p, rateLimitPer: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minute">Minute</SelectItem><SelectItem value="hour">Hour</SelectItem></SelectContent></Select></Field>
              </div>
            </div>
            <SaveButton saving={!!saving["api-general"]} onClick={() => save("api-general", () => updateByCategory.mutateAsync({ category: "api_general", values: { ...apiGeneral, enabled: String(apiGeneral.enabled) } }))} />
          </Section>
        );

      case "api-keys":
        return (
          <Section title="API Keys" description="Manage API keys for external integrations">
            <div className="space-y-2">{apiKeys.map((k) => (<div key={k.id} className="flex items-center justify-between p-3 border rounded"><div><p className="text-sm font-medium">{k.name}</p><p className="text-xs text-muted-foreground font-mono">{k.key.slice(0, 12)}… &middot; {k.permissions}</p></div><button onClick={() => { const u = apiKeys.filter((x) => x.id !== k.id); setApiKeys(u); updateByCategory.mutate({ category: "api_keys", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <Separator />
            <div className="flex gap-2 items-end"><Field label="Key Name"><Input value={newApiKeyName} onChange={(e) => setNewApiKeyName(e.target.value)} placeholder="My Integration" /></Field>
              <Button size="sm" onClick={() => { if (!newApiKeyName) { toast.error("Name required"); return; } const key = "mk_" + crypto.randomUUID().replace(/-/g, ""); const u = [...apiKeys, { id: crypto.randomUUID(), name: newApiKeyName, key, permissions: "read-write", createdAt: new Date().toISOString().slice(0, 10) }]; setApiKeys(u); setNewApiKeyName(""); updateByCategory.mutate({ category: "api_keys", values: { list: JSON.stringify(u) } }); toast.success("API key created: " + key); }}><Plus className="h-4 w-4 mr-1" />Generate Key</Button></div>
          </Section>
        );

      // ── CRON JOBS ─────────────────────────────────────────────────────────
      case "cron-general":
        return (
          <Section title="Cron Settings" description="Configure scheduled task settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Cron Jobs</p><p className="text-xs text-muted-foreground">Allow automatic scheduled tasks</p></div>
                <Switch checked={cronGeneral.enabled} onCheckedChange={(v) => setCronGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <Field label="Default Schedule (cron expression)"><Input value={cronGeneral.defaultSchedule} onChange={(e) => setCronGeneral((p) => ({ ...p, defaultSchedule: e.target.value }))} placeholder="0 * * * *" /></Field>
            </div>
            <SaveButton saving={!!saving["cron-general"]} onClick={() => save("cron-general", () => updateByCategory.mutateAsync({ category: "cron_general", values: { enabled: String(cronGeneral.enabled), defaultSchedule: cronGeneral.defaultSchedule } }))} />
          </Section>
        );

      case "cron-list":
        return (
          <Section title="Scheduled Jobs" description="View and manage cron jobs">
            <div className="space-y-2">{cronJobs.map((j) => (<div key={j.id} className="flex items-center justify-between p-3 border rounded"><div><p className="text-sm font-medium">{j.name}</p><p className="text-xs text-muted-foreground">{j.schedule} &middot; {j.enabled ? "Active" : "Disabled"} {j.lastRun ? "&middot; Last: " + j.lastRun : ""}</p></div><button onClick={() => { const u = cronJobs.filter((x) => x.id !== j.id); setCronJobs(u); updateByCategory.mutate({ category: "cron_jobs", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            {cronJobs.length === 0 && <p className="text-sm text-muted-foreground">No cron jobs configured.</p>}
          </Section>
        );

      case "cron-log":
        return (
          <Section title="Cron Log" description="View cron job execution history">
            <p className="text-sm text-muted-foreground">No cron job executions recorded. Job runs will appear here with timestamps and status.</p>
          </Section>
        );

      // ── reCAPTCHA ─────────────────────────────────────────────────────────
      case "recaptcha":
        return (
          <Section title="reCAPTCHA Settings" description="Configure Google reCAPTCHA for form protection">
            <Field label="Version">
              <Select value={recaptcha.version} onValueChange={(v) => setRecaptcha((p) => ({ ...p, version: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="v2">reCAPTCHA v2</SelectItem><SelectItem value="v3">reCAPTCHA v3</SelectItem></SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Site Key"><Input value={recaptcha.siteKey} onChange={(e) => setRecaptcha((p) => ({ ...p, siteKey: e.target.value }))} placeholder="6Ld…" /></Field>
              <Field label="Secret Key"><Input type="password" value={recaptcha.secretKey} onChange={(e) => setRecaptcha((p) => ({ ...p, secretKey: e.target.value }))} placeholder="Secret Key" /></Field>
            </div>
            <SaveButton saving={!!saving["recaptcha"]} onClick={() => save("recaptcha", () => updateByCategory.mutateAsync({ category: "recaptcha", values: recaptcha }))} />
          </Section>
        );

      // ── CUSTOM FIELDS (inline per entity) ───────────────────────────────
      case "custom-fields-clients":
      case "custom-fields-projects":
      case "custom-fields-tasks":
      case "custom-fields-leads":
      case "custom-fields-tickets":
      case "custom-fields-products": {
        const entityMap: Record<string, string> = { "custom-fields-clients": "Client", "custom-fields-projects": "Project", "custom-fields-tasks": "Task", "custom-fields-leads": "Lead", "custom-fields-tickets": "Ticket", "custom-fields-products": "Product" };
        const entity = entityMap[activeSection] || "Client";
        const filtered = customFields.filter(f => f.entity === entity && (cfSearch ? f.name.toLowerCase().includes(cfSearch.toLowerCase()) : true));
        return (
          <Section title={`Custom Fields – ${entity}s`} description={`Add custom data fields to ${entity.toLowerCase()} records`}>
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search fields…" value={cfSearch} onChange={e => setCfSearch(e.target.value)} /></div>
              <Dialog open={cfDialogOpen} onOpenChange={setCfDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Field</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Custom Field</DialogTitle><DialogDescription>Create a new custom field for {entity.toLowerCase()} records.</DialogDescription></DialogHeader>
                  <div className="space-y-4">
                    <Field label="Field Name"><Input value={cfForm.name} onChange={e => setCfForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Company Size" /></Field>
                    <Field label="Field Type">
                      <Select value={cfForm.type} onValueChange={v => setCfForm(p => ({ ...p, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["Text","Number","Date","Dropdown","Checkbox","Multi-Select","Email","Phone","URL","Currency","Percentage","Long Text","File Upload","Rating"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-center gap-2"><Switch checked={cfForm.required} onCheckedChange={v => setCfForm(p => ({ ...p, required: v }))} /><Label>Required</Label></div>
                  </div>
                  <DialogFooter><Button onClick={() => { if (!cfForm.name) { toast.error("Field name required"); return; } setCustomFields(prev => [...prev, { id: crypto.randomUUID(), ...cfForm, entity, active: true }]); setCfForm({ name: "", type: "Text", entity: "Client", required: false }); setCfDialogOpen(false); toast.success("Custom field added"); }}>Add Field</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Field Name</TableHead><TableHead>Type</TableHead><TableHead>Required</TableHead><TableHead>Status</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No custom fields for {entity.toLowerCase()}s yet.</TableCell></TableRow>
                ) : filtered.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell><Badge variant="outline">{f.type}</Badge></TableCell>
                    <TableCell>{f.required ? <Badge className="bg-red-100 text-red-700">Required</Badge> : <Badge variant="secondary">Optional</Badge>}</TableCell>
                    <TableCell>{f.active ? <Badge className="bg-green-100 text-green-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                    <TableCell><button onClick={() => { setCustomFields(prev => prev.filter(x => x.id !== f.id)); toast.success("Field removed"); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        );
      }

      // ── PERMISSIONS (inline) ───────────────────────────────────────────────
      case "permissions-matrix": {
        const permCategories = [
          { name: "Clients", key: "clients", perms: ["View", "Create", "Edit", "Delete", "Export"] },
          { name: "Invoices", key: "invoices", perms: ["View", "Create", "Edit", "Delete", "Send"] },
          { name: "Projects", key: "projects", perms: ["View", "Create", "Edit", "Delete", "Manage Members"] },
          { name: "Tasks", key: "tasks", perms: ["View", "Create", "Edit", "Delete", "Assign"] },
          { name: "Leads", key: "leads", perms: ["View", "Create", "Edit", "Delete", "Convert"] },
          { name: "Estimates", key: "estimates", perms: ["View", "Create", "Edit", "Delete", "Send"] },
          { name: "Proposals", key: "proposals", perms: ["View", "Create", "Edit", "Delete", "Send"] },
          { name: "Contracts", key: "contracts", perms: ["View", "Create", "Edit", "Delete", "Sign"] },
          { name: "Expenses", key: "expenses", perms: ["View", "Create", "Edit", "Delete", "Approve"] },
          { name: "Tickets", key: "tickets", perms: ["View", "Create", "Edit", "Delete", "Assign"] },
          { name: "Reports", key: "reports", perms: ["View", "Export", "Schedule"] },
          { name: "Settings", key: "settings", perms: ["View", "Modify"] },
        ];
        return (
          <Section title="Advanced Permissions" description="Fine-grained permission control by role and module">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {permCategories.map(cat => (
                <Card key={cat.key} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between"><CardTitle className="text-sm">{cat.name}</CardTitle><Badge variant="outline">{cat.perms.length} perms</Badge></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {cat.perms.map(p => {
                        const permKey = `${cat.key}_${p.toLowerCase().replace(/\s+/g, "_")}`;
                        return (
                          <div key={p} className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{p}</span>
                            <Switch checked={permState[permKey] ?? true} onCheckedChange={(v) => setPermState(prev => ({ ...prev, [permKey]: v }))} />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <SaveButton saving={!!saving["permissions"]} onClick={() => save("permissions", async () => {
              const permValues: Record<string, string> = {};
              permCategories.forEach(cat => {
                cat.perms.forEach(p => {
                  const k = `${cat.key}_${p.toLowerCase().replace(/\s+/g, "_")}`;
                  permValues[k] = permState[k] ? "true" : "false";
                });
              });
              await updateByCategory.mutateAsync({ category: "permissions", values: permValues });
            })} />
          </Section>
        );
      }

      // ── INTEGRATIONS (inline) ──────────────────────────────────────────────
      case "integrations-page": {
        const integrations = (integrationsData?.integrations as any[]) || [];
        const activeInts = integrations.filter((i: any) => i.isActive);
        const providers = [
          { name: "SMTP", desc: "Email delivery", icon: <Mail className="h-5 w-5" /> },
          { name: "Slack", desc: "Team notifications", icon: <MessageSquare className="h-5 w-5" /> },
          { name: "Stripe", desc: "Payment processing", icon: <CreditCard className="h-5 w-5" /> },
          { name: "M-Pesa", desc: "Mobile money", icon: <Smartphone className="h-5 w-5" /> },
          { name: "SendGrid", desc: "Email API", icon: <Mail className="h-5 w-5" /> },
          { name: "Twilio", desc: "SMS & Voice", icon: <Smartphone className="h-5 w-5" /> },
        ];
        return (
          <Section title="All Integrations" description="Connect third-party services to your CRM">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{integrations.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">{activeInts.length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-gray-400">{integrations.length - activeInts.length}</p><p className="text-xs text-muted-foreground">Inactive</p></CardContent></Card>
            </div>
            <Tabs defaultValue="configured">
              <TabsList className="mb-3"><TabsTrigger value="configured">Configured</TabsTrigger><TabsTrigger value="available">Available</TabsTrigger></TabsList>
              <TabsContent value="configured">
                {integrations.length === 0 ? (
                  <Card className="border-dashed"><CardContent className="pt-6 text-center text-muted-foreground"><Zap className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No integrations configured yet</p></CardContent></Card>
                ) : (
                  <div className="space-y-2">{integrations.map((int: any) => (
                    <div key={int.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div><p className="text-sm font-medium">{int.provider}</p><p className="text-xs text-muted-foreground">{int.integrationType}</p></div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => testIntegration.mutate({ id: int.id })}>Test</Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteIntegration.mutate({ id: int.id })}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}</div>
                )}
              </TabsContent>
              <TabsContent value="available">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {providers.map(p => (
                    <Card key={p.name} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setIntForm(prev => ({ ...prev, provider: p.name })); setIntAddOpen(true); }}>
                      <CardContent className="pt-4 text-center"><div className="mx-auto mb-2 text-muted-foreground">{p.icon}</div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.desc}</p></CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            <Dialog open={intAddOpen} onOpenChange={setIntAddOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Integration</DialogTitle><DialogDescription>Connect a new third-party service.</DialogDescription></DialogHeader>
                <div className="space-y-4">
                  <Field label="Provider"><Input value={intForm.provider} onChange={e => setIntForm(p => ({ ...p, provider: e.target.value }))} placeholder="Provider name" /></Field>
                  <Field label="Integration Type">
                    <Select value={intForm.type} onValueChange={v => setIntForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="api_key">API Key</SelectItem><SelectItem value="webhook">Webhook</SelectItem><SelectItem value="oauth">OAuth</SelectItem><SelectItem value="smtp">SMTP</SelectItem></SelectContent>
                    </Select>
                  </Field>
                  {(intForm.type === "api_key" || intForm.type === "oauth") && <Field label="API Key"><Input type="password" value={intForm.apiKey} onChange={e => setIntForm(p => ({ ...p, apiKey: e.target.value }))} /></Field>}
                  {intForm.type === "webhook" && <Field label="Webhook URL"><Input value={intForm.webhookUrl} onChange={e => setIntForm(p => ({ ...p, webhookUrl: e.target.value }))} placeholder="https://..." /></Field>}
                  {intForm.type === "oauth" && (<><Field label="Client ID"><Input value={intForm.clientId} onChange={e => setIntForm(p => ({ ...p, clientId: e.target.value }))} /></Field><Field label="Client Secret"><Input type="password" value={intForm.clientSecret} onChange={e => setIntForm(p => ({ ...p, clientSecret: e.target.value }))} /></Field></>)}
                </div>
                <DialogFooter><Button onClick={() => configureIntegration.mutate({ provider: intForm.provider, integrationType: intForm.type, config: { apiKey: intForm.apiKey, webhookUrl: intForm.webhookUrl, clientId: intForm.clientId, clientSecret: intForm.clientSecret } })}>Configure</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>
        );
      }

      // ── WORKFLOW AUTOMATION (inline) ───────────────────────────────────────
      case "workflow-auto": {
        const workflows = (workflowsData?.workflows as any[]) || [];
        const templates = (wfTemplatesData?.templates as any[]) || [];
        return (
          <Section title="Workflow Automation" description="Automate repetitive tasks and processes">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{workflows.filter((w: any) => w.status === "active").length}</p><p className="text-xs text-muted-foreground">Active Workflows</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{templates.length}</p><p className="text-xs text-muted-foreground">Templates</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><div className="flex items-center justify-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /><p className="text-sm font-medium text-green-600">Online</p></div><p className="text-xs text-muted-foreground">System Status</p></CardContent></Card>
            </div>
            {templates.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Templates</h4>
                <div className="grid grid-cols-2 gap-2">{templates.map((t: any) => (
                  <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setWfForm({ name: t.name, description: t.description || "", triggerType: t.triggerType || "invoice_created", isRecurring: false }); setWfCreateOpen(true); }}>
                    <CardContent className="pt-3"><p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p></CardContent>
                  </Card>
                ))}</div>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Workflows</h4>
              <Dialog open={wfCreateOpen} onOpenChange={setWfCreateOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Create Workflow</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Workflow</DialogTitle><DialogDescription>Define an automated workflow.</DialogDescription></DialogHeader>
                  <div className="space-y-4">
                    <Field label="Name"><Input value={wfForm.name} onChange={e => setWfForm(p => ({ ...p, name: e.target.value }))} placeholder="Workflow name" /></Field>
                    <Field label="Description"><Input value={wfForm.description} onChange={e => setWfForm(p => ({ ...p, description: e.target.value }))} placeholder="What does this workflow do?" /></Field>
                    <Field label="Trigger">
                      <Select value={wfForm.triggerType} onValueChange={v => setWfForm(p => ({ ...p, triggerType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invoice_created">Invoice Created</SelectItem><SelectItem value="invoice_paid">Invoice Paid</SelectItem><SelectItem value="invoice_overdue">Invoice Overdue</SelectItem><SelectItem value="payment_received">Payment Received</SelectItem><SelectItem value="opportunity_moved">Opportunity Moved</SelectItem><SelectItem value="task_completed">Task Completed</SelectItem><SelectItem value="project_milestone_reached">Project Milestone Reached</SelectItem><SelectItem value="reminder_time">Reminder Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex items-center gap-2"><Switch checked={wfForm.isRecurring} onCheckedChange={v => setWfForm(p => ({ ...p, isRecurring: v }))} /><Label>Recurring</Label></div>
                  </div>
                  <DialogFooter><Button onClick={() => createWorkflow.mutate({ name: wfForm.name, description: wfForm.description, triggerType: wfForm.triggerType as any, actions: [], isRecurring: wfForm.isRecurring })}>Create</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {workflows.length === 0 ? (
              <Card className="border-dashed"><CardContent className="pt-6 text-center text-muted-foreground"><Zap className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No workflows created yet</p></CardContent></Card>
            ) : (
              <div className="space-y-2">{workflows.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                  <div><p className="text-sm font-medium">{w.name}</p><div className="flex gap-2 mt-1"><Badge variant={w.status === "active" ? "default" : "secondary"}>{w.status}</Badge><Badge variant="outline">{w.triggerType}</Badge></div></div>
                </div>
              ))}</div>
            )}
          </Section>
        );
      }

      // ── SYSTEM HEALTH (inline) ────────────────────────────────────────────
      case "system-health": {
        const status = healthStatus as any;
        const components = (healthComponents as any[]) || [];
        const metrics = healthMetrics as any;
        return (
          <Section title="System Health" description="Real-time system monitoring and diagnostics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card><CardContent className="pt-4 text-center"><div className="flex items-center justify-center gap-1 mb-1">{status?.status === "operational" ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}</div><p className="text-sm font-medium">{status?.status || "Checking…"}</p><p className="text-xs text-muted-foreground">Overall Status</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{status?.uptime ? `${(status.uptime / 3600).toFixed(1)}h` : "—"}</p><p className="text-xs text-muted-foreground">Uptime</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{metrics?.memoryUsagePercent ? `${metrics.memoryUsagePercent}%` : "—"}</p><p className="text-xs text-muted-foreground">Memory</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{status?.cpuCores || "—"}</p><p className="text-xs text-muted-foreground">CPU Cores</p></CardContent></Card>
            </div>
            {status?.processMemory && (
              <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm">Process Memory</CardTitle></CardHeader>
                <CardContent><div className="grid grid-cols-4 gap-3 text-center">
                  <div><p className="text-lg font-bold">{(status.processMemory.heapUsed / 1048576).toFixed(0)} MB</p><p className="text-xs text-muted-foreground">Heap Used</p></div>
                  <div><p className="text-lg font-bold">{(status.processMemory.heapTotal / 1048576).toFixed(0)} MB</p><p className="text-xs text-muted-foreground">Heap Total</p></div>
                  <div><p className="text-lg font-bold">{(status.processMemory.rss / 1048576).toFixed(0)} MB</p><p className="text-xs text-muted-foreground">RSS</p></div>
                  <div><p className="text-lg font-bold">{(status.processMemory.external / 1048576).toFixed(0)} MB</p><p className="text-xs text-muted-foreground">External</p></div>
                </div></CardContent>
              </Card>
            )}
            {components.length > 0 && (
              <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm">Components</CardTitle></CardHeader>
                <CardContent><div className="space-y-2">{components.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">{c.status === "operational" ? <CheckCircle className="h-4 w-4 text-green-500" /> : c.status === "degraded" ? <AlertCircle className="h-4 w-4 text-yellow-500" /> : <XCircle className="h-4 w-4 text-red-500" />}<span className="text-sm">{c.name}</span></div>
                    <div className="flex gap-3 text-xs text-muted-foreground"><span>{c.uptime}% uptime</span><span>{c.responseTime}ms</span></div>
                  </div>
                ))}</div></CardContent>
              </Card>
            )}
            {metrics && (
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Live Metrics</CardTitle></CardHeader>
                <CardContent><div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  <div><p className="text-lg font-bold">{metrics.requestsPerMinute ?? "—"}</p><p className="text-xs text-muted-foreground">Req/min</p></div>
                  <div><p className="text-lg font-bold">{metrics.avgResponseTime ?? "—"}ms</p><p className="text-xs text-muted-foreground">Avg Response</p></div>
                  <div><p className="text-lg font-bold">{metrics.errorRate ?? "—"}%</p><p className="text-xs text-muted-foreground">Error Rate</p></div>
                  <div><p className="text-lg font-bold">{metrics.activeConnections ?? "—"}</p><p className="text-xs text-muted-foreground">Connections</p></div>
                  <div><p className="text-lg font-bold">{metrics.dbQueries ?? "—"}</p><p className="text-xs text-muted-foreground">DB Queries</p></div>
                  <div><p className="text-lg font-bold">{metrics.cacheHitRate ?? "—"}%</p><p className="text-xs text-muted-foreground">Cache Hit</p></div>
                </div></CardContent>
              </Card>
            )}
          </Section>
        );
      }

      // ── IMPORT DATA (inline) ──────────────────────────────────────────────
      case "import-data":
        return (
          <Section title="Import Data" description="Import records from CSV and Excel files">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[{ label: "Employees", icon: <Users className="h-5 w-5" /> }, { label: "Clients", icon: <Users className="h-5 w-5" /> }, { label: "Products", icon: <Package className="h-5 w-5" /> }, { label: "Invoices", icon: <FileText className="h-5 w-5" /> }].map(mod => (
                <Card key={mod.label} className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary" onClick={() => navigate("/import-excel")}>
                  <CardContent className="pt-4 text-center"><div className="mx-auto mb-2 text-muted-foreground">{mod.icon}</div><p className="text-sm font-medium">{mod.label}</p><p className="text-xs text-muted-foreground">Click to import</p></CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div><p className="text-sm font-medium">Drag & drop a CSV or Excel file here</p><p className="text-xs text-muted-foreground">Or click a module above to start the guided import wizard</p></div>
                  <Button variant="outline" onClick={() => navigate("/import-excel")}><FileUp className="mr-2 h-4 w-4" />Open Import Wizard</Button>
                </div>
              </CardContent>
            </Card>
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Supported Modules</h4>
              {["Job Groups", "Employees", "Clients", "Products", "Departments", "Payroll", "Services", "Invoices"].map(m => (
                <div key={m} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                  <span className="text-sm">{m}</span>
                  <Badge variant="outline">CSV / Excel</Badge>
                </div>
              ))}
            </div>
          </Section>
        );

      // ── INTEGRATION GUIDES (inline) ────────────────────────────────────────
      case "integration-guides": {
        const guides = [
          { id: "theme", title: "Theme Integration", difficulty: "Beginner", desc: "Customize the look and feel of your CRM with custom themes, colors, and branding.", steps: ["Navigate to Settings > Theme", "Choose a base theme or create custom", "Adjust primary/secondary colors", "Upload custom logo and favicon", "Save and preview changes"] },
          { id: "brand", title: "Brand Integration", difficulty: "Beginner", desc: "Configure your company branding across all documents, emails, and client-facing pages.", steps: ["Go to Settings > Company Details", "Upload company logo in multiple sizes", "Set brand colors in Theme settings", "Configure email header/footer templates", "Preview branded invoice/estimate"] },
          { id: "api", title: "API Integration", difficulty: "Advanced", desc: "Integrate with external systems using our REST API. Full CRUD operations on all resources.", steps: ["Generate API key in Settings > API Keys", "Review API documentation for endpoints", "Set up authentication headers (Bearer token)", "Make test request to /api/health", "Implement webhooks for real-time events"] },
          { id: "widgets", title: "Homepage Widgets", difficulty: "Intermediate", desc: "Add custom dashboard widgets to display key metrics, charts, and quick actions.", steps: ["Go to Dashboard > Customize", "Browse available widget library", "Drag widgets to desired positions", "Configure data sources and filters", "Set refresh intervals for live data"] },
        ];
        const currentGuide = guides.find(g => g.id === selectedGuide);
        return (
          <Section title="Integration Guides" description="Step-by-step guides for integrating with your CRM">
            <div className="relative mb-4"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search guides…" value={guideSearch} onChange={e => setGuideSearch(e.target.value)} /></div>
            <div className="grid grid-cols-[1fr_2fr] gap-4 min-h-[300px]">
              <div className="space-y-2">
                {guides.filter(g => !guideSearch || g.title.toLowerCase().includes(guideSearch.toLowerCase())).map(g => (
                  <Card key={g.id} className={cn("cursor-pointer hover:shadow-md transition-shadow", selectedGuide === g.id && "ring-2 ring-primary")} onClick={() => setSelectedGuide(g.id)}>
                    <CardContent className="pt-3">
                      <div className="flex items-center justify-between mb-1"><p className="text-sm font-medium">{g.title}</p><Badge variant="outline" className="text-xs">{g.difficulty}</Badge></div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{g.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div>
                {!currentGuide ? (
                  <Card className="border-dashed h-full"><CardContent className="pt-6 flex flex-col items-center justify-center h-full text-center"><BookOpen className="h-10 w-10 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Select a guide from the list</p></CardContent></Card>
                ) : (
                  <Card>
                    <CardHeader><div className="flex items-center justify-between"><CardTitle>{currentGuide.title}</CardTitle><Badge>{currentGuide.difficulty}</Badge></div><CardDescription>{currentGuide.desc}</CardDescription></CardHeader>
                    <CardContent>
                      <h4 className="text-sm font-medium mb-3">Steps</h4>
                      <div className="space-y-3">
                        {currentGuide.steps.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">{i + 1}</div>
                            <p className="text-sm pt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </Section>
        );
      }

      // ── API DOCUMENTATION (inline) ─────────────────────────────────────────
      case "api-docs":
        return (
          <Section title="API Documentation" description="REST API reference for your CRM system">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">245</p><p className="text-xs text-muted-foreground">Endpoints</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">892</p><p className="text-xs text-muted-foreground">Operations</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-green-600">100%</p><p className="text-xs text-muted-foreground">Documented</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">~145ms</p><p className="text-xs text-muted-foreground">Avg Response</p></CardContent></Card>
            </div>
            <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm">Popular Endpoints</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Method</TableHead><TableHead>Path</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[
                      { method: "GET", path: "/api/clients", desc: "List all clients", code: 200 },
                      { method: "POST", path: "/api/invoices", desc: "Create invoice", code: 201 },
                      { method: "PUT", path: "/api/projects/:id", desc: "Update project", code: 200 },
                      { method: "DELETE", path: "/api/tasks/:id", desc: "Delete task", code: 204 },
                      { method: "GET", path: "/api/leads", desc: "List all leads", code: 200 },
                      { method: "POST", path: "/api/estimates", desc: "Create estimate", code: 201 },
                    ].map((ep, i) => (
                      <TableRow key={i}>
                        <TableCell><Badge variant={ep.method === "GET" ? "default" : ep.method === "POST" ? "default" : ep.method === "PUT" ? "secondary" : "destructive"} className={ep.method === "GET" ? "bg-green-100 text-green-700" : ep.method === "POST" ? "bg-blue-100 text-blue-700" : ep.method === "PUT" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>{ep.method}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{ep.path}</TableCell>
                        <TableCell className="text-sm">{ep.desc}</TableCell>
                        <TableCell><Badge variant="outline">{ep.code}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="mb-4"><CardHeader className="pb-2"><CardTitle className="text-sm">Example Request</CardTitle></CardHeader>
              <CardContent><pre className="bg-gray-900 text-green-400 p-4 rounded-md text-xs overflow-x-auto">{`curl -X GET https://your-crm.com/api/clients \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</pre></CardContent>
            </Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Response Schema</CardTitle></CardHeader>
              <CardContent><pre className="bg-gray-900 text-green-400 p-4 rounded-md text-xs overflow-x-auto">{`{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Acme Corp",
      "email": "info@acme.com",
      "phone": "+254700000000",
      "status": "active",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 25, "total": 142 }
}`}</pre></CardContent>
            </Card>
          </Section>
        );


      // ── NEW PAYMENT GATEWAYS (crm.africa) ───────────────────────────────
      case "payments-pesapal":
        return (
          <Section title="Pesapal" description="Accept payments via Pesapal (East Africa: M-Pesa, Airtel, MTN, Visa/Mastercard)">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable Pesapal</p><Switch checked={pesapal.enabled} onCheckedChange={(c) => setPesapal((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Consumer Key"><Input value={pesapal.consumerKey} onChange={(e) => setPesapal((p) => ({ ...p, consumerKey: e.target.value }))} placeholder="Consumer Key" /></Field>
              <Field label="Consumer Secret"><Input type="password" value={pesapal.consumerSecret} onChange={(e) => setPesapal((p) => ({ ...p, consumerSecret: e.target.value }))} placeholder="Consumer Secret" /></Field>
              <Field label="Environment">
                <Select value={pesapal.environment} onValueChange={(v) => setPesapal((p) => ({ ...p, environment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["pesapal"]} onClick={() => save("pesapal", () => updateByCategory.mutateAsync({ category: "payment_pesapal", values: { ...pesapal, enabled: String(pesapal.enabled) } }))} />
          </Section>
        );

      case "payments-mollie":
        return (
          <Section title="Mollie Pay" description="Accept payments via Mollie (iDEAL, Bancontact, SEPA, Credit Cards)">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable Mollie</p><Switch checked={mollie.enabled} onCheckedChange={(c) => setMollie((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="API Key"><Input type="password" value={mollie.apiKey} onChange={(e) => setMollie((p) => ({ ...p, apiKey: e.target.value }))} placeholder="live_… or test_…" /></Field>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Test Mode</p><p className="text-xs text-muted-foreground">Use test API key for sandbox payments</p></div>
                <Switch checked={mollie.testMode} onCheckedChange={(c) => setMollie((p) => ({ ...p, testMode: c }))} /></div>
            </div>
            <SaveButton saving={!!saving["mollie"]} onClick={() => save("mollie", () => updateByCategory.mutateAsync({ category: "payment_mollie", values: { ...mollie, enabled: String(mollie.enabled), testMode: String(mollie.testMode) } }))} />
          </Section>
        );

      case "payments-tappay":
        return (
          <Section title="Tap Pay" description="Accept payments via Tap (Middle East & North Africa)">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable Tap Pay</p><Switch checked={tapPay.enabled} onCheckedChange={(c) => setTapPay((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Merchant ID"><Input value={tapPay.merchantId} onChange={(e) => setTapPay((p) => ({ ...p, merchantId: e.target.value }))} placeholder="Merchant ID" /></Field>
              <Field label="API Key"><Input type="password" value={tapPay.apiKey} onChange={(e) => setTapPay((p) => ({ ...p, apiKey: e.target.value }))} placeholder="sk_live_…" /></Field>
              <Field label="Environment">
                <Select value={tapPay.environment} onValueChange={(v) => setTapPay((p) => ({ ...p, environment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["tappay"]} onClick={() => save("tappay", () => updateByCategory.mutateAsync({ category: "payment_tappay", values: { ...tapPay, enabled: String(tapPay.enabled) } }))} />
          </Section>
        );

      case "payments-airtel":
        return (
          <Section title="Airtel Money" description="Accept mobile money payments via Airtel (East & Central Africa)">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable Airtel Money</p><Switch checked={airtelMoney.enabled} onCheckedChange={(c) => setAirtelMoney((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Client ID"><Input value={airtelMoney.clientId} onChange={(e) => setAirtelMoney((p) => ({ ...p, clientId: e.target.value }))} placeholder="Client ID" /></Field>
              <Field label="Client Secret"><Input type="password" value={airtelMoney.clientSecret} onChange={(e) => setAirtelMoney((p) => ({ ...p, clientSecret: e.target.value }))} placeholder="Client Secret" /></Field>
              <Field label="Environment">
                <Select value={airtelMoney.environment} onValueChange={(v) => setAirtelMoney((p) => ({ ...p, environment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["airtel"]} onClick={() => save("airtel", () => updateByCategory.mutateAsync({ category: "payment_airtel", values: { ...airtelMoney, enabled: String(airtelMoney.enabled) } }))} />
          </Section>
        );

      case "payments-mtnmomo":
        return (
          <Section title="MTN Mobile Money" description="Accept mobile money via MTN MoMo (West, Central & East Africa)">
            <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Enable MTN MoMo</p><Switch checked={mtnMomo.enabled} onCheckedChange={(c) => setMtnMomo((p) => ({ ...p, enabled: c }))} /></div>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Subscription Key"><Input value={mtnMomo.subscriptionKey} onChange={(e) => setMtnMomo((p) => ({ ...p, subscriptionKey: e.target.value }))} placeholder="Ocp-Apim-Subscription-Key" /></Field>
              <Field label="API User"><Input value={mtnMomo.apiUser} onChange={(e) => setMtnMomo((p) => ({ ...p, apiUser: e.target.value }))} placeholder="API User UUID" /></Field>
              <Field label="API Key"><Input type="password" value={mtnMomo.apiKey} onChange={(e) => setMtnMomo((p) => ({ ...p, apiKey: e.target.value }))} placeholder="API Key" /></Field>
              <Field label="Environment">
                <Select value={mtnMomo.environment} onValueChange={(v) => setMtnMomo((p) => ({ ...p, environment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="live">Live</SelectItem></SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["mtnmomo"]} onClick={() => save("mtnmomo", () => updateByCategory.mutateAsync({ category: "payment_mtnmomo", values: { ...mtnMomo, enabled: String(mtnMomo.enabled) } }))} />
          </Section>
        );

      // ── INVENTORY ───────────────────────────────────────────────────────
      case "inventory-general":
        return (
          <Section title="Inventory Settings" description="Configure inventory management for your business">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Track Stock Levels</p><p className="text-xs text-muted-foreground">Automatically track product stock quantities</p></div>
                <Switch checked={inventoryGeneral.trackStock} onCheckedChange={(v) => setInventoryGeneral((p) => ({ ...p, trackStock: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Auto-Reorder</p><p className="text-xs text-muted-foreground">Automatically create purchase orders when stock is low</p></div>
                <Switch checked={inventoryGeneral.autoReorder} onCheckedChange={(v) => setInventoryGeneral((p) => ({ ...p, autoReorder: v }))} /></div>
              <Field label="Low Stock Threshold"><Input type="number" min="1" value={inventoryGeneral.lowStockThreshold} onChange={(e) => setInventoryGeneral((p) => ({ ...p, lowStockThreshold: e.target.value }))} /></Field>
              <Field label="Default Warehouse"><Input value={inventoryGeneral.defaultWarehouse} onChange={(e) => setInventoryGeneral((p) => ({ ...p, defaultWarehouse: e.target.value }))} placeholder="Main Warehouse" /></Field>
            </div>
            <SaveButton saving={!!saving["inventory-general"]} onClick={() => save("inventory-general", () => updateByCategory.mutateAsync({ category: "inventory_general", values: { ...inventoryGeneral, trackStock: String(inventoryGeneral.trackStock), autoReorder: String(inventoryGeneral.autoReorder) } }))} />
          </Section>
        );

      case "inventory-categories":
        return (
          <Section title="Inventory Categories" description="Organize inventory items by category">
            <div className="space-y-2">{inventoryCategories.map((c) => (<div key={c.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{c.name}</span><button onClick={() => { const u = inventoryCategories.filter((x) => x.id !== c.id); setInventoryCategories(u); updateByCategory.mutate({ category: "inventory_categories", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="Category Name"><Input value={newInventoryCat.name} onChange={(e) => setNewInventoryCat({ name: e.target.value })} placeholder="e.g. Electronics, Furniture" /></Field>
              <Button size="sm" onClick={() => { if (!newInventoryCat.name) { toast.error("Name required"); return; } const u = [...inventoryCategories, { id: crypto.randomUUID(), ...newInventoryCat }]; setInventoryCategories(u); setNewInventoryCat({ name: "" }); updateByCategory.mutate({ category: "inventory_categories", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "inventory-stock":
        return (
          <Section title="Stock Settings" description="Configure stock valuation and tracking methods">
            <div className="space-y-4">
              <Field label="Valuation Method">
                <Select value={inventoryStock.method} onValueChange={(v) => setInventoryStock((p) => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fifo">FIFO (First In, First Out)</SelectItem><SelectItem value="lifo">LIFO (Last In, First Out)</SelectItem><SelectItem value="average">Weighted Average</SelectItem></SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Allow Negative Stock</p><p className="text-xs text-muted-foreground">Allow selling items when stock is zero</p></div>
                <Switch checked={inventoryStock.allowNegative} onCheckedChange={(v) => setInventoryStock((p) => ({ ...p, allowNegative: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Barcode Scanning</p><p className="text-xs text-muted-foreground">Enable barcode-based stock management</p></div>
                <Switch checked={inventoryStock.barcodeEnabled} onCheckedChange={(v) => setInventoryStock((p) => ({ ...p, barcodeEnabled: v }))} /></div>
            </div>
            <SaveButton saving={!!saving["inventory-stock"]} onClick={() => save("inventory-stock", () => updateByCategory.mutateAsync({ category: "inventory_stock", values: { ...inventoryStock, allowNegative: String(inventoryStock.allowNegative), barcodeEnabled: String(inventoryStock.barcodeEnabled) } }))} />
          </Section>
        );

      // ── SERVICES & CHECKOUT ─────────────────────────────────────────────
      case "services-general":
        return (
          <Section title="Services Settings" description="Configure service offerings and management">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Services Module</p><p className="text-xs text-muted-foreground">Allow creating and selling services</p></div>
                <Switch checked={servicesGeneral.enabled} onCheckedChange={(v) => setServicesGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Show Pricing</p><p className="text-xs text-muted-foreground">Display service prices to clients</p></div>
                <Switch checked={servicesGeneral.showPricing} onCheckedChange={(v) => setServicesGeneral((p) => ({ ...p, showPricing: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Online Booking</p><p className="text-xs text-muted-foreground">Allow clients to book services online</p></div>
                <Switch checked={servicesGeneral.allowOnlineBooking} onCheckedChange={(v) => setServicesGeneral((p) => ({ ...p, allowOnlineBooking: v }))} /></div>
              <Field label="Booking URL"><Input value={servicesGeneral.bookingUrl} onChange={(e) => setServicesGeneral((p) => ({ ...p, bookingUrl: e.target.value }))} placeholder="https://yourdomain.com/book" /></Field>
            </div>
            <SaveButton saving={!!saving["services-general"]} onClick={() => save("services-general", () => updateByCategory.mutateAsync({ category: "services_general", values: { ...servicesGeneral, enabled: String(servicesGeneral.enabled), showPricing: String(servicesGeneral.showPricing), allowOnlineBooking: String(servicesGeneral.allowOnlineBooking) } }))} />
          </Section>
        );

      case "services-paypal":
        return (
          <Section title="PayPal (API)" description="Configure PayPal payment integration">
            <div className="space-y-4">
              <Field label="PayPal Mode">
                <Select value={servicesPaypal?.mode ?? "sandbox"} onValueChange={(v) => setServicesPaypal((p: any) => ({ ...p, mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sandbox">Sandbox (Testing)</SelectItem><SelectItem value="live">Live (Production)</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Client ID"><Input value={servicesPaypal?.clientId ?? ""} onChange={(e) => setServicesPaypal((p: any) => ({ ...p, clientId: e.target.value }))} placeholder="PayPal Client ID" /></Field>
              <Field label="Client Secret"><Input type="password" value={servicesPaypal?.clientSecret ?? ""} onChange={(e) => setServicesPaypal((p: any) => ({ ...p, clientSecret: e.target.value }))} placeholder="PayPal Client Secret" /></Field>
            </div>
            <SaveButton saving={!!saving["services-paypal"]} onClick={() => save("services-paypal", () => updateByCategory.mutateAsync({ category: "services_paypal", values: servicesPaypal }))} />
          </Section>
        );

      case "services-email-templates": {
        const SERVICE_EMAIL_TEMPLATES: Record<string, { label: string; templates: { id: string; name: string; subject: string; body: string; vars: string[] }[] }> = {
          bookings: { label: "Bookings", templates: [
            { id: "service-booked-client", name: "Service Booked - (Client)", subject: "Booking Confirmed: {service_name}", body: "<h2>Booking Confirmed</h2><p>Hi {first_name},</p><p>Your service booking has been confirmed. Here are the details:</p><table><tr><th>Service</th><th>Date</th><th>Time</th><th>Location</th></tr><tr><td>{service_name}</td><td>{booking_date}</td><td>{booking_time}</td><td>{service_location}</td></tr></table><p><strong>Booking Reference:</strong> {booking_ref}</p><p>If you need to make any changes, please contact us at least 24 hours before your appointment.</p>", vars: ["first_name","last_name","client_name","service_name","booking_date","booking_time","booking_ref","service_location","service_price"] },
            { id: "service-booked-team", name: "Service Booked - (Team)", subject: "New Booking: {service_name} - {client_name}", body: "<p>Hi {first_name},</p><p>A new service booking has been made.</p><table><tr><th>Field</th><th>Details</th></tr><tr><td>Client</td><td>{client_name}</td></tr><tr><td>Service</td><td>{service_name}</td></tr><tr><td>Date</td><td>{booking_date}</td></tr><tr><td>Time</td><td>{booking_time}</td></tr><tr><td>Reference</td><td>{booking_ref}</td></tr></table>", vars: ["first_name","last_name","client_name","service_name","booking_date","booking_time","booking_ref","assigned_to"] },
            { id: "service-rescheduled-client", name: "Service Rescheduled - (Client)", subject: "Booking Rescheduled: {service_name}", body: "<p>Hi {first_name},</p><p>Your service booking has been rescheduled.</p><p><strong>New Date:</strong> {booking_date}<br/><strong>New Time:</strong> {booking_time}</p><p><strong>Booking Reference:</strong> {booking_ref}</p><p>If this doesn't work for you, please let us know.</p>", vars: ["first_name","last_name","client_name","service_name","booking_date","booking_time","booking_ref"] },
          ]},
          lifecycle: { label: "Lifecycle", templates: [
            { id: "service-cancelled-client", name: "Service Cancelled - (Client)", subject: "Booking Cancelled: {service_name}", body: "<p>Hi {first_name},</p><p>Your booking for <strong>{service_name}</strong> on <strong>{booking_date}</strong> has been cancelled.</p><p><strong>Booking Reference:</strong> {booking_ref}</p><p>If this was a mistake or you'd like to rebook, please contact us.</p>", vars: ["first_name","last_name","client_name","service_name","booking_date","booking_ref","cancellation_reason"] },
            { id: "service-completed-client", name: "Service Completed - (Client)", subject: "Service Completed: {service_name}", body: "<h2>Service Completed</h2><p>Hi {first_name},</p><p>Your service <strong>{service_name}</strong> has been completed successfully.</p><p>We hope you are satisfied with the service. If you have any feedback, we'd love to hear from you.</p><p><a href=\"{feedback_url}\">Leave Feedback</a></p>", vars: ["first_name","last_name","client_name","service_name","booking_date","completion_date","feedback_url","technician_name"] },
            { id: "service-in-progress-client", name: "Service In Progress - (Client)", subject: "Service Update: {service_name}", body: "<p>Hi {first_name},</p><p>Your service <strong>{service_name}</strong> is now in progress.</p><p><strong>Assigned Technician:</strong> {technician_name}<br/><strong>Estimated Completion:</strong> {estimated_completion}</p>", vars: ["first_name","last_name","client_name","service_name","technician_name","estimated_completion"] },
          ]},
          reminders: { label: "Reminders", templates: [
            { id: "service-reminder-client", name: "Service Reminder - (Client)", subject: "Reminder: Upcoming Service - {service_name}", body: "<p>Hi {first_name},</p><p>This is a friendly reminder about your upcoming service appointment:</p><table><tr><th>Service</th><th>Date</th><th>Time</th><th>Location</th></tr><tr><td>{service_name}</td><td>{booking_date}</td><td>{booking_time}</td><td>{service_location}</td></tr></table><p><strong>Booking Reference:</strong> {booking_ref}</p><p>If you need to reschedule, please contact us.</p>", vars: ["first_name","last_name","client_name","service_name","booking_date","booking_time","booking_ref","service_location"] },
            { id: "service-followup-client", name: "Service Follow-up - (Client)", subject: "How Was Your Experience?", body: "<p>Hi {first_name},</p><p>We hope you enjoyed your recent service (<strong>{service_name}</strong>) with us.</p><p>Your feedback helps us improve. Please take a moment to share your experience:</p><p><a href=\"{feedback_url}\">Rate Your Experience</a></p><p>Thank you for choosing {our_company_name}!</p>", vars: ["first_name","last_name","client_name","service_name","completion_date","feedback_url"] },
          ]},
          billing: { label: "Billing", templates: [
            { id: "service-invoice-client", name: "Service Invoice - (Client)", subject: "Invoice for {service_name} - #{invoice_id}", body: "<h2>Service Invoice</h2><p>Hi {first_name},</p><p>Here is the invoice for your recent service:</p><table><tr><th>Service</th><th>Date</th><th>Amount</th><th>Invoice #</th></tr><tr><td>{service_name}</td><td>{booking_date}</td><td>{service_price}</td><td>{invoice_id}</td></tr></table><p><a href=\"{invoice_url}\">View & Pay Invoice</a></p>", vars: ["first_name","last_name","client_name","service_name","booking_date","service_price","invoice_id","invoice_url"] },
            { id: "service-payment-received", name: "Service Payment Received - (Client)", subject: "Payment Received - Thank You", body: "<p>Hi {first_name},</p><p>We've received your payment of <strong>{payment_amount}</strong> for <strong>{service_name}</strong>.</p><p>Thank you for your prompt payment!</p>", vars: ["first_name","last_name","client_name","service_name","payment_amount","payment_date"] },
          ]},
        };
        const SERVICE_GENERAL_VARS = ["{our_company_name}", "{todays_date}", "{email_signature}", "{email_footer}", "{dashboard_url}"];
        const allServiceTpls = Object.values(SERVICE_EMAIL_TEMPLATES).flatMap(g => g.templates);
        const currentServiceTpl = allServiceTpls.find(t => t.id === selectedServiceTpl);
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Services Email Templates</h3>
                <p className="text-sm text-muted-foreground">APP &gt; SETTINGS &gt; SERVICES &gt; EMAIL TEMPLATES</p>
              </div>
              <Select value={selectedServiceTpl} onValueChange={async (v) => {
                setSelectedServiceTpl(v);
                const tpl = allServiceTpls.find(t => t.id === v);
                try {
                  const saved = await utils.settings.getByCategory.fetch({ category: `email_template:${v}` });
                  if (saved && (saved.subject || saved.body)) {
                    setServiceTplSubject(saved.subject || tpl?.subject || "");
                    setServiceTplBody(saved.body || tpl?.body || "");
                    return;
                  }
                } catch { /* use defaults */ }
                if (tpl) { setServiceTplSubject(tpl.subject); setServiceTplBody(tpl.body); }
              }}>
                <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select A Template" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_EMAIL_TEMPLATES).map(([key, group]) => (
                    <div key={key}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">[ {group.label} ]</div>
                      {group.templates.map(tpl => (
                        <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!currentServiceTpl ? (
              <Card className="py-16">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                  <h4 className="text-lg font-medium">Select a service email template from the dropdown</h4>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-[1fr_280px] gap-4">
                <div className="space-y-4">
                  <Field label="Subject">
                    <Input value={serviceTplSubject} onChange={(e) => setServiceTplSubject(e.target.value)} placeholder="Email subject line" />
                  </Field>
                  <Field label="Email Body">
                    <RichTextEditor value={serviceTplBody} onChange={setServiceTplBody} minHeight="300px" />
                  </Field>
                  <SaveButton
                    saving={!!saving["services-email-templates"]}
                    onClick={() => save("services-email-templates", () => updateByCategory.mutateAsync({ category: `email_template:${selectedServiceTpl}`, values: { subject: serviceTplSubject, body: serviceTplBody } }))}
                  />
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Template Variables</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {currentServiceTpl.vars.map(v => <div key={v} className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => { setServiceTplBody(prev => prev + `{${v}}`); }}>{`{${v}}`}</div>)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">General Variables</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {SERVICE_GENERAL_VARS.map(v => <div key={v} className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => { setServiceTplBody(prev => prev + v); }}>{v}</div>)}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── E-SIGNATURES ───────────────────────────────────────────────────
      case "esign-general":
        return (
          <Section title="E-Signature Settings" description="Configure electronic signature capabilities for contracts and proposals">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable E-Signatures</p><p className="text-xs text-muted-foreground">Allow electronic document signing</p></div>
                <Switch checked={esignGeneral.enabled} onCheckedChange={(v) => setEsignGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <Field label="Provider">
                <Select value={esignGeneral.provider} onValueChange={(v) => setEsignGeneral((p) => ({ ...p, provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="built-in">Built-in</SelectItem><SelectItem value="docusign">DocuSign</SelectItem><SelectItem value="hellosign">HelloSign</SelectItem></SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require Authentication</p><p className="text-xs text-muted-foreground">Signers must verify identity before signing</p></div>
                <Switch checked={esignGeneral.requireAuth} onCheckedChange={(v) => setEsignGeneral((p) => ({ ...p, requireAuth: v }))} /></div>
              <Field label="Signature Expiry (days)"><Input type="number" min="1" value={esignGeneral.expiryDays} onChange={(e) => setEsignGeneral((p) => ({ ...p, expiryDays: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving["esign-general"]} onClick={() => save("esign-general", () => updateByCategory.mutateAsync({ category: "esign_general", values: { ...esignGeneral, enabled: String(esignGeneral.enabled), requireAuth: String(esignGeneral.requireAuth) } }))} />
          </Section>
        );

      case "esign-providers":
        return (
          <Section title="Signature Providers" description="Configure third-party e-signature integrations">
            <div className="space-y-6">
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between"><p className="font-medium">DocuSign</p><Switch checked={esignProviders.docusign} onCheckedChange={(v) => setEsignProviders((p) => ({ ...p, docusign: v }))} /></div>
                {esignProviders.docusign && <Field label="Integration Key"><Input type="password" value={esignProviders.docusignApiKey} onChange={(e) => setEsignProviders((p) => ({ ...p, docusignApiKey: e.target.value }))} placeholder="DocuSign Integration Key" /></Field>}
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between"><p className="font-medium">HelloSign</p><Switch checked={esignProviders.hellosign} onCheckedChange={(v) => setEsignProviders((p) => ({ ...p, hellosign: v }))} /></div>
                {esignProviders.hellosign && <Field label="API Key"><Input type="password" value={esignProviders.hellosignApiKey} onChange={(e) => setEsignProviders((p) => ({ ...p, hellosignApiKey: e.target.value }))} placeholder="HelloSign API Key" /></Field>}
              </div>
            </div>
            <SaveButton saving={!!saving["esign-providers"]} onClick={() => save("esign-providers", () => updateByCategory.mutateAsync({ category: "esign_providers", values: { ...esignProviders, docusign: String(esignProviders.docusign), hellosign: String(esignProviders.hellosign) } }))} />
          </Section>
        );

      case "esign-templates":
        return (
          <Section title="Document Templates" description="Design and preview document templates for invoices, receipts, and quotations. Use the rich text editor to customize body content – insert tables, images, and formatted text. Leave blank to use the default system template.">
            <div className="space-y-4">
              {/* Template type selector */}
              <Field label="Document Type">
                <Select value={docTemplateType} onValueChange={(v: any) => setDocTemplateType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice Template</SelectItem>
                    <SelectItem value="receipt">Receipt Template</SelectItem>
                    <SelectItem value="estimate">Quotation / Estimate Template</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* Placeholders reference */}
              <div className="p-3 bg-muted/50 rounded-lg border">
                <p className="text-sm font-medium mb-2">Available Placeholders</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "{{company_name}}", "{{company_email}}", "{{company_phone}}", "{{company_address}}",
                    "{{client_name}}", "{{client_email}}", "{{document_number}}", "{{document_date}}",
                    "{{due_date}}", "{{subtotal}}", "{{tax}}", "{{total}}", "{{currency}}", "{{items_table}}",
                  ].map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs font-mono cursor-pointer hover:bg-primary/20" onClick={() => {
                      navigator.clipboard.writeText(p);
                      toast.success(`Copied ${p}`);
                    }}>{p}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Click a placeholder to copy. Insert into the editor to use dynamic data. Use the table button (grid icon) in the toolbar to insert item tables.</p>
              </div>

              {/* Rich text template editor */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {docTemplateType === "invoice" ? "Invoice" : docTemplateType === "receipt" ? "Receipt" : "Quotation"} Template Body
                </Label>
                <RichTextEditor
                  value={docTemplates[docTemplateType] || ""}
                  onChange={(v: string) => setDocTemplates((prev) => ({ ...prev, [docTemplateType]: v }))}
                  placeholder={`Design your ${docTemplateType} template here. Use the toolbar to insert tables, format text, add images, etc. Leave empty to use the default system template.`}
                  minHeight="300px"
                />
              </div>

              {/* Preview toggle */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Live Preview</p>
                <Switch checked={docTemplatePreview} onCheckedChange={setDocTemplatePreview} />
              </div>

              {docTemplatePreview && (
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div className="p-2 bg-muted/30 border-b flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Preview: {docTemplateType.charAt(0).toUpperCase() + docTemplateType.slice(1)}</span>
                  </div>
                  <div className="p-6">
                    {docTemplates[docTemplateType] ? (
                      <div
                        className="prose prose-sm max-w-none [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-gray-300 [&_td]:p-2"
                        dangerouslySetInnerHTML={{ __html: docTemplates[docTemplateType]
                          .replace(/\{\{company_name\}\}/g, companyInfo.companyName || "Your Company")
                          .replace(/\{\{company_email\}\}/g, companyInfo.companyEmail || "email@company.com")
                          .replace(/\{\{company_phone\}\}/g, companyInfo.companyPhone || "+254 XXX XXX XXX")
                          .replace(/\{\{company_address\}\}/g, companyInfo.companyAddress || "Address")
                          .replace(/\{\{client_name\}\}/g, "Sample Client Ltd")
                          .replace(/\{\{client_email\}\}/g, "client@example.com")
                          .replace(/\{\{document_number\}\}/g, docTemplateType === "invoice" ? "INV-0001" : docTemplateType === "receipt" ? "RCP-0001" : "EST-0001")
                          .replace(/\{\{document_date\}\}/g, new Date().toLocaleDateString())
                          .replace(/\{\{due_date\}\}/g, new Date(Date.now() + 7 * 86400000).toLocaleDateString())
                          .replace(/\{\{subtotal\}\}/g, "10,000.00")
                          .replace(/\{\{tax\}\}/g, "1,600.00")
                          .replace(/\{\{total\}\}/g, "11,600.00")
                          .replace(/\{\{currency\}\}/g, "KES")
                        }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No custom template defined. The system default template will be used for {docTemplateType}s.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* E-Sign specific templates (name list) */}
            <div className="space-y-3">
              <p className="text-sm font-medium">E-Signature Document Types</p>
              <p className="text-xs text-muted-foreground">Create named template types for e-signature workflows (NDA, Service Agreement, etc.)</p>
              <div className="space-y-2">{esignTemplates.map((t) => (<div key={t.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{t.name}</span><button onClick={() => { const u = esignTemplates.filter((x) => x.id !== t.id); setEsignTemplates(u); updateByCategory.mutate({ category: "esign_templates", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
              <div className="flex gap-2 items-end"><Field label="Template Name"><Input value={newEsignTemplate.name} onChange={(e) => setNewEsignTemplate({ name: e.target.value })} placeholder="e.g. NDA, Service Agreement" /></Field>
                <Button size="sm" onClick={() => { if (!newEsignTemplate.name) { toast.error("Name required"); return; } const u = [...esignTemplates, { id: crypto.randomUUID(), ...newEsignTemplate }]; setEsignTemplates(u); setNewEsignTemplate({ name: "" }); updateByCategory.mutate({ category: "esign_templates", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
            </div>

            <SaveButton
              saving={!!saving["esign-templates"]}
              onClick={() => save("esign-templates", () => updateByCategory.mutateAsync({ category: "document_templates", values: docTemplates }))}
            />
          </Section>
        );

      // ── EMAIL MARKETING ────────────────────────────────────────────────
      case "emarketing-general":
        return (
          <Section title="Email Marketing Settings" description="Configure email marketing campaigns and automation">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Email Marketing</p><p className="text-xs text-muted-foreground">Send newsletters and marketing campaigns</p></div>
                <Switch checked={emarketingGeneral.enabled} onCheckedChange={(v) => setEmarketingGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <Field label="Provider">
                <Select value={emarketingGeneral.provider} onValueChange={(v) => setEmarketingGeneral((p) => ({ ...p, provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="built-in">Built-in</SelectItem><SelectItem value="mailchimp">Mailchimp</SelectItem><SelectItem value="sendinblue">Sendinblue</SelectItem><SelectItem value="sendgrid">SendGrid</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="From Name"><Input value={emarketingGeneral.fromName} onChange={(e) => setEmarketingGeneral((p) => ({ ...p, fromName: e.target.value }))} placeholder="Your Company" /></Field>
              <Field label="From Email"><Input type="email" value={emarketingGeneral.fromEmail} onChange={(e) => setEmarketingGeneral((p) => ({ ...p, fromEmail: e.target.value }))} placeholder="marketing@yourdomain.com" /></Field>
              <Field label="Unsubscribe URL"><Input value={emarketingGeneral.unsubscribeUrl} onChange={(e) => setEmarketingGeneral((p) => ({ ...p, unsubscribeUrl: e.target.value }))} placeholder="https://yourdomain.com/unsubscribe" /></Field>
            </div>
            <SaveButton saving={!!saving["emarketing-general"]} onClick={() => save("emarketing-general", () => updateByCategory.mutateAsync({ category: "emarketing_general", values: { ...emarketingGeneral, enabled: String(emarketingGeneral.enabled) } }))} />
          </Section>
        );

      case "emarketing-campaigns":
        return (
          <Section title="Campaigns" description="Create and manage email marketing campaigns">
            <p className="text-sm text-muted-foreground mb-3">Build targeted email campaigns for your clients and leads.</p>
            <div className="space-y-2">
              {["Welcome Series", "Monthly Newsletter", "Product Announcements", "Re-engagement"].map((name) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                  <div><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">Template campaign</p></div>
                  <div className="flex gap-2"><Badge variant="secondary">Draft</Badge><Button variant="outline" size="sm" onClick={() => setEditingCampaign({ name, subject: `${name} — Campaign`, audience: "All Contacts", schedule: "Manual", body: "" })}>Edit</Button></div>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => setEditingCampaign({ name: "", subject: "", audience: "All Contacts", schedule: "Manual", body: "" })}><Plus className="h-4 w-4 mr-1" />Create Campaign</Button>
            <Dialog open={!!editingCampaign} onOpenChange={(o) => { if (!o) setEditingCampaign(null); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingCampaign?.name ? `Edit: ${editingCampaign.name}` : "New Campaign"}</DialogTitle>
                  <DialogDescription>Configure campaign details, targeting, schedule, and content.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label>Campaign Name</Label><Input value={editingCampaign?.name ?? ""} onChange={(e) => setEditingCampaign((p) => p ? { ...p, name: e.target.value } : p)} placeholder="e.g. Spring Promotion" /></div>
                  <div><Label>Subject Line</Label><Input value={editingCampaign?.subject ?? ""} onChange={(e) => setEditingCampaign((p) => p ? { ...p, subject: e.target.value } : p)} placeholder="Email subject" /></div>
                  <div><Label>Target Audience</Label>
                    <Select value={editingCampaign?.audience ?? "All Contacts"} onValueChange={(v) => setEditingCampaign((p) => p ? { ...p, audience: v } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="All Contacts">All Contacts</SelectItem><SelectItem value="Clients Only">Clients Only</SelectItem><SelectItem value="Leads Only">Leads Only</SelectItem><SelectItem value="Newsletter Subscribers">Newsletter Subscribers</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Schedule</Label>
                    <Select value={editingCampaign?.schedule ?? "Manual"} onValueChange={(v) => setEditingCampaign((p) => p ? { ...p, schedule: v } : p)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Manual">Send Manually</SelectItem><SelectItem value="Scheduled">Schedule for Later</SelectItem><SelectItem value="Recurring">Recurring</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Body Content</Label><Textarea rows={5} value={editingCampaign?.body ?? ""} onChange={(e) => setEditingCampaign((p) => p ? { ...p, body: e.target.value } : p)} placeholder="Write your campaign email content..." /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingCampaign(null)}>Cancel</Button>
                  <Button onClick={() => { toast.success(`Campaign "${editingCampaign?.name}" saved`); setEditingCampaign(null); }}>Save Campaign</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>
        );

      case "emarketing-lists":
        return (
          <Section title="Mailing Lists" description="Manage subscriber lists for email campaigns">
            <div className="space-y-2">{emarketingLists.map((l) => (<div key={l.id} className="flex items-center justify-between p-2 border rounded"><span className="text-sm">{l.name}</span><button onClick={() => { const u = emarketingLists.filter((x) => x.id !== l.id); setEmarketingLists(u); updateByCategory.mutate({ category: "emarketing_lists", values: { list: JSON.stringify(u) } }); }} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            <div className="flex gap-2 items-end mt-3"><Field label="List Name"><Input value={newEmarketingList.name} onChange={(e) => setNewEmarketingList({ name: e.target.value })} placeholder="e.g. Newsletter, Product Updates" /></Field>
              <Button size="sm" onClick={() => { if (!newEmarketingList.name) { toast.error("Name required"); return; } const u = [...emarketingLists, { id: crypto.randomUUID(), ...newEmarketingList }]; setEmarketingLists(u); setNewEmarketingList({ name: "" }); updateByCategory.mutate({ category: "emarketing_lists", values: { list: JSON.stringify(u) } }); }}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          </Section>
        );

      case "emarketing-templates":
        return (
          <Section title="Marketing Templates" description="Design reusable email templates for campaigns">
            <div className="space-y-2">
              {["Welcome Email", "Product Launch", "Event Invitation", "Monthly Digest", "Special Offer"].map((name) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                  <div><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">HTML Email Template</p></div>
                  <Button variant="outline" size="sm" onClick={() => setEditingTemplate({ name, subject: `${name}`, body: "" })}>Customize</Button>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={() => setEditingTemplate({ name: "", subject: "", body: "" })}><Plus className="h-4 w-4 mr-1" />Create Template</Button>
            <Dialog open={!!editingTemplate} onOpenChange={(o) => { if (!o) setEditingTemplate(null); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingTemplate?.name ? `Customize: ${editingTemplate.name}` : "New Template"}</DialogTitle>
                  <DialogDescription>Edit template subject, body content, and branding.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label>Template Name</Label><Input value={editingTemplate?.name ?? ""} onChange={(e) => setEditingTemplate((p) => p ? { ...p, name: e.target.value } : p)} placeholder="Template name" /></div>
                  <div><Label>Subject Line</Label><Input value={editingTemplate?.subject ?? ""} onChange={(e) => setEditingTemplate((p) => p ? { ...p, subject: e.target.value } : p)} placeholder="Email subject" /></div>
                  <div><Label>Body (HTML)</Label><Textarea rows={8} value={editingTemplate?.body ?? ""} onChange={(e) => setEditingTemplate((p) => p ? { ...p, body: e.target.value } : p)} placeholder="<html>&#10;  <body>&#10;    <h1>Hello {{name}}</h1>&#10;    <p>Your content here...</p>&#10;  </body>&#10;</html>" className="font-mono text-sm" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                  <Button onClick={() => { toast.success(`Template "${editingTemplate?.name}" saved`); setEditingTemplate(null); }}>Save Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>
        );

      // ── CLIENT PORTAL ──────────────────────────────────────────────────
      case "portal-general":
        return (
          <Section title="Client Portal Settings" description="Configure the client-facing portal experience">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Client Portal</p><p className="text-xs text-muted-foreground">Allow clients to access their portal</p></div>
                <Switch checked={portalGeneral.enabled} onCheckedChange={(v) => setPortalGeneral((p) => ({ ...p, enabled: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require Approval</p><p className="text-xs text-muted-foreground">Admin must approve client portal registrations</p></div>
                <Switch checked={portalGeneral.requireApproval} onCheckedChange={(v) => setPortalGeneral((p) => ({ ...p, requireApproval: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Show Invoices</p><p className="text-xs text-muted-foreground">Clients can view their invoices</p></div>
                <Switch checked={portalGeneral.showInvoices} onCheckedChange={(v) => setPortalGeneral((p) => ({ ...p, showInvoices: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Show Projects</p><p className="text-xs text-muted-foreground">Clients can view their project status</p></div>
                <Switch checked={portalGeneral.showProjects} onCheckedChange={(v) => setPortalGeneral((p) => ({ ...p, showProjects: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Show Tickets</p><p className="text-xs text-muted-foreground">Clients can view and create support tickets</p></div>
                <Switch checked={portalGeneral.showTickets} onCheckedChange={(v) => setPortalGeneral((p) => ({ ...p, showTickets: v }))} /></div>
              <Field label="Custom Domain"><Input value={portalGeneral.customDomain} onChange={(e) => setPortalGeneral((p) => ({ ...p, customDomain: e.target.value }))} placeholder="portal.yourdomain.com" /></Field>
            </div>
            <SaveButton saving={!!saving["portal-general"]} onClick={() => save("portal-general", () => updateByCategory.mutateAsync({ category: "portal_general", values: { ...portalGeneral, enabled: String(portalGeneral.enabled), requireApproval: String(portalGeneral.requireApproval), showInvoices: String(portalGeneral.showInvoices), showProjects: String(portalGeneral.showProjects), showTickets: String(portalGeneral.showTickets) } }))} />
          </Section>
        );

      case "portal-branding":
        return (
          <Section title="Portal Branding" description="Customize the look and feel of your client portal">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Portal Title"><Input value={portalBranding.portalTitle} onChange={(e) => setPortalBranding((p) => ({ ...p, portalTitle: e.target.value }))} placeholder="Client Portal" /></Field>
              <Field label="Logo URL"><Input value={portalBranding.logoUrl} onChange={(e) => setPortalBranding((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="https://yourdomain.com/logo.png" /></Field>
              <Field label="Primary Color"><div className="flex gap-2"><Input value={portalBranding.primaryColor} onChange={(e) => setPortalBranding((p) => ({ ...p, primaryColor: e.target.value }))} /><input type="color" value={portalBranding.primaryColor} onChange={(e) => setPortalBranding((p) => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" /></div></Field>
              <Field label="Welcome Message"><Input value={portalBranding.welcomeMessage} onChange={(e) => setPortalBranding((p) => ({ ...p, welcomeMessage: e.target.value }))} placeholder="Welcome to your client portal" /></Field>
            </div>
            <SaveButton saving={!!saving["portal-branding"]} onClick={() => save("portal-branding", () => updateByCategory.mutateAsync({ category: "portal_branding", values: portalBranding }))} />
          </Section>
        );

      case "portal-permissions":
        return (
          <Section title="Portal Permissions" description="Control what clients can do in the portal">
            <div className="space-y-4">
              {Object.entries({ viewInvoices: "View Invoices", payOnline: "Pay Online", createTickets: "Create Support Tickets", viewProjects: "View Projects", downloadFiles: "Download Files", viewEstimates: "View Estimates" }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><p className="text-sm font-medium">{label}</p><Switch checked={(portalPermissions as any)[key]} onCheckedChange={(v) => setPortalPermissions((p) => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <SaveButton saving={!!saving["portal-permissions"]} onClick={() => save("portal-permissions", () => updateByCategory.mutateAsync({ category: "portal_permissions", values: Object.fromEntries(Object.entries(portalPermissions).map(([k, v]) => [k, String(v)])) }))} />
          </Section>
        );

      case "portal-modules":
        return (
          <Section title="Module Access" description="Control which modules are visible in the client portal">
            <div className="space-y-4">
              {Object.entries({ invoices: "Invoices", estimates: "Estimates", projects: "Projects", tickets: "Support Tickets", contracts: "Contracts", knowledgebase: "Knowledge Base", announcements: "Announcements" }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between"><p className="text-sm font-medium">{label}</p><Switch checked={(portalModules as any)[key]} onCheckedChange={(v) => setPortalModules((p) => ({ ...p, [key]: v }))} /></div>
              ))}
            </div>
            <SaveButton saving={!!saving["portal-modules"]} onClick={() => save("portal-modules", () => updateByCategory.mutateAsync({ category: "portal_modules", values: Object.fromEntries(Object.entries(portalModules).map(([k, v]) => [k, String(v)])) }))} />
          </Section>
        );

      // ── PURCHASING ─────────────────────────────────────────────────────
      case "purchasing-settings":
        return (
          <Section title="Purchasing Settings" description="Configure purchasing module options">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Purchasing</p><p className="text-xs text-muted-foreground">Track purchase orders and vendor management</p></div>
                <Switch checked={purchasingSettings.enabled} onCheckedChange={(v) => setPurchasingSettings((p) => ({ ...p, enabled: v }))} /></div>
              <Field label="Default Tax Rate (%)"><Input type="number" min="0" max="100" value={purchasingSettings.defaultTaxRate} onChange={(e) => setPurchasingSettings((p) => ({ ...p, defaultTaxRate: e.target.value }))} /></Field>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Require Approval</p><p className="text-xs text-muted-foreground">Purchase orders need approval before processing</p></div>
                <Switch checked={purchasingSettings.approvalRequired} onCheckedChange={(v) => setPurchasingSettings((p) => ({ ...p, approvalRequired: v }))} /></div>
              <Field label="Default Payment Terms">
                <Select value={purchasingSettings.defaultPaymentTerms} onValueChange={(v) => setPurchasingSettings((p) => ({ ...p, defaultPaymentTerms: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net15">Net 15</SelectItem><SelectItem value="net30">Net 30</SelectItem><SelectItem value="net45">Net 45</SelectItem><SelectItem value="net60">Net 60</SelectItem><SelectItem value="due-on-receipt">Due on Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <SaveButton saving={!!saving["purchasing-settings"]} onClick={() => save("purchasing-settings", () => updateByCategory.mutateAsync({ category: "purchasing_settings", values: { ...purchasingSettings, enabled: String(purchasingSettings.enabled), approvalRequired: String(purchasingSettings.approvalRequired) } }))} />
          </Section>
        );

      case "purchasing-email":
        return (
          <Section title="Purchasing Email" description="Configure email notifications for purchasing">
            <div className="space-y-2">
              {["Purchase Order Created - Team", "Purchase Order Approved - Team", "Purchase Order Received - Team", "Purchase Order Rejected - Team"].map((name) => (
                <div key={name} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                  <div><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">System template</p></div>
                  <Button variant="outline" size="sm" onClick={() => setEditingPurchasingTemplate({ name, subject: name, body: "" })}>Edit</Button>
                </div>
              ))}
            </div>
            <Dialog open={!!editingPurchasingTemplate} onOpenChange={(o) => { if (!o) setEditingPurchasingTemplate(null); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit: {editingPurchasingTemplate?.name}</DialogTitle>
                  <DialogDescription>Customize the email notification template content.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label>Subject</Label><Input value={editingPurchasingTemplate?.subject ?? ""} onChange={(e) => setEditingPurchasingTemplate((p) => p ? { ...p, subject: e.target.value } : p)} placeholder="Email subject line" /></div>
                  <div><Label>Body</Label><Textarea rows={8} value={editingPurchasingTemplate?.body ?? ""} onChange={(e) => setEditingPurchasingTemplate((p) => p ? { ...p, body: e.target.value } : p)} placeholder="Hello {{recipient_name}},&#10;&#10;A purchase order has been {{action}}.&#10;&#10;PO Number: {{po_number}}&#10;Amount: {{amount}}&#10;&#10;Regards,&#10;{{company_name}}" className="font-mono text-sm" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingPurchasingTemplate(null)}>Cancel</Button>
                  <Button onClick={() => { toast.success(`Template "${editingPurchasingTemplate?.name}" saved`); setEditingPurchasingTemplate(null); }}>Save Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Section>
        );

      // ── TWEAK ──────────────────────────────────────────────────────────
      case "tweak":
        return (
          <Section title="Tweak" description="Advanced system configuration">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Show Powered By</p><p className="text-xs text-muted-foreground">Display platform branding in footer</p></div>
                <Switch checked={tweakSettings.showPoweredBy} onCheckedChange={(v) => setTweakSettings((p) => ({ ...p, showPoweredBy: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Force HTTPS</p><p className="text-xs text-muted-foreground">Redirect all requests to HTTPS</p></div>
                <Switch checked={tweakSettings.forceHttps} onCheckedChange={(v) => setTweakSettings((p) => ({ ...p, forceHttps: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Enable Debug Mode</p><p className="text-xs text-muted-foreground">Show detailed error messages (development only)</p></div>
                <Switch checked={tweakSettings.debugMode} onCheckedChange={(v) => setTweakSettings((p) => ({ ...p, debugMode: v }))} /></div>
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Maintenance Mode</p><p className="text-xs text-muted-foreground">Show maintenance page to all non-admin users</p></div>
                <Switch checked={tweakSettings.maintenanceMode} onCheckedChange={(v) => setTweakSettings((p) => ({ ...p, maintenanceMode: v }))} /></div>
              <Field label="Custom CSS"><textarea className="w-full min-h-[100px] p-2 text-sm font-mono border rounded-md" placeholder="/* Custom CSS overrides */" value={tweakSettings.customCss} onChange={(e) => setTweakSettings((p) => ({ ...p, customCss: e.target.value }))} /></Field>
              <Field label="Custom JavaScript"><textarea className="w-full min-h-[100px] p-2 text-sm font-mono border rounded-md" placeholder="// Custom JavaScript" value={tweakSettings.customJs} onChange={(e) => setTweakSettings((p) => ({ ...p, customJs: e.target.value }))} /></Field>
            </div>
            <SaveButton saving={!!saving.tweak} onClick={() => save("tweak", async () => { await updateByCategory.mutateAsync({ category: "tweak_settings", values: { ...tweakSettings, showPoweredBy: String(tweakSettings.showPoweredBy), forceHttps: String(tweakSettings.forceHttps), debugMode: String(tweakSettings.debugMode), maintenanceMode: String(tweakSettings.maintenanceMode) } }); await updateByCategory.mutateAsync({ category: "maintenance", values: { maintenance_mode: String(tweakSettings.maintenanceMode) } }); })} />
          </Section>
        );

      default:
        return null;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ModuleLayout
      title="Settings"
      description="Configure every aspect of your CRM system"
      icon={<SettingsIcon className="h-5 w-5" />}
      breadcrumbs={[{ label: "Dashboard", href: "/crm-home" }, { label: "Settings" }]}
    >
      <div className="flex gap-6 min-h-[600px]">

        {/* ── Left sidebar (hierarchical tree) ── */}
        <aside className="w-64 shrink-0">
          <nav className="sticky top-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1 space-y-0.5">
            {NAV_GROUPS.map((group) => {
              const isOpen = expandedGroups.has(group.id);
              const hasActive = group.children.some(isChildActive);
              return (
                <div key={group.id}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-medium transition-colors text-left",
                      hasActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {group.icon}
                    <span className="flex-1 truncate">{group.label}</span>
                    {isOpen
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                  </button>

                  {/* Children */}
                  {isOpen && (
                    <div className="ml-3 pl-3 border-l space-y-0.5 my-0.5">
                      {group.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => handleChildClick(child)}
                          className={cn(
                            "w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left",
                            isChildActive(child)
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span className="flex-1 truncate">{child.label}</span>
                          {child.type === "link" && (
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full text-muted-foreground" onClick={resetAllSettings}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset All Settings
            </Button>
          </div>
        </aside>

        {/* ── Right content panel ── */}
        <main className="flex-1 space-y-6 min-w-0">
          {renderContent()}
        </main>

      </div>
    </ModuleLayout>
  );
}
