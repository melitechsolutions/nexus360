import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { useMaintenanceModeEnforcement } from "@/hooks/useMaintenanceModeEnforcement";
import MaintenancePage from "@/pages/MaintenancePage";
import { NotificationBell } from "./NotificationBell";
import { FloatingAIChat } from "./FloatingAIChat";
import FloatingChatNotifications from "./FloatingChatNotifications";
import AccessibilityWidget from "./AccessibilityWidget";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, Users, FileText, DollarSign, Receipt,
  Briefcase, UserCog, Calendar, Clock, BookOpen, Target,
  BarChart3, MessageSquare, HelpCircle, Sparkles, ShoppingCart,
  FileCheck, Wrench, Settings, LogOut, Menu, X, Building2,
  Users2, Shield, CreditCard, Sun, Moon, Search, KanbanSquare,
  CalendarDays, Activity, Crown, ChevronDown, ChevronRight,
  Home, Plus, User, Lock, Ticket, Star, AlarmClock, Globe,
  Timer, Phone, Pencil, Layers, StickyNote, Bell, ImageIcon,
  KeyRound, Play, Square, Check, Save, Package, FolderKanban,
  CheckSquare, Truck, ClipboardList, FileSpreadsheet, Banknote,
  Landmark, TrendingUp, PieChart, GraduationCap, BriefcaseMedical,
  Scale, MessagesSquare, Headphones, Book,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  featureKey?: string;
  adminOnly?: boolean;
  children?: NavItem[];
}

function buildOrgNav(slug: string): NavItem[] {
  return [
    { id: 'dashboard', label: 'Dashboard', href: `/org/${slug}/dashboard`, icon: LayoutDashboard },
    { id: 'crm_group', label: 'CRM', href: '', icon: Users, children: [
      { id: 'crm', label: 'Clients', href: `/org/${slug}/crm`, icon: Users, featureKey: 'crm' },
      { id: 'contacts', label: 'Contacts', href: `/org/${slug}/contacts`, icon: Phone, featureKey: 'crm' },
      { id: 'pipeline', label: 'Sales Pipeline', href: `/org/${slug}/pipeline`, icon: KanbanSquare, featureKey: 'crm' },
      { id: 'leads', label: 'Leads', href: `/org/${slug}/leads`, icon: Phone, featureKey: 'crm' },
      { id: 'calendar', label: 'Calendar', href: `/org/${slug}/calendar`, icon: CalendarDays, featureKey: 'crm' },
      { id: 'activity', label: 'Activity', href: `/org/${slug}/activity`, icon: Activity },
      { id: 'approvals', label: 'Approvals', href: `/org/${slug}/approvals`, icon: Shield },
    ]},
    { id: 'finance_group', label: 'Finance', href: '', icon: DollarSign, children: [
      { id: 'invoicing', label: 'Invoices', href: `/org/${slug}/invoices`, icon: FileText, featureKey: 'invoicing' },
      { id: 'payments', label: 'Payments', href: `/org/${slug}/payments`, icon: DollarSign, featureKey: 'payments' },
      { id: 'estimates', label: 'Estimates', href: `/org/${slug}/estimates`, icon: FileSpreadsheet, featureKey: 'invoicing' },
      { id: 'receipts', label: 'Receipts', href: `/org/${slug}/receipts`, icon: Receipt, featureKey: 'payments' },
      { id: 'expenses', label: 'Expenses', href: `/org/${slug}/expenses`, icon: Receipt, featureKey: 'expenses' },
      { id: 'credit_notes', label: 'Credit Notes', href: `/org/${slug}/credit-notes`, icon: FileText, featureKey: 'invoicing' },
      { id: 'debit_notes', label: 'Debit Notes', href: `/org/${slug}/debit-notes`, icon: FileText, featureKey: 'invoicing' },
      { id: 'subscriptions', label: 'Subscriptions', href: `/org/${slug}/subscriptions`, icon: Layers, featureKey: 'invoicing' },
      { id: 'accounting', label: 'Accounting', href: `/org/${slug}/accounting`, icon: BookOpen, featureKey: 'accounting' },
      { id: 'budgets', label: 'Budgets', href: `/org/${slug}/budgets`, icon: Target, featureKey: 'budgets' },
    ]},
    { id: 'accounting_group', label: 'Accounting', href: '', icon: BookOpen, children: [
      { id: 'chart_of_accounts', label: 'Chart of Accounts', href: `/org/${slug}/chart-of-accounts`, icon: BookOpen, featureKey: 'accounting' },
      { id: 'bank_reconciliation', label: 'Bank Reconciliation', href: `/org/${slug}/bank-reconciliation`, icon: Landmark, featureKey: 'accounting' },
      { id: 'financial_dashboard', label: 'Financial Dashboard', href: `/org/${slug}/financial-dashboard`, icon: PieChart, featureKey: 'accounting' },
      { id: 'forecasting', label: 'Forecasting', href: `/org/${slug}/forecasting`, icon: TrendingUp, featureKey: 'accounting' },
      { id: 'tax_compliance', label: 'Tax Compliance', href: `/org/${slug}/tax-compliance`, icon: Scale, featureKey: 'accounting' },
    ]},
    { id: 'purchasing_group', label: 'Purchasing', href: '', icon: ShoppingCart, children: [
      { id: 'suppliers', label: 'Suppliers', href: `/org/${slug}/suppliers`, icon: Users2, featureKey: 'procurement' },
      { id: 'lpos', label: 'Purchase Orders', href: `/org/${slug}/lpos`, icon: ShoppingCart, featureKey: 'procurement' },
      { id: 'orders', label: 'Orders', href: `/org/${slug}/orders`, icon: ClipboardList, featureKey: 'procurement' },
      { id: 'imprests', label: 'Imprests', href: `/org/${slug}/imprests`, icon: Banknote, featureKey: 'procurement' },
    ]},
    { id: 'inventory_group', label: 'Inventory', href: '', icon: Package, children: [
      { id: 'products', label: 'Products', href: `/org/${slug}/products`, icon: Package, featureKey: 'procurement' },
      { id: 'stock', label: 'Stock', href: `/org/${slug}/inventory`, icon: Package, featureKey: 'procurement' },
      { id: 'delivery_notes', label: 'Delivery Notes', href: `/org/${slug}/delivery-notes`, icon: Truck, featureKey: 'procurement' },
      { id: 'grn', label: 'GRNs', href: `/org/${slug}/grn`, icon: ClipboardList, featureKey: 'procurement' },
    ]},
    { id: 'services_group', label: 'Services', href: '', icon: Wrench, children: [
      { id: 'services', label: 'Services', href: `/org/${slug}/services`, icon: Wrench, featureKey: 'invoicing' },
      { id: 'service_templates', label: 'Service Templates', href: `/org/${slug}/service-templates`, icon: FileText, featureKey: 'invoicing' },
      { id: 'service_invoices', label: 'Service Invoices', href: `/org/${slug}/service-invoices`, icon: FileText, featureKey: 'invoicing' },
    ]},
    { id: 'proposals_group', label: 'Proposals', href: '', icon: Pencil, children: [
      { id: 'proposals', label: 'Proposals', href: `/org/${slug}/proposals`, icon: Pencil, featureKey: 'invoicing' },
      { id: 'proposal_templates', label: 'Templates', href: `/org/${slug}/proposals/templates`, icon: FileText, featureKey: 'invoicing' },
      { id: 'quotations', label: 'Quotations', href: `/org/${slug}/quotations`, icon: FileSpreadsheet, featureKey: 'invoicing' },
    ]},
    { id: 'ops_group', label: 'Operations', href: '', icon: Briefcase, children: [
      { id: 'projects', label: 'Projects', href: `/org/${slug}/projects`, icon: Briefcase, featureKey: 'projects' },
      { id: 'tasks', label: 'Tasks', href: `/org/${slug}/tasks`, icon: CheckSquare, featureKey: 'projects' },
      { id: 'contracts', label: 'Contracts', href: `/org/${slug}/contracts`, icon: FileCheck, featureKey: 'contracts' },
      { id: 'contract_templates', label: 'Contract Templates', href: `/org/${slug}/contracts/templates`, icon: FileText, featureKey: 'contracts' },
      { id: 'assets', label: 'Assets', href: `/org/${slug}/assets`, icon: Package, featureKey: 'contracts' },
      { id: 'warranty', label: 'Warranty', href: `/org/${slug}/warranty`, icon: Shield, featureKey: 'contracts' },
      { id: 'work_orders', label: 'Work Orders', href: `/org/${slug}/work-orders`, icon: Wrench, featureKey: 'work_orders' },
    ]},
    { id: 'hr_group', label: 'HR & Payroll', href: '', icon: UserCog, children: [
      { id: 'employees', label: 'Employees', href: `/org/${slug}/employees`, icon: Users, featureKey: 'hr' },
      { id: 'departments', label: 'Departments', href: `/org/${slug}/departments`, icon: Building2, featureKey: 'hr' },
      { id: 'attendance', label: 'Attendance', href: `/org/${slug}/attendance`, icon: Clock, featureKey: 'attendance' },
      { id: 'payroll', label: 'Payroll', href: `/org/${slug}/payroll`, icon: Banknote, featureKey: 'hr' },
      { id: 'leave', label: 'Leave Management', href: `/org/${slug}/leave`, icon: Calendar, featureKey: 'leave' },
      { id: 'job_groups', label: 'Job Groups', href: `/org/${slug}/job-groups`, icon: GraduationCap, featureKey: 'hr' },
      { id: 'performance', label: 'Performance Reviews', href: `/org/${slug}/performance-reviews`, icon: TrendingUp, featureKey: 'hr' },
    ]},
    { id: 'support_group', label: 'Support', href: '', icon: Headphones, children: [
      { id: 'tickets', label: 'Tickets', href: `/org/${slug}/tickets`, icon: HelpCircle, featureKey: 'tickets' },
      { id: 'canned_responses', label: 'Canned Responses', href: `/org/${slug}/canned-responses`, icon: MessageSquare, featureKey: 'tickets' },
      { id: 'knowledge_base', label: 'Knowledgebase', href: `/org/${slug}/knowledge-base`, icon: Book, featureKey: 'tickets' },
    ]},
    { id: 'tools_group', label: 'Tools', href: '', icon: BarChart3, children: [
      { id: 'reports', label: 'Reports', href: `/org/${slug}/reports`, icon: BarChart3, featureKey: 'reports' },
      { id: 'communications', label: 'Communications', href: `/org/${slug}/communications`, icon: MessageSquare, featureKey: 'communications' },
      { id: 'staff_chat', label: 'Staff Chat', href: `/org/${slug}/staff-chat`, icon: MessagesSquare, featureKey: 'communications' },
      { id: 'documents', label: 'Documents', href: `/org/${slug}/documents`, icon: FileText },
      { id: 'timesheets', label: 'Time Sheets', href: `/org/${slug}/timesheets`, icon: Clock },
      { id: 'ai_hub', label: 'AI Hub', href: `/org/${slug}/ai`, icon: Sparkles, featureKey: 'ai_hub' },
    ]},
    { id: 'admin_group', label: 'Admin', href: '', icon: Shield, adminOnly: true, children: [
      { id: 'team_users', label: 'Team Users', href: `/org/users`, icon: Users2, adminOnly: true },
      { id: 'staff', label: 'Staff Management', href: `/org/${slug}/staff`, icon: Users2, adminOnly: true },
      { id: 'billing', label: 'Billing & Payments', href: `/org/${slug}/billing`, icon: CreditCard, adminOnly: true },
      { id: 'settings', label: 'Org Settings', href: `/org/${slug}/settings`, icon: Settings, adminOnly: true },
    ]},
  ];
}

// ── Critical Broadcast Messages Banner ──────────────────────
function CriticalMessagesBanner() {
  const { data: criticalMessages } = trpc.tenantCommunications.getCriticalMessages.useQuery(undefined, { retry: false, refetchInterval: 60000 });
  const markAsRead = trpc.tenantCommunications.markAsRead.useMutation();
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const utils = trpc.useUtils();

  if (!criticalMessages?.length) return null;
  const visible = criticalMessages.filter((m: any) => !dismissed.has(m.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-1 px-3 sm:px-4 md:px-6 pt-2">
      {visible.map((msg: any) => (
        <div key={msg.id} className={cn(
          "flex items-start gap-3 p-3 rounded-lg border text-sm",
          msg.priority === 'urgent'
            ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800"
            : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
        )}>
          <Bell className={cn("h-4 w-4 mt-0.5 shrink-0", msg.priority === 'urgent' ? "text-red-600" : "text-amber-600")} />
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium", msg.priority === 'urgent' ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200")}>{msg.subject}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.message}</p>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => {
              setDismissed(prev => new Set(prev).add(msg.id));
              markAsRead.mutate(msg.id, { onSuccess: () => utils.tenantCommunications.getUnreadCount.invalidate() });
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

interface OrgLayoutProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showOrgInfo?: boolean;
}

export function OrgLayout({ title, description, children, className }: OrgLayoutProps) {
  const params = useParams();
  const slug = params.slug as string;
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try { const v = localStorage.getItem('orgSidebarPinned'); return v !== null ? JSON.parse(v) : true; } catch { return true; }
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);

  // Timer state
  const TIMER_STORAGE_KEY = 'org_timer_state';
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerProject, setTimerProject] = useState('');
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);

  // Favorites & Reminders
  const [favFilter, setFavFilter] = useState('All');
  const [reminderTab, setReminderTab] = useState<'due' | 'pending'>('due');
  const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem('app_language') || 'English');

  const { data: favoritesData } = trpc.favorites.list.useQuery(undefined, { staleTime: 30000 });
  const { data: remindersDueData } = trpc.reminders.list.useQuery({ status: 'due' } as any, { staleTime: 30000 });
  const { data: remindersPendingData } = trpc.reminders.list.useQuery({ status: 'pending' } as any, { staleTime: 30000 });

  // Popout submenu state for collapsed sidebar
  const sidebarRef = useRef<HTMLDivElement>(null);
  const popoutTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popoutItem, setPopoutItem] = useState<string | null>(null);
  const [popoutY, setPopoutY] = useState(0);

  const openPopout = useCallback((id: string, y: number) => {
    if (popoutTimeout.current) { clearTimeout(popoutTimeout.current); popoutTimeout.current = null; }
    setPopoutY(y);
    setPopoutItem(id);
  }, []);

  const scheduleClosePopout = useCallback(() => {
    if (popoutTimeout.current) clearTimeout(popoutTimeout.current);
    popoutTimeout.current = setTimeout(() => setPopoutItem(null), 200);
  }, []);

  const cancelClosePopout = useCallback(() => {
    if (popoutTimeout.current) { clearTimeout(popoutTimeout.current); popoutTimeout.current = null; }
  }, []);

  const sidebarExpanded = sidebarPinned || sidebarHovered;

  const { data: myOrgData } = trpc.multiTenancy.getMyOrg.useQuery(undefined, {
    enabled: !!user?.organizationId,
  });

  const org = myOrgData?.organization;
  const featureMap = myOrgData?.featureMap ?? {};
  const isAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (myOrgData && org && slug && org.slug !== slug && user?.role !== 'super_admin') {
      navigate(`/org/${org.slug}/dashboard`);
    }
  }, [myOrgData, org, slug, user?.role]);

  useSettingsSync();

  // Maintenance mode enforcement
  const { maintenanceMode, isRestrictedByMaintenance } = useMaintenanceModeEnforcement();

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(prev => !prev); }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Persist sidebar pinned state
  useEffect(() => { localStorage.setItem('orgSidebarPinned', JSON.stringify(sidebarPinned)); }, [sidebarPinned]);

  // Timer: load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        setTimerSeconds(s.seconds || 0);
        setTimerProject(s.project || '');
        if (s.running && s.startedAt) {
          const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
          setTimerSeconds((s.seconds || 0) + elapsed);
          setTimerRunning(true);
          setTimerStartedAt(s.startedAt);
        }
      }
    } catch {}
  }, []);

  // Timer: save to localStorage
  useEffect(() => {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
      seconds: timerSeconds, project: timerProject, running: timerRunning, startedAt: timerStartedAt,
    }));
  }, [timerSeconds, timerProject, timerRunning, timerStartedAt]);

  // Timer: tick interval
  useEffect(() => {
    if (!timerRunning) return;
    const iv = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [timerRunning]);

  const formatTimer = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  const languages = ['English', 'French', 'Spanish', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian', 'Swahili'];

  // Close popout when sidebar expands
  useEffect(() => { if (sidebarExpanded) setPopoutItem(null); }, [sidebarExpanded]);

  // Close popout on outside click
  useEffect(() => {
    if (!popoutItem) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const popoutEl = document.getElementById('org-sidebar-popout');
      if (sidebarRef.current && !sidebarRef.current.contains(target) && (!popoutEl || !popoutEl.contains(target))) {
        setPopoutItem(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoutItem]);

  const navItems = buildOrgNav(slug || '');

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isActiveHref = (href?: string) => {
    if (!href) return false;
    return location === href || location.startsWith(href + '/');
  };

  const isItemLocked = (item: NavItem) => !!(item.featureKey && featureMap[item.featureKey] === false);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Filter nav items based on admin status
  const getVisibleNav = (items: NavItem[]): NavItem[] => {
    return items.filter(item => !(item.adminOnly && !isAdmin)).map(item => {
      if (item.children) return { ...item, children: getVisibleNav(item.children) };
      return item;
    });
  };

  const visibleNav = getVisibleNav(navItems);

  // ── renderNavItem ────────────────────────────────────────────────────

  const renderNavItem = (item: NavItem, level = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActiveHref(item.href) || (item.children?.some(c => isActiveHref(c.href)) ?? false);
    const locked = isItemLocked(item);
    const isCollapsed = !sidebarExpanded && !mobileSidebarOpen;

    // Collapsed: icon-only with popout
    if (isCollapsed && level === 0) {
      const isPopoutOpen = popoutItem === item.id;
      const iconBtn = (
        <button
          onMouseEnter={(e) => {
            if (hasChildren) { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); openPopout(item.id, rect.top); }
            else { setPopoutItem(null); cancelClosePopout(); }
          }}
          onMouseLeave={() => { if (hasChildren) scheduleClosePopout(); }}
          onClick={() => { if (!hasChildren && item.href && !locked) { navigate(item.href); setPopoutItem(null); } }}
          className={cn(
            "w-full flex items-center justify-center p-2.5 rounded-lg transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            (isItemActive || isPopoutOpen) && "bg-primary text-primary-foreground",
            locked && "opacity-50 cursor-not-allowed",
            "text-slate-600 dark:text-slate-300"
          )}
        >
          {Icon && <Icon className="h-5 w-5" />}
        </button>
      );
      if (popoutItem) return <div key={item.id}>{iconBtn}</div>;
      return (
        <TooltipProvider key={item.id} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{iconBtn}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p>{item.label}{locked ? ' (Upgrade)' : ''}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Expanded: group with expandable children
    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isItemActive && "bg-accent text-accent-foreground font-medium",
              level > 0 && "pl-8",
              "text-slate-900 dark:text-slate-100"
            )}
          >
            <div className="flex items-center gap-3">
              {Icon && <Icon className="h-4 w-4" />}
              <span className="whitespace-nowrap">{item.label}</span>
            </div>
            {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
          </button>
          {isExpanded && item.children!.length > 0 && (
            <div className="mt-1 space-y-0.5">{item.children!.map(child => renderNavItem(child, level + 1))}</div>
          )}
        </div>
      );
    }

    // Leaf item – locked
    if (locked) {
      return (
        <div key={item.id} title={`${item.label} — upgrade your plan to unlock`}
          className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm mb-0.5 cursor-not-allowed opacity-60', level > 0 && "pl-8", 'text-muted-foreground')}>
          <Icon className="h-4 w-4 shrink-0" />
          {item.label}
          <Crown className="ml-auto h-3 w-3 text-amber-400" />
        </div>
      );
    }

    // Leaf item – active
    return (
      <button key={item.id}
        onClick={() => { if (item.href) navigate(item.href); setMobileSidebarOpen(false); }}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActiveHref(item.href) && "bg-primary text-primary-foreground font-medium",
          level > 0 && "pl-8", "text-slate-900 dark:text-slate-100"
        )}>
        <Icon className="h-4 w-4" />
        <span className="whitespace-nowrap">{item.label}</span>
        {item.adminOnly && <Shield className="ml-auto h-3 w-3 text-blue-400/60" />}
      </button>
    );
  };

  // ── Sidebar content (shared between mobile & desktop when expanded) ──

  const OrgHeader = ({ expanded }: { expanded: boolean }) => (
    <div className={cn("flex h-14 items-center border-b px-3 flex-shrink-0", !expanded && "justify-center")}>
      <button onClick={() => navigate(`/org/${slug}/dashboard`)} className={cn("flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0", !expanded && "justify-center w-full")} title={org?.name || 'Dashboard'}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
          {org?.logoUrl ? <img src={org.logoUrl} alt={org.name} className="h-8 w-8 rounded-lg object-cover" /> : <Building2 className="h-4 w-4 text-white" />}
        </div>
        {expanded && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{org?.name || 'My Organization'}</p>
            <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] px-1 py-0">{org?.plan || 'starter'}</Badge>
          </div>
        )}
      </button>
      {expanded && (
        <button onClick={() => setSidebarPinned(!sidebarPinned)} className="ml-auto p-1 rounded hover:bg-accent transition-colors flex-shrink-0 hidden lg:flex" title={sidebarPinned ? "Collapse sidebar" : "Pin sidebar"}>
          {sidebarPinned ? <X className="h-4 w-4 text-muted-foreground" /> : <Menu className="h-4 w-4 text-muted-foreground" />}
        </button>
      )}
    </div>
  );

  const UserFooter = ({ expanded }: { expanded: boolean }) => (
    <div className="border-t p-2 flex-shrink-0">
      {expanded ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors min-w-0">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={(user as any)?.photoUrl || undefined} />
                <AvatarFallback className="text-xs">{getInitials(user?.name || undefined)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-sm">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")} className="text-sm"><User className="mr-2 h-4 w-4" /><span>Profile Settings</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/security")} className="text-sm"><Lock className="mr-2 h-4 w-4" /><span>Password & Security</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} className="text-sm"><Settings className="mr-2 h-4 w-4" /><span>Account Settings</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/security")} className="text-sm"><KeyRound className="mr-2 h-4 w-4" /><span>Two-Factor Auth</span></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme} className="text-sm">
              {theme === "dark" ? <><Sun className="mr-2 h-4 w-4" /><span>Light Mode</span></> : <><Moon className="mr-2 h-4 w-4" /><span>Dark Mode</span></>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-red-600 text-sm"><LogOut className="mr-2 h-4 w-4" /><span>Sign Out</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => navigate("/profile")} className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={(user as any)?.photoUrl || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(user?.name || undefined)}</AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}><p>{user?.name || "User"}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  // ── Maintenance Mode: block non-super_admin/ict_manager users ────────
  if (isRestrictedByMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <>
    <div className="min-h-screen bg-background">
      {/* Mobile hamburger */}
      <Button variant="outline" size="icon"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className={cn(
          "fixed top-3 z-[60] transition-all duration-300 shadow-lg h-9 w-9 sm:h-10 sm:w-10 p-1.5 sm:p-2 lg:hidden",
          "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700",
          mobileSidebarOpen ? "left-[calc(16rem+0.75rem)]" : "left-3 sm:left-4"
        )}
        aria-label={mobileSidebarOpen ? "Close sidebar" : "Open sidebar"}>
        {mobileSidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileSidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen transition-all duration-300 border-r overflow-hidden lg:hidden w-64",
        mobileSidebarOpen ? "translate-x-0 shadow-lg" : "-translate-x-full",
        "bg-white dark:bg-gradient-to-b dark:from-blue-900 dark:to-blue-950 dark:border-blue-800"
      )}>
        <div className="flex h-full flex-col">
          <OrgHeader expanded={true} />
          <ScrollArea className="flex-1 px-2 py-3">
            <nav className="space-y-0.5">{visibleNav.map(item => <div key={item.id}>{renderNavItem(item)}</div>)}</nav>
          </ScrollArea>
          <UserFooter expanded={true} />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside ref={sidebarRef}
        onMouseEnter={() => !sidebarPinned && setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={cn(
          "fixed left-0 top-0 z-50 h-screen transition-all duration-300 border-r overflow-hidden hidden lg:block",
          sidebarExpanded ? "w-[250px] shadow-lg" : "w-[70px]",
          "bg-white dark:bg-gradient-to-b dark:from-blue-900 dark:to-blue-950 dark:border-blue-800"
        )}>
        <div className="flex h-full flex-col">
          <OrgHeader expanded={sidebarExpanded} />
          <ScrollArea className={cn("flex-1 py-3", sidebarExpanded ? "px-2" : "px-1.5")}>
            <nav className={cn("space-y-0.5", !sidebarExpanded && "flex flex-col items-center")}>
              {visibleNav.map(item => <div key={item.id} className="w-full">{renderNavItem(item)}</div>)}
            </nav>
          </ScrollArea>
          <UserFooter expanded={sidebarExpanded} />
        </div>
      </aside>

      {/* Popout submenu for collapsed sidebar */}
      {!sidebarExpanded && popoutItem && (() => {
        const activeItem = visibleNav.find(i => i.id === popoutItem);
        if (!activeItem?.children) return null;
        const ch = activeItem.children;
        const maxTop = typeof window !== 'undefined' ? window.innerHeight - (ch.length * 40 + 60) : 400;
        return (
          <div id="org-sidebar-popout"
            className="fixed left-[70px] z-[200] bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-r-lg shadow-xl py-1 min-w-[200px] hidden lg:block"
            style={{ top: Math.max(56, Math.min(popoutY, maxTop)) }}
            onMouseEnter={cancelClosePopout} onMouseLeave={scheduleClosePopout}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b dark:border-slate-700">
              {activeItem.icon && <activeItem.icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
              <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">{activeItem.label}</span>
            </div>
            <div className="py-1">
              {ch.map(child => {
                const ChildIcon = child.icon;
                const isChildActive = isActiveHref(child.href);
                const locked = isItemLocked(child);
                return (
                  <button key={child.id}
                    onClick={() => { if (!locked && child.href) { navigate(child.href); setPopoutItem(null); } }}
                    className={cn("w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 hover:bg-accent transition-colors",
                      isChildActive && "bg-primary/10 text-primary font-medium", locked && "opacity-50 cursor-not-allowed")}>
                    {ChildIcon && <ChildIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                    {child.label}
                    {locked && <Crown className="ml-auto h-3 w-3 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Main Content */}
      <div className={cn("transition-all duration-300 flex flex-col min-h-screen", "ml-0 lg:ml-[70px]", sidebarExpanded && "lg:ml-[250px]")}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-12 sm:h-14 items-center gap-1 sm:gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 sm:px-4 md:px-6 flex-shrink-0">
          {/* Mobile spacer */}
          <div className="w-9 sm:w-10 lg:hidden" />

          {/* Desktop sidebar toggle */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hidden lg:inline-flex"
                  onClick={() => setSidebarPinned(prev => !prev)}>
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{sidebarPinned ? 'Collapse sidebar' : 'Expand sidebar'}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Home */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => navigate(`/org/${slug}/dashboard`)}>
                  <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Dashboard</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Search bar */}
          <form className="relative hidden sm:flex items-center ml-1" onSubmit={(e) => { e.preventDefault(); if (headerSearchQuery.trim()) { setCmdOpen(true); setHeaderSearchQuery(""); } }}>
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Search" value={headerSearchQuery} onChange={e => setHeaderSearchQuery(e.target.value)} onFocus={() => setCmdOpen(true)}
              className="h-8 w-40 md:w-52 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </form>

          <div className="flex-1" />

          {/* Header icons */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-0.5 sm:gap-1">

              {/* Favorites */}
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Favorites</p></TooltipContent>
                </Tooltip>
                <SheetContent side="right" className="w-80 sm:w-96">
                  <SheetHeader><SheetTitle>Favorites</SheetTitle></SheetHeader>
                  <div className="flex flex-wrap gap-1 mt-4 mb-3">
                    {['All', 'Clients', 'Projects', 'Invoices', 'Estimates', 'Employees', 'Suppliers'].map(f => (
                      <Button key={f} size="sm" variant={favFilter === f ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setFavFilter(f)}>{f}</Button>
                    ))}
                  </div>
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="space-y-1">
                      {(Array.isArray(favoritesData) ? favoritesData : [])
                        .filter((fav: any) => favFilter === 'All' || fav.entityType?.toLowerCase() === favFilter.toLowerCase().replace(/s$/, ''))
                        .map((fav: any) => (
                          <button key={fav.id} onClick={() => fav.entityUrl && navigate(fav.entityUrl)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span className="truncate">{fav.entityName || fav.entityType}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">{fav.entityType}</Badge>
                          </button>
                        ))}
                      {(!favoritesData || (Array.isArray(favoritesData) && favoritesData.length === 0)) && (
                        <p className="text-sm text-muted-foreground text-center py-8">No favorites yet</p>
                      )}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* Timer / Stopwatch */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8 sm:h-9 sm:w-9", timerRunning ? "text-green-500" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100")}>
                        <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Timer {timerRunning ? formatTimer(timerSeconds) : ''}</p></TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <div className="text-center mb-3">
                    <p className="text-3xl font-mono font-bold">{formatTimer(timerSeconds)}</p>
                    {timerProject && <p className="text-xs text-muted-foreground mt-1">{timerProject}</p>}
                  </div>
                  <input type="text" placeholder="Project / Task name" value={timerProject} onChange={e => setTimerProject(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-ring" />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" variant={timerRunning ? 'destructive' : 'default'}
                      onClick={() => { if (!timerRunning) { setTimerRunning(true); setTimerStartedAt(Date.now()); } else { setTimerRunning(false); setTimerStartedAt(null); } }}>
                      {timerRunning ? <><Square className="h-3 w-3 mr-1" />Stop</> : <><Play className="h-3 w-3 mr-1" />Start</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setTimerRunning(false); setTimerSeconds(0); setTimerStartedAt(null); setTimerProject(''); }}>
                      Reset
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Reminders */}
              <Sheet>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 relative">
                        <AlarmClock className="h-4 w-4 sm:h-5 sm:w-5" />
                        {(Array.isArray(remindersDueData) && remindersDueData.length > 0) && (
                          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{remindersDueData.length}</span>
                        )}
                      </Button>
                    </SheetTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Reminders</p></TooltipContent>
                </Tooltip>
                <SheetContent side="right" className="w-80 sm:w-96">
                  <SheetHeader><SheetTitle>Reminders</SheetTitle></SheetHeader>
                  <div className="flex gap-2 mt-4 mb-3">
                    <Button size="sm" variant={reminderTab === 'due' ? 'default' : 'outline'} onClick={() => setReminderTab('due')}>
                      Due {Array.isArray(remindersDueData) && remindersDueData.length > 0 && `(${remindersDueData.length})`}
                    </Button>
                    <Button size="sm" variant={reminderTab === 'pending' ? 'default' : 'outline'} onClick={() => setReminderTab('pending')}>
                      Pending {Array.isArray(remindersPendingData) && remindersPendingData.length > 0 && `(${remindersPendingData.length})`}
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="space-y-1">
                      {(reminderTab === 'due' ? (Array.isArray(remindersDueData) ? remindersDueData : []) : (Array.isArray(remindersPendingData) ? remindersPendingData : [])).map((r: any) => (
                        <button key={r.id} onClick={() => r.entityUrl && navigate(r.entityUrl)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm">
                          <div className="flex items-center gap-2">
                            <AlarmClock className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                            <span className="truncate font-medium">{r.title || r.description || 'Reminder'}</span>
                          </div>
                          {r.dueDate && <p className="text-xs text-muted-foreground ml-5 mt-0.5">{new Date(r.dueDate).toLocaleDateString()}</p>}
                        </button>
                      ))}
                      {(reminderTab === 'due' ? !remindersDueData || (Array.isArray(remindersDueData) && remindersDueData.length === 0) : !remindersPendingData || (Array.isArray(remindersPendingData) && remindersPendingData.length === 0)) && (
                        <p className="text-sm text-muted-foreground text-center py-8">No {reminderTab} reminders</p>
                      )}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <NotificationBell />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => navigate(`/org/${slug}/calendar`)}>
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Calendar</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => navigate(`/org/${slug}/communications`)}>
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Communications</p></TooltipContent>
              </Tooltip>

              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => navigate(`/org/${slug}/settings`)}>
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Organization Settings</p></TooltipContent>
                </Tooltip>
              )}

              {/* Language */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                        <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Language</p></TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-44 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">Language</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {languages.map(lang => (
                    <DropdownMenuItem key={lang} onClick={() => handleLanguageChange(lang)} className="text-sm flex items-center justify-between">
                      <span>{lang}</span>
                      {selectedLanguage === lang && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Quick Create */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Quick Create</p></TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase">Create New</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {featureMap.crm !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/crm`)} className="text-sm"><Users className="mr-2 h-4 w-4" /><span>Client</span></DropdownMenuItem>}
                  {featureMap.projects !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/projects`)} className="text-sm"><Briefcase className="mr-2 h-4 w-4" /><span>Project</span></DropdownMenuItem>}
                  {featureMap.projects !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/tasks`)} className="text-sm"><CheckSquare className="mr-2 h-4 w-4" /><span>Task</span></DropdownMenuItem>}
                  {featureMap.crm !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/leads`)} className="text-sm"><Phone className="mr-2 h-4 w-4" /><span>Lead</span></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  {featureMap.invoicing !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/invoices`)} className="text-sm"><FileText className="mr-2 h-4 w-4" /><span>Invoice</span></DropdownMenuItem>}
                  {featureMap.invoicing !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/estimates`)} className="text-sm"><FileSpreadsheet className="mr-2 h-4 w-4" /><span>Estimate</span></DropdownMenuItem>}
                  {featureMap.invoicing !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/proposals`)} className="text-sm"><Pencil className="mr-2 h-4 w-4" /><span>Proposal</span></DropdownMenuItem>}
                  {featureMap.payments !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/payments`)} className="text-sm"><CreditCard className="mr-2 h-4 w-4" /><span>Payment</span></DropdownMenuItem>}
                  {featureMap.invoicing !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/subscriptions`)} className="text-sm"><Layers className="mr-2 h-4 w-4" /><span>Subscription</span></DropdownMenuItem>}
                  {featureMap.expenses !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/expenses`)} className="text-sm"><Receipt className="mr-2 h-4 w-4" /><span>Expense</span></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  {featureMap.contracts !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/contracts`)} className="text-sm"><FileCheck className="mr-2 h-4 w-4" /><span>Contract</span></DropdownMenuItem>}
                  {featureMap.tickets !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/tickets`)} className="text-sm"><Ticket className="mr-2 h-4 w-4" /><span>Ticket</span></DropdownMenuItem>}
                  {featureMap.tickets !== false && <DropdownMenuItem onClick={() => navigate(`/org/${slug}/knowledge-base`)} className="text-sm"><Book className="mr-2 h-4 w-4" /><span>Article</span></DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 sm:h-9 rounded-full p-0 pl-1 pr-2 gap-2 hover:bg-accent">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={(user as any)?.photoUrl || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(user?.name || undefined)}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200">{user?.name?.split(" ")[0] || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} className="text-sm"><ImageIcon className="mr-2 h-4 w-4" /><span>Update Avatar</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile")} className="text-sm"><User className="mr-2 h-4 w-4" /><span>Update Profile</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/org/${slug}/timesheets`)} className="text-sm"><Clock className="mr-2 h-4 w-4" /><span>Time Sheets</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/org/${slug}/notes`)} className="text-sm"><StickyNote className="mr-2 h-4 w-4" /><span>Notes</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="text-sm"><Bell className="mr-2 h-4 w-4" /><span>Notification Settings</span></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme} className="text-sm">
                {theme === "dark" ? <><Sun className="mr-2 h-4 w-4" /><span>Light Mode</span></> : <><Moon className="mr-2 h-4 w-4" /><span>Dark Mode</span></>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/security")} className="text-sm"><KeyRound className="mr-2 h-4 w-4" /><span>Update Password</span></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-red-600 dark:text-red-400 text-sm"><LogOut className="mr-2 h-4 w-4" /><span>Sign Out</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <CriticalMessagesBanner />
        <main className={cn("flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto", className)}>
          {children}
        </main>

        {/* Nexus360 Copyright Footer */}
        <footer className="border-t bg-muted/30 py-3 px-4 text-center flex-shrink-0">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Nexus360. All rights reserved.</p>
        </footer>
      </div>
    </div>

    {/* Command Palette */}
    {cmdOpen && (
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCmdOpen(false)} />
        <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input autoFocus type="text" placeholder="Search pages, clients, actions..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">ESC</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Navigation</p>
            {visibleNav.map(item => {
              if (item.children) {
                return item.children.map(child => {
                  const Icon = child.icon;
                  const locked = isItemLocked(child);
                  return (
                    <button key={child.id}
                      className={cn("w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer text-left", locked && "opacity-50 cursor-not-allowed")}
                      onClick={() => { if (!locked && child.href) { navigate(child.href); setCmdOpen(false); } }}>
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" /><span>{child.label}</span>
                      {locked && <Crown className="ml-auto h-3 w-3 text-amber-400" />}
                    </button>
                  );
                });
              }
              const Icon = item.icon;
              return (
                <button key={item.id} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer text-left"
                  onClick={() => { if (item.href) { navigate(item.href); setCmdOpen(false); } }}>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" /><span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {/* Floating AI Chat */}
    <FloatingAIChat />
    <FloatingChatNotifications />
    <AccessibilityWidget />
    </>
  );
}

export default OrgLayout;
